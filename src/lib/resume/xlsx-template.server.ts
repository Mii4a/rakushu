import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import type { ResumeWorkbookData, ResumeWorkbookRow } from "./xlsx";

type ZipEntry = {
  name: string;
  data: Uint8Array;
};

const encoder = new TextEncoder();

const TEMPLATE_PATH_CANDIDATES = [
  path.join(process.cwd(), "UI-mock", "resume", "resume_template.xlsx"),
  path.join(process.cwd(), "UI_samples", "resume", "resume_template.xlsx"),
] as const;

function resolveTemplatePath() {
  const matchedPath = TEMPLATE_PATH_CANDIDATES.find((candidate) => fs.existsSync(candidate));
  if (matchedPath) {
    return matchedPath;
  }

  throw new Error(
    `Resume template workbook not found. Checked: ${TEMPLATE_PATH_CANDIDATES.join(", ")}`,
  );
}

function uint16(value: number) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function uint32(value: number) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
  return bytes;
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let current = i;
    for (let bit = 0; bit < 8; bit += 1) {
      current = (current & 1) === 1 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
    }
    table[i] = current >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = ((year - 1980) << 9) | (month << 5) | day;
  return { dosDate, dosTime };
}

function parseZipEntries(buffer: Buffer) {
  const endSignature = 0x06054b50;
  let endOffset = -1;
  for (let cursor = buffer.length - 22; cursor >= 0; cursor -= 1) {
    if (buffer.readUInt32LE(cursor) === endSignature) {
      endOffset = cursor;
      break;
    }
  }

  if (endOffset < 0) {
    throw new Error("Invalid xlsx template: missing end of central directory.");
  }

  const centralDirectorySize = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  const entries: ZipEntry[] = [];
  let cursor = centralDirectoryOffset;
  const centralDirectoryEnd = centralDirectoryOffset + centralDirectorySize;

  while (cursor < centralDirectoryEnd) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Invalid xlsx template: bad central directory record.");
    }

    const compressionMethod = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraFieldLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const fileName = buffer.subarray(cursor + 46, cursor + 46 + fileNameLength).toString("utf8");

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error("Invalid xlsx template: bad local file header.");
    }

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const compressedStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedEnd = compressedStart + compressedSize;
    const compressedData = buffer.subarray(compressedStart, compressedEnd);

    const data =
      compressionMethod === 0
        ? new Uint8Array(compressedData)
        : compressionMethod === 8
          ? new Uint8Array(zlib.inflateRawSync(compressedData))
          : (() => {
              throw new Error(`Unsupported xlsx compression method: ${compressionMethod}`);
            })();

    entries.push({ name: fileName, data });
    cursor += 46 + fileNameLength + extraFieldLength + commentLength;
  }

  return entries;
}

function buildStoredZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const fileName = encoder.encode(entry.name);
    const fileData = entry.data;
    const checksum = crc32(fileData);
    const { dosDate, dosTime } = getDosDateTime(new Date());

    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(fileData.length),
      uint32(fileData.length),
      uint16(fileName.length),
      uint16(0),
      fileName,
    ]);

    localParts.push(localHeader, fileData);

    const centralHeader = concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(dosTime),
      uint16(dosDate),
      uint32(checksum),
      uint32(fileData.length),
      uint32(fileData.length),
      uint16(fileName.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      fileName,
    ]);

    centralParts.push(centralHeader);
    offset += localHeader.length + fileData.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const localDirectory = concatBytes(localParts);
  const endOfCentralDirectory = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(entries.length),
    uint16(entries.length),
    uint32(centralDirectory.length),
    uint32(localDirectory.length),
    uint16(0),
  ]);

  return concatBytes([localDirectory, centralDirectory, endOfCentralDirectory]);
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTemplateDate(value: string) {
  const match = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(value);
  if (!match) {
    return `${value}現在`;
  }
  return `${match[1]}年　　 ${match[2]}月　 　${match[3]}日現在`;
}

function joinYearMonthDetail(row?: readonly [string?, string?, string?]) {
  return [row?.[0]?.trim() ?? "", row?.[1]?.trim() ?? "", row?.[2]?.trim() ?? ""].filter(Boolean).join(" ");
}

