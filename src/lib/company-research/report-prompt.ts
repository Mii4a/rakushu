import type { CompanyResearchRequest } from "@/lib/company-research/research-request";

export const companyResearchReportSystemPrompt = `あなたは就職活動向けの企業研究AIです。公開情報を材料に、短い要約ではなく、広範囲な総合企業調査レポートを日本語で作成します。出力は必ずJSONのみです。箇条書き中心にせず、大見出し、小見出し、2〜4文の長文解説を中心にしてください。情報が不足する箇所は推測で断定せず、公開情報から追加確認が必要と明記してください。参照・引用したサイト、ページ、文献、ニュース、口コミ媒体は必ず sources に列挙し、レポート末尾の「引用サイト・文献」セクションで読者が確認できる形にしてください。URLが取得できない文献・媒体も省略せず、URL未取得として明示してください。`;

export function buildCompanyResearchReportUserPrompt(request: CompanyResearchRequest) {
  return `企業公式サイトURL: ${request.websiteUrl}

このURLを起点に、GPT/API側で企業HP・採用情報・IR・ニュース・口コミ等の公開情報を参照し、総合企業調査レポートを作成してください。
アプリ側で独自クロールは行わないため、あなたが参照可能な公開情報を材料にしてください。

引用ルール:
- 参照・引用したサイト、ページ、文献、ニュース、口コミ媒体は必ず sources に列挙してください。
- 各 sources は title と url を可能な限り実URLで示してください。URLを確認できない場合も空配列にせず、url は "URL未取得"、title は媒体名・文献名を入れてください。
- 各小項目の citations には、根拠にした sources の id と [1] のような label を入れてください。
- report.sections の末尾に必ず title が "引用サイト・文献" のセクションを含め、sources の一覧を読者向けに表示してください。
- 推測で作った架空URLや架空文献は入れず、未確認なら未確認・URL未取得と明記してください。

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
    "generatedAt": string,
    "estimatedPages": number,
    "estimatedFigures": number,
    "sections": [{ "id": string, "title": string, "subsections": [{ "id": string, "title": string, "content": string[], "citations": [{ "sourceId": string, "label": string }] }] }],
    "sources": [{ "id": string, "kind": "official" | "ir" | "recruit" | "review" | "news" | "other", "title": string, "url": string, "fetchedAt": string, "excerpt": string, "reliability": "high" | "medium" | "low" }],
    "sourceChunks": [{ "id": string, "sourceId": string, "title": string, "text": string }],
    "suggestedQuestions": ["事業内容と主要なビジネスモデルについて教えてください", "競合他社と比較した強みや差別化要因は何ですか？", "今後の成長戦略や注力している分野について説明してください", "直近の業績動向と今後の見通しはどうなっていますか？"]
  },
  "chatMessages": []
}`;
}
