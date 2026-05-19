"use client";

import { Eye, FileDown, Menu, Plus, Save, Trash2, Upload } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { generateResumeDraftAction, type ResumeActionState } from "@/actions/resume-actions";
import { downloadResumeWorkbookXlsx } from "@/lib/resume/xlsx";

type ResumeFormDefaults = {
  templateName?: string | null;
  asOfDate?: string | null;
  fullName?: string | null;
  furigana?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  currentAddress?: string | null;
  contactAddress?: string | null;
  phone?: string | null;
  email?: string | null;
  education?: string | null;
  experience?: string | null;
  licenses?: string | null;
  selfPr?: string | null;
  motivation?: string | null;
  desiredConditions?: string | null;
};

type ResumeRow = {
  id: string;
  year: string;
  month: string;
  detail: string;
};

type PreviewPage = 1 | 2;

type ResumeFormValues = {
  templateName: string;
  asOfDate: string;
  lastName: string;
  firstName: string;
  lastNameKana: string;
  firstNameKana: string;
  gender: string;
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  postalCode: string;
  currentAddress: string;
  contactAddress: string;
  phone: string;
  email: string;
  motivation: string;
  selfPr: string;
  desiredConditions: string;
};

const initialResumeActionState: ResumeActionState = {
  error: null,
  result: null,
};

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function splitName(value?: string | null) {
  const source = (value ?? "").trim();
  const parts = source.split(/[\s\u3000]+/).filter(Boolean);
  if (parts.length >= 2) {
    return { first: parts.slice(1).join(" "), last: parts[0] };
  }
  return { first: "", last: source };
}

function splitBirthDate(value?: string | null) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) {
    return { year: "", month: "", day: "" };
  }
  return {
    year: match[1],
    month: String(Number(match[2])),
    day: String(Number(match[3])),
  };
}

function linesToRows(value?: string | null) {
  const rows = (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const japaneseDateMatch = line.match(/^(.+?)年\s*(.+?)月\s+(.+)$/);
      const tokenMatch = line.match(/^(\S+)\s+(\S+)\s+(.+)$/);
      const year = japaneseDateMatch?.[1]?.trim() ?? tokenMatch?.[1] ?? "";
      const month = japaneseDateMatch?.[2]?.trim() ?? tokenMatch?.[2] ?? "";
      const detail = japaneseDateMatch?.[3] ?? tokenMatch?.[3] ?? line;
      return {
        id: `row-${index + 1}`,
        year,
        month,
        detail,
      };
    });

  return rows.length > 0 ? rows : [{ id: crypto.randomUUID(), year: "", month: "", detail: "" }];
}

function toInitialValues(defaults?: ResumeFormDefaults): ResumeFormValues {
  const fullName = splitName(defaults?.fullName);
  const furigana = splitName(defaults?.furigana);
  const birthDate = splitBirthDate(defaults?.birthDate);

  return {
    templateName: defaults?.templateName?.trim() || "厚労省様式",
    asOfDate: defaults?.asOfDate || todayIsoDate(),
    lastName: fullName.last,
    firstName: fullName.first,
    lastNameKana: furigana.last,
    firstNameKana: furigana.first,
    gender: defaults?.gender || "男",
    birthYear: birthDate.year,
    birthMonth: birthDate.month,
    birthDay: birthDate.day,
    postalCode: "",
    currentAddress: defaults?.currentAddress || "",
    contactAddress: defaults?.contactAddress || "",
    phone: defaults?.phone || "",
    email: defaults?.email || "",
    motivation: defaults?.motivation || "",
    selfPr: defaults?.selfPr || "",
    desiredConditions: defaults?.desiredConditions || "",
  };
}

function formatJapaneseDate(dateText: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText);
  if (!match) {
    return "____年__月__日";
  }
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

function buildBirthDate(values: ResumeFormValues) {
  if (!values.birthYear || !values.birthMonth || !values.birthDay) {
    return "";
  }
  return `${values.birthYear}-${values.birthMonth.padStart(2, "0")}-${values.birthDay.padStart(2, "0")}`;
}

