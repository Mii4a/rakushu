import { buildMockCompanyResearchReport, type CompanyResearchResult } from "@/lib/company-research/mock-data";

type CompanyProfile = {
  companyName: string;
  industry: string;
  location: string;
  size: string;
  focus: string;
  interviewTopic: string;
  actionTopic: string;
};

const PROFILE_BY_KEYWORD: CompanyProfile[] = [
  {
    companyName: "トヨタ自動車株式会社",
    industry: "自動車・モビリティ",
    location: "愛知県豊田市",
    size: "連結 37万人規模",
    focus: "電動化とソフトウェア化が進む転換期の大企業",
    interviewTopic: "製造業の改善力と変化対応をどう結びつけるか",
    actionTopic: "競合比較"
  },
  {
    companyName: "株式会社メルカリ",
    industry: "フリマアプリ・Fintech",
    location: "東京都港区",
    size: "グループ 2,000人規模",
    focus: "CtoC マーケットプレイスと決済圏を広げるプロダクト企業",
    interviewTopic: "ユーザー課題とプロダクト改善をどう結びつけるか",
    actionTopic: "プロダクト理解"
  },
  {
    companyName: "楽天グループ株式会社",
    industry: "インターネットサービス",
    location: "東京都世田谷区",
    size: "グループ 3万人規模",
    focus: "複数サービスを横断して経済圏を広げる事業構造",
    interviewTopic: "複数事業の中でどこに惹かれるか",
    actionTopic: "事業理解"
  },
  {
    companyName: "東日本旅客鉄道株式会社",
    industry: "鉄道・インフラ",
    location: "東京都渋谷区",
    size: "単体 5万人規模",
    focus: "社会インフラの安定運営と沿線価値づくりの両立",
    interviewTopic: "安定運営と改善の両方にどう関わりたいか",
    actionTopic: "現場理解"
  }
];

function tryParseHostname(query: string) {
  try {
    const url = new URL(query);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function titleizeFallbackName(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "")
    .replace(/\.[a-z]{2,}$/i, "")
    .split(/[\-.\s_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "気になる企業";
}

function resolveCompanyProfile(query: string): CompanyProfile {
  const normalized = `${query} ${tryParseHostname(query) ?? ""}`.toLowerCase();

  if (normalized.includes("toyota")) return PROFILE_BY_KEYWORD[0]!;
  if (normalized.includes("mercari")) return PROFILE_BY_KEYWORD[1]!;
  if (normalized.includes("rakuten")) return PROFILE_BY_KEYWORD[2]!;
  if (normalized.includes("jreast") || normalized.includes("jr-east") || normalized.includes("eastjapanrailway")) {
    return PROFILE_BY_KEYWORD[3]!;
  }

  const fallbackName = titleizeFallbackName(query);
  return {
    companyName: fallbackName,
    industry: "総合事業・要調査",
    location: "所在地は追加確認",
    size: "規模は追加確認",
    focus: `${fallbackName} の事業構造と成長余地を見極める必要がある`,
    interviewTopic: `${fallbackName} を選ぶ理由を自分の経験とつなげる`,
    actionTopic: "公開情報の深掘り"
  };
}

export function buildCompanyResearchResultFromQuery(query: string): CompanyResearchResult {
  const profile = resolveCompanyProfile(query);

  const report = buildMockCompanyResearchReport(profile.companyName, new Date().toISOString());

  return {
    companyName: profile.companyName,
    industry: profile.industry,
    location: profile.location,
    size: profile.size,
    summary: `${profile.companyName} は ${profile.focus} 企業です。まずは事業の柱と、応募職種がその中でどこに接続するかを整理すると理解しやすくなります。`,
    keyPoints: [
      `${profile.companyName} を見るときは、事業理解より先に「自分がどの変化に惹かれるか」を言語化すると志望動機が作りやすい`,
      `${profile.industry} の中で ${profile.companyName} がどんな立ち位置かを比較すると、会社選びの理由が具体化しやすい`,
      `面接では ${profile.interviewTopic} を自分の経験で支えられるかが重要になる`
    ],
    interviewHints: [
      `なぜ数ある ${profile.industry} 企業の中でも ${profile.companyName} なのか`,
      `${profile.companyName} のどの事業・職種に自分の関心が向いているか`,
      `${profile.interviewTopic} を示せる経験は何か`
    ],
    nextActions: [
      `${profile.companyName} の志望動機を3行で下書きする`,
      `${profile.actionTopic} の観点で競合または類似企業を1社比較する`,
      `AI面接で「なぜ ${profile.companyName} か」を練習する`
    ],
    report,
    chatMessages: [
      {
        id: `assistant-${profile.companyName}`,
        role: "assistant",
        content: `${profile.companyName}について、公開情報をもとに調査を行い、レポートを作成しました。\n以下のレポートをご確認ください。`,
        createdAt: report.generatedAt
      }
    ]
  };
}
