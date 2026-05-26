import type { ParsedJob, Rank } from "./types";

export const MISSING_ITEM_KEYS = [
  "companyName",
  "employmentType",
  "salaryText",
  "annualHolidays",
  "bonusCount",
  "retirementAllowance",
  "benefits",
  "fixedOvertimeHours",
  "holidayType"
] as const;

export type MissingItemKey = (typeof MISSING_ITEM_KEYS)[number];

type MissingFieldConfig = {
  label: string;
  visibilityPattern?: RegExp;
  visibilityLinesOnly?: boolean;
  visibilityNoisePattern?: RegExp;
  critical?: boolean;
};

export type MissingItemSummary = {
  missingInRawText: MissingItemKey[];
  ambiguousButVisible: MissingItemKey[];
  thinInput: boolean;
  thinInputReason: string[];
};

const FIELD_CONFIG: Record<MissingItemKey, MissingFieldConfig> = {
  companyName: {
    label: "会社名",
    visibilityPattern: /(株式会社|有限会社|合同会社|学校法人|社会福祉法人|一般社団法人|弁護士法人)/,
    critical: true
  },
  employmentType: {
    label: "雇用形態",
    visibilityPattern: /(雇用形態|正社員|契約社員|派遣社員|紹介予定派遣|業務委託|アルバイト・パート|アルバイト|パート|インターン)/,
    visibilityLinesOnly: true,
    visibilityNoisePattern: /(インタビュー|会社の注目のストーリー|採用担当|もっと見る|他の募集|話を聞きに行くステップ|応募する|応援する)/,
    critical: true
  },
  salaryText: {
    label: "給与",
    visibilityPattern: /((?:給与|想定年収|年収|月給|月収|報酬)[:：]?|[0-9０-９].*(?:円|万円))/,
    visibilityLinesOnly: true,
    visibilityNoisePattern: /(応募要件|選考プロセス|ご覧いただくには|話を聞きに行く|応募する|気になる|もっと見る|平均年収UP|年収UP実績|還元率|売上[0-9０-９]|取扱高[0-9０-９])/
      ,
    critical: true
  },
  annualHolidays: {
    label: "年間休日",
    visibilityPattern: /(年間休日|休日・休暇|休日休暇|完全週休|週休2日|土日祝休み|休暇制度|フルフレックス)/,
    critical: true
  },
  bonusCount: {
    label: "賞与制度",
    visibilityPattern: /(賞与|ボーナス|年\s*[0-9０-９]\s*回)/
  },
  retirementAllowance: {
    label: "退職金制度",
    visibilityPattern: /(退職金|退職金制度)/
  },
  benefits: {
    label: "福利厚生",
    visibilityPattern: /(福利厚生|待遇・福利厚生|副業|在宅|リモート|フレックス|服装自由|ネイル|私服勤務可|住宅手当|交通費|社宅|産休|育休|書籍購入補助|社会保険)/
  },
  fixedOvertimeHours: {
    label: "固定残業",
    visibilityPattern: /(固定残業|みなし残業|残業代)/
  },
  holidayType: {
    label: "休日制度",
    visibilityPattern: /(完全週休2日制|週休2日制|土日祝休み|休日・休暇|休日休暇)/
  }
};

function hasVisibleSignal(rawText: string, config: MissingFieldConfig) {
  if (!config.visibilityPattern) return false;

  if (!config.visibilityLinesOnly) {
    return config.visibilityPattern.test(rawText);
  }

  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .some((line) => config.visibilityPattern?.test(line) && !(config.visibilityNoisePattern?.test(line) ?? false));
}

function isMissingCandidate(parsed: ParsedJob, key: MissingItemKey) {
  switch (key) {
    case "benefits":
      return (parsed.benefits.value?.length ?? 0) === 0;
    case "fixedOvertimeHours":
      return parsed.fixedOvertimeHours.status === "unknown" && parsed.fixedOvertimeHours.value == null;
    case "holidayType":
      return parsed.holidayType.status === "unknown" && parsed.holidayType.value == null;
    case "bonusCount":
      return parsed.bonusCount.status === "unknown" && parsed.bonusCount.value == null;
    case "retirementAllowance":
      return parsed.retirementAllowance.status === "unknown" && parsed.retirementAllowance.value == null;
    case "companyName":
      return parsed.companyName.status === "unknown" && parsed.companyName.value == null;
    case "employmentType":
      return parsed.employmentType.status === "unknown" && parsed.employmentType.value == null;
    case "salaryText":
      return parsed.salaryText.status === "unknown" && parsed.salaryText.value == null;
    case "annualHolidays":
      return parsed.annualHolidays.status === "unknown" && parsed.annualHolidays.value == null;
    default:
      return false;
  }
}

export function getMissingItemLabel(key: MissingItemKey) {
  return FIELD_CONFIG[key].label;
}

export function buildMissingItemSummary(parsed: ParsedJob, rawText?: string | null): MissingItemSummary {
  if (!rawText) {
    return {
      missingInRawText: [],
      ambiguousButVisible: [],
      thinInput: false,
      thinInputReason: []
    };
  }

  const normalizedRawText = rawText.replace(/\r\n?/g, "\n");
  const missingInRawText: MissingItemKey[] = [];
  const ambiguousButVisible: MissingItemKey[] = [];

  for (const key of MISSING_ITEM_KEYS) {
    if (!isMissingCandidate(parsed, key)) continue;

    const visible = hasVisibleSignal(normalizedRawText, FIELD_CONFIG[key]);
    if (visible) {
      ambiguousButVisible.push(key);
    } else {
      missingInRawText.push(key);
    }
  }

  const missingCritical = missingInRawText.filter((key) => FIELD_CONFIG[key].critical);
  const missingSecondary = missingInRawText.filter((key) => !FIELD_CONFIG[key].critical);
  const thinInput = missingCritical.length >= 1 || missingSecondary.length >= 3;
  const thinInputReason = missingCritical.length >= 1
    ? missingCritical.map((key) => `${FIELD_CONFIG[key].label}が本文未記載です。`)
    : missingSecondary.length >= 3
      ? ["比較に必要な周辺情報が全体的に薄めです。"]
      : [];

  return {
    missingInRawText,
    ambiguousButVisible,
    thinInput,
    thinInputReason
  };
}

export function getUserFacingRank(rank: Rank, options: { missingInRawText: boolean }): Rank {
  if (rank !== "UNKNOWN") return rank;
  return options.missingInRawText ? "E" : "UNKNOWN";
}