function splitYearMonthDetail(row?: readonly [string?, string?, string?]) {
  const normalizeYear = (value?: string) => value?.trim().replace(/年$/, "") ?? "";
  const normalizeMonth = (value?: string) => value?.trim().replace(/月$/, "") ?? "";
  return {
    year: normalizeYear(row?.[0]),
    month: normalizeMonth(row?.[1]),
    detail: row?.[2]?.trim() ?? "",
  };
}

function buildBirthAndAgeText(data: ResumeWorkbookData) {
  const match = /(\d{4})年(\d{1,2})月(\d{1,2})日/.exec(data.birthDate);
  if (!match) {
    return data.ageText ? `${data.birthDate} ${data.ageText}`.trim() : data.birthDate || "";
  }
  return `${match[1]}年　${Number(match[2])}月　${Number(match[3])}日生　${data.ageText || "（満　歳）"}`;
}

function toAddressKana(address: string) {
  return address.replace(/\s+/g, "").replace(/\n/g, "");
}

function formatPostalCode(postalCode: string) {
  const digits = postalCode.replace(/\D/g, "");
  if (digits.length !== 7) {
    return postalCode ? `（〒　${postalCode}　　）` : "（〒　　　　）";
  }
  return `（〒　${digits.slice(0, 3)}　－ ${digits.slice(3)}　　）`;
}