function calculateAge(birthDateText: string, asOfDateText: string) {
  if (!birthDateText) {
    return "";
  }

  const birthDate = new Date(birthDateText);
  const asOfDate = new Date(asOfDateText || todayIsoDate());
  if (Number.isNaN(birthDate.getTime()) || Number.isNaN(asOfDate.getTime())) {
    return "";
  }

  let age = asOfDate.getFullYear() - birthDate.getFullYear();
  const monthDelta = asOfDate.getMonth() - birthDate.getMonth();
  const dayDelta = asOfDate.getDate() - birthDate.getDate();
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age >= 0 ? `（満 ${age} 歳）` : "";
}

function joinName(lastName: string, firstName: string) {
  return [lastName.trim(), firstName.trim()].filter(Boolean).join(" ");
}

function rowsToMultiline(rows: ResumeRow[]) {
  return rows
    .map((row) => [row.year.trim(), row.month.trim(), row.detail.trim()].filter(Boolean).join(" "))
    .filter(Boolean)
    .join("\n");
}

function rowsToWorkbookRows(rows: ResumeRow[]) {
  return rows.map((row) => [row.year.trim(), row.month.trim(), row.detail.trim()] as [string, string, string]);
}

function fillRows(rows: ResumeRow[], count: number) {
  return Array.from({ length: count }, (_, index) => rows[index] ?? { id: `empty-${index}`, year: "", month: "", detail: "" });
}

