import type { CompanyResearchRequest } from "@/lib/company-research/research-request";

export const companyResearchReportSystemPrompt = `あなたは就職活動向けの企業研究AIです。公開情報を材料に、広範囲な総合企業調査レポートを日本語で作成します。出力は必ずJSONのみです。参照した情報は、実際に確認できる http(s) URL のみを使ってください。URL未取得、架空URL、架空文献、推測した参照先、未対応の取得手段は使わないでください。確認できない点は断定せず未確認と書いてください。`;

export function buildCompanyResearchReportUserPrompt(request: CompanyResearchRequest) {
  return `企業公式サイトURL: ${request.websiteUrl}

このURLを起点に、GPT/API側で企業HP・採用情報・IR・ニュース・口コミ等の公開情報を参照し、総合企業調査レポートを作成してください。
アプリ側で独自クロールは行わないため、あなたが参照可能な公開情報を材料にしてください。

重要ルール:
- 実在する http(s) URL だけを sources に列挙してください。
- URL未取得、架空URL、架空文献、存在しない参照先を入れないでください。
- 取得できない情報は推測で断定せず、未確認として本文に明記してください。
- 各小項目の citations には、根拠にした sources の id と [1] のような label を入れてください。
- report.sections には、アプリ側で reader 向けの source list を別途組み立てる前提で、実在する sources / citations / fetchedAt / generatedAt を返してください。
- sourceChunks と chatMessages は返却しないでください。
- generatedAt と fetchedAt は返却しないでください。

必須大項目:
${request.requiredSections.map((section) => `- ${section}`).join("\n")}

必須小項目:
${request.requiredSubtopics.map((topic) => `- ${topic}`).join("\n")}

返却JSON shape:
{
  "companyName": string,
  "industry": string,
  "location": string,
  "size": string,
  "summary": string,
  "keyPoints": string[],
  "interviewHints": string[],
  "nextActions": string[],
  "report": {
    "companyName": string,
    "estimatedPages": number,
    "estimatedFigures": number,
    "sections": [{ "id": string, "title": string, "subsections": [{ "id": string, "title": string, "content": string[], "citations": [{ "sourceId": string, "label": string }] }] }],
    "sources": [{ "id": string, "kind": "official" | "ir" | "recruit" | "review" | "news" | "other", "title": string, "url": string, "excerpt": string, "reliability": "high" | "medium" | "low" }],
    "suggestedQuestions": ["事業内容と主要なビジネスモデルについて教えてください", "競合他社と比較した強みや差別化要因は何ですか？", "今後の成長戦略や注力している分野について説明してください", "直近の業績動向と今後の見通しはどうなっていますか？"]
  }
}`;
}
