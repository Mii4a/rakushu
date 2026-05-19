export type ResumeWorkbookRow = [string, string?, string?];

export type ResumeWorkbookData = {
  templateName: string;
  asOfDate: string;
  fullName: string;
  furigana: string;
  gender: string;
  birthDate: string;
  ageText: string;
  postalCode: string;
  currentAddress: string;
  contactAddress: string;
  phone: string;
  email: string;
  educationRows: ResumeWorkbookRow[];
  licenseRows: ResumeWorkbookRow[];
  motivation: string;
  selfPr: string;
  desiredConditions: string;
};

function sanitizeFileNamePart(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, "_");
}

export async function downloadResumeWorkbookXlsx(data: ResumeWorkbookData) {
  const response = await fetch("/api/resume/xlsx", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("履歴書Excelの生成に失敗しました。");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const fileBase = sanitizeFileNamePart(data.fullName || data.templateName || "resume") || "resume";
  anchor.href = url;
  anchor.download = `${fileBase}.xlsx`;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