function formatPostalCodeLine(postalCode: string) {
  const digits = postalCode.replace(/\D/g, "");
  if (digits.length !== 7) {
    return postalCode.trim();
  }
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function inputClassName() {
  return "h-11 rounded-xl border border-emerald-100 bg-white px-3 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
}

function textareaClassName() {
  return "w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm leading-7 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100";
}

function SectionBadge({ index }: { index: number }) {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
      {index}
    </span>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-slate-700">{children}</span>
      {required ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-500">必須</span> : null}
    </div>
  );
}

function MobileTabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-full px-5 py-3 text-sm font-bold transition ${
        active ? "bg-white text-emerald-700 shadow-[0_8px_20px_-16px_rgba(22,163,74,0.6)]" : "text-slate-500"
      }`}
    >
      {children}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-base font-bold text-white shadow-[0_16px_30px_-20px_rgba(5,150,105,0.8)] hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save className="size-5" />
      {pending ? "保存中..." : "下書きを保存"}
    </button>
  );
}

function XlsxButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-8 text-base font-bold text-slate-700 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.3)] hover:border-emerald-300"
    >
      <FileDown className="size-5" />
      ダウンロード
    </button>
  );
}

function PreviewToolbarButton({ icon: Icon, children, onClick }: { icon: typeof Eye; children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.3)] hover:border-emerald-200"
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

function PreviewPageButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-bold transition ${
        active ? "bg-emerald-600 text-white shadow-[0_14px_26px_-20px_rgba(5,150,105,0.85)]" : "border border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}

function ResumeRowsEditor({
  rows,
  onChange,
  addLabel,
}: {
  rows: ResumeRow[];
  onChange: (rows: ResumeRow[]) => void;
  addLabel: string;
}) {
  function updateRow(id: string, key: keyof ResumeRow, value: string) {
    onChange(rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));
  }

  function removeRow(id: string) {
    const nextRows = rows.filter((row) => row.id !== id);
    onChange(nextRows.length > 0 ? nextRows : [{ id: crypto.randomUUID(), year: "", month: "", detail: "" }]);
  }

  function addRow() {
    onChange([...rows, { id: crypto.randomUUID(), year: "", month: "", detail: "" }]);
  }

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_28px_-22px_rgba(15,23,42,0.22)]">
      <div className="mb-3 flex items-center justify-end">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700"
        >
          <Plus className="size-4" />
          {addLabel}
        </button>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid items-center gap-2 md:grid-cols-[120px_84px_minmax(0,1fr)_40px]">
            <input
              value={row.year}
              onChange={(event) => updateRow(row.id, "year", event.target.value)}
              placeholder="2026年"
              className={inputClassName()}
            />
            <input
              value={row.month}
              onChange={(event) => updateRow(row.id, "month", event.target.value)}
              placeholder="3月"
              className={inputClassName()}
            />
            <input
              value={row.detail}
              onChange={(event) => updateRow(row.id, "detail", event.target.value)}
              placeholder="学歴・職歴 / 免許・資格"
              className={inputClassName()}
            />
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResumePreviewPaper({
  values,
  educationRows,
  licenseRows,
  previewPage,
  onChangePreviewPage,
  previewZoom,
  onChangePreviewZoom,
  onDownloadXlsx,
}: {
  values: ResumeFormValues;
  educationRows: ResumeRow[];
  licenseRows: ResumeRow[];
  previewPage: PreviewPage;
  onChangePreviewPage: (page: PreviewPage) => void;
  previewZoom: number;
  onChangePreviewZoom: (zoom: number) => void;
  onDownloadXlsx: () => void;
}) {
  const previewSheetWidth = 920;
  const previewScale = PREVIEW_BASE_SCALE * previewZoom;
  const birthDate = buildBirthDate(values);
  const age = calculateAge(birthDate, values.asOfDate);
  const fullName = joinName(values.lastName, values.firstName) || "氏名未入力";
  const fullNameKana = joinName(values.lastNameKana, values.firstNameKana) || "フリガナ未入力";
  const formattedPostalCode = formatPostalCodeLine(values.postalCode) || "未入力";
  const primaryEducationRows = fillRows(educationRows.slice(0, 12), 12);
  const secondaryEducationRows = fillRows(educationRows.slice(12), 5);
  const previewLicenseRows = fillRows(licenseRows, 6);
  const desiredText = values.desiredConditions || "貴社の規定に従います。";
  const motivationText = [values.motivation, values.selfPr].map((value) => value.trim()).filter(Boolean).join("\n\n") || "未入力";

  function PreviewLinedBox({
    title,
    body,
    minHeight,
    rows,
  }: {
    title: string;
    body: string;
    minHeight: number;
    rows: number;
  }) {
    return (
      <div className="border border-black">
        <div className="px-4 py-3 text-[12px]">{title}</div>
        <div className="border-t border-dotted border-black">
          <div className="relative px-4 py-4" style={{ minHeight }}>
            <div className="pointer-events-none absolute inset-0 top-0">
              {Array.from({ length: rows }).map((_, index) => (
                <div
                  key={`${title}-${index}`}
                  className="border-b border-dotted border-black/70"
                  style={{ height: `${minHeight / rows}px` }}
                />
              ))}
            </div>
            <div className="relative whitespace-pre-wrap text-[12px] leading-8">{body}</div>
          </div>
        </div>
      </div>
    );
  }

  const previewContent =
    previewPage === 1 ? (
      <div className="mx-auto w-[920px] bg-white px-[28px] pb-[28px] pt-[22px] text-black shadow-[0_20px_40px_-32px_rgba(15,23,42,0.22)] print:shadow-none">
        <div className="grid grid-cols-[1fr_220px] items-start gap-8">
          <div>
            <div className="flex items-end justify-between">
              <h3 className="text-[60px] font-semibold tracking-[0.18em] text-black">履 歴 書</h3>
              <div className="pb-2 text-[16px] tracking-[0.08em]">{formatJapaneseDate(values.asOfDate)}現在</div>
            </div>

            <div className="mt-5 border border-black">
              <div className="grid grid-cols-[120px_1fr] border-b border-dotted border-black text-[11px]">
                <div className="px-3 py-3">フリガナ</div>
                <div className="px-4 py-3 tracking-[0.05em]">{fullNameKana}</div>
              </div>
              <div className="grid grid-cols-[120px_1fr] border-b border-black">
                <div className="px-5 py-[28px] text-[18px]">氏　名</div>
                <div className="px-6 py-[26px] text-[21px] tracking-[0.08em]">{fullName}</div>
              </div>
              <div className="grid grid-cols-[1fr_120px]">
                <div className="border-r border-black px-4 py-[14px] text-center text-[14px] tracking-[0.04em]">
                  {values.birthYear || "____"}年　{values.birthMonth || "__"}月　{values.birthDay || "__"}日生　{age || "（満 __ 歳）"}
                </div>
                <div>
                  <div className="border-b border-dotted border-black px-2 py-1 text-[11px]">※性別</div>
                  <div className="flex items-center justify-center py-[16px] text-[18px]">{values.gender || "男"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-[6px]">
            <div className="border border-black">
              <div className="flex h-[268px] flex-col items-center justify-center gap-3 overflow-hidden bg-white px-4 text-center text-[10px] text-slate-500">
                <div>証明写真未設定</div>
                <div className="text-[9px] leading-5 text-slate-700">
                  写真を貼る必要がある場合
                  <br />
                  1. 縦 36〜40mm / 横 24〜30mm
                  <br />
                  2. 本人単身胸から上
                  <br />
                  3. 裏面のりづけ
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[-2px] grid grid-cols-[1fr_250px] border border-black">
          <div className="border-r border-black">
            <div className="grid grid-cols-[120px_1fr] border-b border-dotted border-black text-[11px]">
              <div className="px-3 py-3">フリガナ</div>
              <div className="px-4 py-3 leading-5">{values.currentAddress || "未入力"}</div>
            </div>
            <div className="min-h-[128px] px-4 py-4">
              <div className="text-[11px]">現住所　〒　{formattedPostalCode}</div>
              <div className="mt-5 whitespace-pre-wrap text-[12px] leading-6">{values.currentAddress || "未入力"}</div>
            </div>
            <div className="border-t border-black">
              <div className="grid grid-cols-[120px_1fr] border-b border-dotted border-black text-[11px]">
                <div className="px-3 py-3">フリガナ</div>
                <div className="px-4 py-3 leading-5">{values.contactAddress || ""}</div>
              </div>
              <div className="min-h-[110px] px-4 py-4">
                <div className="flex items-center justify-between text-[11px]">
                  <span>連絡先　〒</span>
                  <span>現住所以外に連絡を希望する場合のみ記入</span>
                </div>
                <div className="mt-5 whitespace-pre-wrap text-[12px] leading-6">{values.contactAddress || ""}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="border-b border-black px-4 py-4 text-[11px]">電話　{values.phone || ""}</div>
            <div className="min-h-[124px] border-b border-dotted border-black px-4 py-4 text-[11px]">
              メール
              <div className="mt-10 text-[12px]">{values.email || ""}</div>
            </div>
            <div className="border-b border-dotted border-black px-4 py-4 text-[11px]">電話</div>
            <div className="min-h-[110px] px-4 py-4 text-[11px]">メール</div>
          </div>
        </div>

        <div className="mt-6 border border-black">
          <div className="grid grid-cols-[96px_58px_1fr] border-b border-black text-center text-[12px]">
            <div className="border-r border-dotted border-black py-3">年</div>
            <div className="border-r border-dotted border-black py-3">月</div>
            <div className="py-3">学歴・職歴（各別にまとめて書く）</div>
          </div>
          {primaryEducationRows.map((row) => (
            <div key={row.id} className="grid grid-cols-[96px_58px_1fr] border-b border-dotted border-black last:border-b-0 text-[12px]">
              <div className="border-r border-dotted border-black px-2 py-[18px] text-center">{row.year}</div>
              <div className="border-r border-dotted border-black px-2 py-[18px] text-center">{row.month}</div>
              <div className="px-3 py-[18px]">{row.detail}</div>
            </div>
          ))}
        </div>

        <div className="mt-3 text-[10px] text-slate-500">※「性別」欄: 記載は任意です。未記載とすることも可能です。</div>
      </div>
    ) : (
      <div className="mx-auto w-[920px] space-y-6 bg-white px-[28px] pb-[28px] pt-[20px] text-black shadow-[0_20px_40px_-32px_rgba(15,23,42,0.22)] print:shadow-none">
        <div className="border border-black">
          <div className="grid grid-cols-[96px_58px_1fr] border-b border-black text-center text-[12px]">
            <div className="border-r border-dotted border-black py-3">年</div>
            <div className="border-r border-dotted border-black py-3">月</div>
            <div className="py-3">学歴・職歴（各別にまとめて書く）</div>
          </div>
          {secondaryEducationRows.map((row) => (
            <div key={row.id} className="grid grid-cols-[96px_58px_1fr] border-b border-dotted border-black last:border-b-0 text-[12px]">
              <div className="border-r border-dotted border-black px-2 py-[18px] text-center">{row.year}</div>
              <div className="border-r border-dotted border-black px-2 py-[18px] text-center">{row.month}</div>
              <div className="px-3 py-[18px]">{row.detail}</div>
            </div>
          ))}
        </div>

        <div className="border border-black">
          <div className="grid grid-cols-[96px_58px_1fr] border-b border-black text-center text-[12px]">
            <div className="border-r border-dotted border-black py-3">年</div>
            <div className="border-r border-dotted border-black py-3">月</div>
            <div className="py-3">免許・資格</div>
          </div>
          {previewLicenseRows.map((row) => (
            <div key={row.id} className="grid grid-cols-[96px_58px_1fr] border-b border-dotted border-black last:border-b-0 text-[12px]">
              <div className="border-r border-dotted border-black px-2 py-[16px] text-center">{row.year}</div>
              <div className="border-r border-dotted border-black px-2 py-[16px] text-center">{row.month}</div>
              <div className="px-3 py-[16px]">{row.detail}</div>
            </div>
          ))}
        </div>

        <PreviewLinedBox title="志望の動機、自己PRなど" body={motivationText} minHeight={360} rows={1} />

        <PreviewLinedBox
          title="本人希望記入欄　（特に給料、職種、勤務時間、勤務地、その他についての希望などがあれば記入）"
          body={desiredText}
          minHeight={220}
          rows={4}
        />
      </div>
    );

  return (
    <div className="rounded-[30px] border border-slate-200 bg-[#f7f8fa] p-4 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.3)] print:rounded-none print:border-0 print:bg-white print:p-0 print:shadow-none">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3 text-emerald-700">
          <Eye className="size-5" />
          <span className="text-lg font-bold">プレビュー</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <button type="button" className="text-slate-400" onClick={() => onChangePreviewZoom(Math.max(0.7, Number((previewZoom - 0.1).toFixed(2))))}>−</button>
            <span>{Math.round(previewZoom * 100)}%</span>
            <button type="button" className="text-slate-400" onClick={() => onChangePreviewZoom(Math.min(1.4, Number((previewZoom + 0.1).toFixed(2))))}>＋</button>
          </div>
          <div className="flex gap-2">
            <PreviewPageButton active={previewPage === 1} onClick={() => onChangePreviewPage(1)}>1ページ目</PreviewPageButton>
            <PreviewPageButton active={previewPage === 2} onClick={() => onChangePreviewPage(2)}>2ページ目</PreviewPageButton>
          </div>
          <PreviewToolbarButton icon={Eye} onClick={() => onChangePreviewZoom(1)}>ページ幅に合わせる</PreviewToolbarButton>
          <PreviewToolbarButton icon={FileDown} onClick={onDownloadXlsx}>ダウンロード</PreviewToolbarButton>
        </div>
      </div>

      <div className="resume-print-surface overflow-hidden rounded-[24px] border border-slate-200 bg-white p-4 print:rounded-none print:border-0 print:p-0">
        <div className="overflow-x-auto overflow-y-hidden rounded-[20px] bg-[#f5f5f3] p-3 print:overflow-visible print:bg-white print:p-0">
          <div className="mx-auto transition-[width] duration-200" style={{ width: `${previewSheetWidth * previewScale}px` }}>
            <div
              className="origin-top-left font-serif transition-transform duration-200 print:scale-100"
              style={{ width: `${previewSheetWidth}px`, transform: `scale(${previewScale})` }}
            >
              {previewContent}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ResumeGeneratorForm({ defaults }: { defaults?: ResumeFormDefaults }) {
  const [state, formAction] = useActionState(generateResumeDraftAction, initialResumeActionState);
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [previewPage, setPreviewPage] = useState<PreviewPage>(1);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [values, setValues] = useState<ResumeFormValues>(() => toInitialValues(defaults));
  const [educationRows, setEducationRows] = useState<ResumeRow[]>(() =>
    linesToRows([defaults?.education, defaults?.experience].filter(Boolean).join("\n")),
  );
  const [licenseRows, setLicenseRows] = useState<ResumeRow[]>(() => linesToRows(defaults?.licenses));

  const fullName = useMemo(() => joinName(values.lastName, values.firstName), [values.firstName, values.lastName]);
  const furigana = useMemo(
    () => joinName(values.lastNameKana, values.firstNameKana),
    [values.firstNameKana, values.lastNameKana],
  );
  const birthDate = useMemo(() => buildBirthDate(values), [values]);
  const age = useMemo(() => calculateAge(birthDate, values.asOfDate), [birthDate, values.asOfDate]);
  const educationText = useMemo(() => rowsToMultiline(educationRows), [educationRows]);
  const licensesText = useMemo(() => rowsToMultiline(licenseRows), [licenseRows]);

  function updateField<K extends keyof ResumeFormValues>(key: K, value: ResumeFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleDownloadXlsx() {
    downloadResumeWorkbookXlsx({
      templateName: values.templateName,
      asOfDate: formatJapaneseDate(values.asOfDate),
      fullName,
      furigana,
      gender: values.gender,
      birthDate: formatJapaneseDate(birthDate) || "未入力",
      ageText: age,
      postalCode: values.postalCode,
      currentAddress: values.currentAddress,
      contactAddress: values.contactAddress,
      phone: values.phone,
      email: values.email,
      educationRows: rowsToWorkbookRows(educationRows),
      licenseRows: rowsToWorkbookRows(licenseRows),
      motivation: values.motivation,
      selfPr: values.selfPr,
      desiredConditions: values.desiredConditions,
    });
  }

  return (
    <div className="resume-print-root space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.25)] print:hidden md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-3 text-emerald-700">
              <div className="rounded-2xl bg-emerald-50 p-3">
                <Eye className="size-7" />
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-[2.4rem]">履歴書作成</h1>
            </div>
            <p className="max-w-3xl text-base leading-7 text-slate-600">
              厚生労働省履歴書様式に対応。入力内容が左のプレビューに反映されます。
            </p>
          </div>
          <button type="button" className="rounded-2xl border border-slate-200 p-3 text-slate-500 md:hidden">
            <Menu className="size-7" />
          </button>
        </div>
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-[#f8fafb] p-3 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.22)] print:hidden md:hidden">
        <div className="flex rounded-full border border-emerald-200 bg-emerald-50/70 p-1">
          <MobileTabButton active={activeTab === "form"} onClick={() => setActiveTab("form")}>
            入力フォーム
          </MobileTabButton>
          <MobileTabButton active={activeTab === "preview"} onClick={() => setActiveTab("preview")}>
            プレビュー
          </MobileTabButton>
        </div>
      </div>

      <form action={formAction} className="resume-print-form grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <input type="hidden" name="templateName" value={values.templateName} readOnly />
        <input type="hidden" name="asOfDate" value={values.asOfDate} readOnly />
        <input type="hidden" name="fullName" value={fullName} readOnly />
        <input type="hidden" name="furigana" value={furigana} readOnly />
        <input type="hidden" name="birthDate" value={birthDate} readOnly />
        <input type="hidden" name="gender" value={values.gender} readOnly />
        <input type="hidden" name="currentAddress" value={values.currentAddress} readOnly />
        <input type="hidden" name="contactAddress" value={values.contactAddress} readOnly />
        <input type="hidden" name="phone" value={values.phone} readOnly />
        <input type="hidden" name="email" value={values.email} readOnly />
        <input type="hidden" name="education" value={educationText} readOnly />
        <input type="hidden" name="experience" value="" readOnly />
        <input type="hidden" name="licenses" value={licensesText} readOnly />
        <input type="hidden" name="motivation" value={values.motivation} readOnly />
        <input type="hidden" name="selfPr" value={values.selfPr} readOnly />
        <input type="hidden" name="desiredConditions" value={values.desiredConditions} readOnly />

        <div className={`resume-preview-column ${activeTab === "preview" ? "hidden md:block" : "block"} print:block`}>
          <ResumePreviewPaper
            values={values}
            educationRows={educationRows}
            licenseRows={licenseRows}
            previewPage={previewPage}
            onChangePreviewPage={setPreviewPage}
            previewZoom={previewZoom}
            onChangePreviewZoom={setPreviewZoom}
            onDownloadXlsx={handleDownloadXlsx}
          />
        </div>

        <div className={`resume-form-column ${activeTab === "form" ? "block" : "hidden md:block"} space-y-5 print:hidden`}>
          <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.25)] md:p-6">
            <div className="mb-5 flex items-center gap-3 text-emerald-700">
              <Save className="size-5" />
              <h2 className="text-2xl font-bold text-slate-900">入力フォーム</h2>
            </div>

            <div className="space-y-4">
              <section className="rounded-[24px] border border-slate-200 bg-[#fafdfb] p-4 md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <SectionBadge index={1} />
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-emerald-700">基本情報</h3>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">必須</span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)] md:items-center">
                  <FieldLabel required>氏名</FieldLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={values.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={inputClassName()} placeholder="山田" />
                    <input value={values.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={inputClassName()} placeholder="太郎" />
                  </div>

                  <FieldLabel required>フリガナ</FieldLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={values.lastNameKana} onChange={(event) => updateField("lastNameKana", event.target.value)} className={inputClassName()} placeholder="ヤマダ" />
                    <input value={values.firstNameKana} onChange={(event) => updateField("firstNameKana", event.target.value)} className={inputClassName()} placeholder="タロウ" />
                  </div>

                  <FieldLabel required>生年月日</FieldLabel>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input value={values.birthYear} onChange={(event) => updateField("birthYear", event.target.value)} className={inputClassName()} placeholder="1998年" />
                    <input value={values.birthMonth} onChange={(event) => updateField("birthMonth", event.target.value)} className={inputClassName()} placeholder="4月" />
                    <input value={values.birthDay} onChange={(event) => updateField("birthDay", event.target.value)} className={inputClassName()} placeholder="12日" />
                  </div>

                  <FieldLabel required>性別</FieldLabel>
                  <div className="flex items-center gap-6">
                    {["男", "女"].map((option) => (
                      <label key={option} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                        <input
                          type="radio"
                          name={`gender-ui-${option}`}
                          checked={values.gender === option}
                          onChange={() => updateField("gender", option)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-[#fafdfb] p-4 md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <SectionBadge index={2} />
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-emerald-700">住所・連絡先</h3>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">必須</span>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_208px]">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)] md:items-center">
                      <FieldLabel>郵便番号</FieldLabel>
                      <div className="flex gap-3">
                        <input value={values.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} className={inputClassName()} placeholder="160-0004" />
                        <button type="button" className="rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700">住所検索</button>
                      </div>

                      <FieldLabel required>現住所</FieldLabel>
                      <input value={values.currentAddress} onChange={(event) => updateField("currentAddress", event.target.value)} className={inputClassName()} placeholder="東京都新宿区四谷1-6-1 コモレ四谷ビル5階" />

                      <FieldLabel>連絡先</FieldLabel>
                      <input value={values.contactAddress} onChange={(event) => updateField("contactAddress", event.target.value)} className={inputClassName()} placeholder="現住所以外への連絡先があれば入力" />

                      <FieldLabel>電話番号</FieldLabel>
                      <input value={values.phone} onChange={(event) => updateField("phone", event.target.value)} className={inputClassName()} placeholder="090-1234-5678" />

                      <FieldLabel required>メールアドレス</FieldLabel>
                      <input value={values.email} onChange={(event) => updateField("email", event.target.value)} className={inputClassName()} placeholder="yamada.taro@example.com" />
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-white p-5 text-center shadow-[0_12px_24px_-20px_rgba(15,23,42,0.2)]">
                    <p className="text-sm font-bold text-slate-700">証明写真をアップロード</p>
                    <div className="mt-4 rounded-[20px] border border-dashed border-emerald-300 bg-emerald-50/40 px-4 py-8">
                      <Upload className="mx-auto size-8 text-emerald-600" />
                      <p className="mt-3 text-base font-bold text-emerald-700">ファイルを選択</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">またはドラッグ&ドロップ</p>
                      <p className="mt-4 text-[11px] text-slate-400">JPG/PNG, 3MB以内</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-[#fafdfb] p-4 md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <SectionBadge index={3} />
                  <h3 className="text-xl font-bold text-emerald-700">学歴・職歴</h3>
                </div>
                <ResumeRowsEditor rows={educationRows} onChange={setEducationRows} addLabel="追加" />
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-[#fafdfb] p-4 md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <SectionBadge index={4} />
                  <h3 className="text-xl font-bold text-emerald-700">免許・資格</h3>
                </div>
                <ResumeRowsEditor rows={licenseRows} onChange={setLicenseRows} addLabel="追加" />
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-[#fafdfb] p-4 md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <SectionBadge index={5} />
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-emerald-700">志望動機</h3>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-500">必須</span>
                  </div>
                </div>
                <textarea
                  value={values.motivation}
                  onChange={(event) => updateField("motivation", event.target.value)}
                  rows={5}
                  className={textareaClassName()}
                  placeholder="志望動機やアピールポイントを入力"
                />
                <div className="mt-2 text-right text-xs text-slate-400">{values.motivation.length} / 4000文字</div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-[#fafdfb] p-4 md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <SectionBadge index={6} />
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-emerald-700">自己PR</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">任意</span>
                  </div>
                </div>
                <textarea
                  value={values.selfPr}
                  onChange={(event) => updateField("selfPr", event.target.value)}
                  rows={5}
                  className={textareaClassName()}
                  placeholder="自己PRや補足したい実績を入力"
                />
                <div className="mt-2 text-right text-xs text-slate-400">{values.selfPr.length} / 4000文字</div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-[#fafdfb] p-4 md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <SectionBadge index={7} />
                  <div>
                    <h3 className="text-xl font-bold text-emerald-700">本人希望記入欄</h3>
                    <p className="mt-1 text-xs text-slate-400">特に給料、職種、勤務時間、勤務地、その他希望などがあれば記入</p>
                  </div>
                </div>
                <textarea
                  value={values.desiredConditions}
                  onChange={(event) => updateField("desiredConditions", event.target.value)}
                  rows={4}
                  className={textareaClassName()}
                  placeholder="貴社の規定に従います。"
                />
                <div className="mt-2 text-right text-xs text-slate-400">{values.desiredConditions.length} / 4000文字</div>
              </section>
            </div>
          </div>

          {state.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {state.error}
            </div>
          ) : null}

          {state.result ? (
            <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/70 p-4 text-sm leading-7 text-slate-700 shadow-[0_12px_24px_-20px_rgba(5,150,105,0.3)]">
              <p className="mb-2 text-sm font-bold text-emerald-700">保存済みの下書き</p>
              <pre className="whitespace-pre-wrap font-sans">{state.result}</pre>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="submit"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-8 text-base font-bold text-emerald-700 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.3)] hover:border-emerald-300"
            >
              <Save className="size-5" />
              下書き保存
            </button>
            <XlsxButton onClick={handleDownloadXlsx} />
          </div>
        </div>
      </form>
    </div>
  );
}
const PREVIEW_BASE_SCALE = 0.65;