function formatPostalCodeLine(postalCode: string) {
  const digits = postalCode.replace(/\D/g, "");
  if (digits.length !== 7) {
    return postalCode.trim();
  }
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function buildLicenseSummary(rows: ResumeWorkbookRow[]) {
  return rows
    .map((row) => row[2]?.trim() ?? "")
    .filter(Boolean)
    .join("／");
}

const EDUCATION_CELL_TARGETS = [
  { yearRef: "B26", monthRef: "C26", detailRef: "D26" },
  { yearRef: "B28", monthRef: "C28", detailRef: "D28" },
  { yearRef: "B30", monthRef: "C30", detailRef: "D30" },
  { yearRef: "B32", monthRef: "C32", detailRef: "D32" },
  { yearRef: "B34", monthRef: "C34", detailRef: "D34" },
  { yearRef: "B36", monthRef: "C36", detailRef: "D36" },
  { yearRef: "B38", monthRef: "C38", detailRef: "D38" },
  { yearRef: "B40", monthRef: "C40", detailRef: "D40" },
  { yearRef: "B42", monthRef: "C42", detailRef: "D42" },
  { yearRef: "B44", monthRef: "C44", detailRef: "D44" },
  { yearRef: "B46", monthRef: "C46", detailRef: "D46" },
  { yearRef: "B48", monthRef: "C48", detailRef: "D48" },
  { yearRef: "B50", monthRef: "C50", detailRef: "D50" },
  { yearRef: "B52", monthRef: "C52", detailRef: "D52" },
  { yearRef: "B54", monthRef: "C54", detailRef: "D54" },
  { yearRef: "B56", monthRef: "C56", detailRef: "D56" },
] as const;

const LICENSE_CELL_TARGETS = [
  { yearRef: "K19", monthRef: "L19", detailRef: "M19" },
  { yearRef: "K21", monthRef: "L21", detailRef: "M21" },
  { yearRef: "K23", monthRef: "L23", detailRef: "M23" },
  { yearRef: "K25", monthRef: "L25", detailRef: "M25" },
  { yearRef: "K27", monthRef: "L27", detailRef: "M27" },
  { yearRef: "K29", monthRef: "L29", detailRef: "M29" },
] as const;

function getRowNumberFromCellRef(cellRef: string) {
  const match = /[A-Z]+(\d+)/.exec(cellRef);
  return match?.[1] ?? "";
}

function setInlineCellText(sheetXml: string, cellRef: string, value: string) {
  if (value.length === 0) {
    return sheetXml;
  }

  const escaped = xmlEscape(value);
  const rowNumber = getRowNumberFromCellRef(cellRef);
  const buildCell = (style?: string) =>
    `<c r="${cellRef}"${style ? ` s="${style}"` : ""} t="inlineStr"><is><t xml:space="preserve">${escaped}</t></is></c>`;
  const rowPattern = new RegExp(`(<row\\b[^>]*\\br="${rowNumber}"[^>]*>)([\\s\\S]*?)(</row>)`);

  return sheetXml.replace(rowPattern, (fullRow, rowStart, rowContent, rowEnd) => {
    const selfClosingPattern = new RegExp(`<c((?:(?!/>)[^<>])*\\br="${cellRef}"(?:(?!/>)[^<>])*)\\/>`);
    const fullCellPattern = new RegExp(`<c((?:(?!>)[^<>])*\\br="${cellRef}"(?:(?!>)[^<>])*)>[\\s\\S]*?<\\/c>`);
    const matchedCell = rowContent.match(selfClosingPattern)?.[0] ?? rowContent.match(fullCellPattern)?.[0];
    if (!matchedCell) {
      return fullRow;
    }

    const styleMatch = matchedCell.match(/ s="(\d+)"/);
    const nextRowContent = rowContent.match(selfClosingPattern)
      ? rowContent.replace(selfClosingPattern, buildCell(styleMatch?.[1]))
      : rowContent.replace(fullCellPattern, buildCell(styleMatch?.[1]));
    return `${rowStart}${nextRowContent}${rowEnd}`;
  });
}

function buildEducationBlockRows(rows: ResumeWorkbookRow[]) {
  return EDUCATION_CELL_TARGETS.map((target, index) => ({
    ...target,
    year: rows[index]?.[0]?.trim() ?? "",
    month: rows[index]?.[1]?.trim() ?? "",
    detail: rows[index]?.[2]?.trim() ?? "",
  }));
}

function buildLicenseBlockRows(rows: ResumeWorkbookRow[]) {
  return LICENSE_CELL_TARGETS.map((target, index) => ({
    ...target,
    year: rows[index]?.[0]?.trim() ?? "",
    month: rows[index]?.[1]?.trim() ?? "",
    detail: rows[index]?.[2]?.trim() ?? "",
  }));
}

function buildDesiredSummary(data: ResumeWorkbookData) {
  const chunks = [data.motivation, data.selfPr]
    .map((value) => value.trim())
    .filter(Boolean);
  return chunks.join("\n\n");
}

export function buildResumeWorkbookFromTemplate(data: ResumeWorkbookData) {
  const templateBuffer = fs.readFileSync(resolveTemplatePath());
  const entries = parseZipEntries(templateBuffer).map((entry) => {
    if (entry.name === "xl/worksheets/sheet1.xml") {
      let sheetXml = Buffer.from(entry.data).toString("utf8");
      const currentPostalCode = formatPostalCodeLine(data.postalCode);
      const currentAddressBody = data.currentAddress.trim();
      const contactAddressBody = data.contactAddress.trim();

      sheetXml = setInlineCellText(sheetXml, "F2", formatTemplateDate(data.asOfDate));
      sheetXml = setInlineCellText(sheetXml, "C4", data.furigana || "");
      sheetXml = setInlineCellText(sheetXml, "C6", data.fullName || "");
      sheetXml = setInlineCellText(sheetXml, "B9", buildBirthAndAgeText(data));
      sheetXml = setInlineCellText(sheetXml, "F10", data.gender || "");
      sheetXml = setInlineCellText(sheetXml, "D13", currentPostalCode);
      sheetXml = setInlineCellText(sheetXml, "B15", currentAddressBody);
      sheetXml = setInlineCellText(sheetXml, "H11", `電話　${(data.phone || "").replace(/\D/g, "")}`);
      sheetXml = setInlineCellText(sheetXml, "H15", data.email || "");
      sheetXml = setInlineCellText(sheetXml, "C20", contactAddressBody);
      sheetXml = setInlineCellText(sheetXml, "I17", (data.phone || "").replace(/\D/g, ""));
      sheetXml = setInlineCellText(sheetXml, "I19", data.email || "");
      sheetXml = setInlineCellText(sheetXml, "K34", buildDesiredSummary(data));
      sheetXml = setInlineCellText(sheetXml, "K48", data.desiredConditions.trim() || "貴社の規定に従います。");

      for (const row of buildEducationBlockRows(data.educationRows)) {
        sheetXml = setInlineCellText(sheetXml, row.yearRef, row.year);
        sheetXml = setInlineCellText(sheetXml, row.monthRef, row.month);
        sheetXml = setInlineCellText(sheetXml, row.detailRef, row.detail);
      }

      for (const row of buildLicenseBlockRows(data.licenseRows)) {
        sheetXml = setInlineCellText(sheetXml, row.yearRef, row.year);
        sheetXml = setInlineCellText(sheetXml, row.monthRef, row.month);
        sheetXml = setInlineCellText(sheetXml, row.detailRef, row.detail);
      }

      return { ...entry, data: encoder.encode(sheetXml) };
    }

    return entry;
  });

  return buildStoredZip(entries);
}
