export const companyResearchRequiredSections = [
  "エグゼクティブサマリー",
  "企業基本情報と設立背景",
  "事業内容",
  "業界・競争環境",
  "組織・人材",
  "財務・業績",
  "成長戦略",
  "従業員評価",
  "就活への応用"
] as const;

export const companyResearchRequiredSubtopics = [
  "企業の位置付け", "規模", "直近業績", "特徴", "レポート全体の説明",
  "企業名 / 法人格 / 上場情報", "設立年月", "創業背景", "沿革",
  "主要事業", "製品・サービス", "ビジネスモデル", "収益構造",
  "市場での位置付け", "競合", "競争優位性", "差別化",
  "組織構造", "人事制度", "企業文化 / 社風", "求める人物像",
  "売上", "利益", "事業別業績", "直近動向",
  "経営戦略", "重点投資", "新規事業", "将来性 / リスク",
  "口コミ", "働き方", "評価される点", "不満点",
  "ESで押さえるポイント", "志望動機の方向性", "面接対策", "想定質問"
] as const;

export type CompanyResearchRequest = ReturnType<typeof buildCompanyResearchRequest>;

export function buildCompanyResearchRequest(websiteUrl: string) {
  return {
    websiteUrl,
    model: process.env.COMPANY_RESEARCH_MODEL ?? "gpt-4.1-mini",
    collectionPolicy:
      "企業HP URLを起点に、GPT/API側で企業HP・採用情報・IR・ニュース・口コミ等の公開情報を収集して参照する。アプリ側では独自クロール制限を設けない。",
    collectionScope: "企業HP、採用情報、IR、ニュース、口コミ、働き方、評価される点、不満点",
    requiredSections: [...companyResearchRequiredSections],
    requiredSubtopics: [...companyResearchRequiredSubtopics]
  };
}
