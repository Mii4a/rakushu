import type { CompanyResearchReport, CompanyResearchResult } from "@/lib/company-research/types";

export type { CompanyResearchResult } from "@/lib/company-research/types";

export type CompanyResearchRecentItem = {
  id: string;
  companyName: string;
  researchedAt: string;
  status: string;
};

export const COMPANY_RESEARCH_RECENT_ITEMS: CompanyResearchRecentItem[] = [
  {
    id: "toyota",
    companyName: "トヨタ自動車株式会社",
    researchedAt: "2024/05/09",
    status: "要点整理済み"
  },
  {
    id: "jr-east",
    companyName: "東日本旅客鉄道株式会社",
    researchedAt: "2024/05/02",
    status: "面接論点メモあり"
  },
  {
    id: "rakuten",
    companyName: "楽天グループ株式会社",
    researchedAt: "2024/04/28",
    status: "比較候補"
  }
];

export function buildMockCompanyResearchReport(companyName: string, generatedAt = "2026-07-20T00:00:00.000Z"): CompanyResearchReport {
  const source = {
    id: "source-1",
    kind: "official" as const,
    title: `${companyName} 公式情報`,
    url: "https://example.com/",
    fetchedAt: generatedAt,
    excerpt: `${companyName} の公式サイト、採用情報、IR、口コミ等の公開情報をもとにした抜粋です。`,
    reliability: "medium" as const
  };

  const sectionData = [
    ["executive-summary", "エグゼクティブサマリー", "企業の位置付け", `${companyName} は、公開情報を総合すると、安定した事業基盤と今後の変化対応力を併せ持つ企業です。レポートでは企業の基本情報から人事制度、財務状況、従業員評価に至るまで、就職活動で深掘りしやすい観点を広く整理します。`],
    ["basic-background", "企業の基本情報と設立背景", "企業名および法的地位", `${companyName} については、企業名、法人格、上場情報、設立背景を確認することで、事業の歴史と社会的な位置付けを把握できます。創業から現在までの沿革を見ると、現在の主力事業や組織文化がどのように形成されたかを理解しやすくなります。`],
    ["business-model", "事業内容", "事業内容とビジネスモデル", `${companyName} の事業内容は、主要事業、製品・サービス、収益構造を分けて見ると整理しやすくなります。単なる商品理解ではなく、どの顧客にどの価値を届け、どこで収益を得ているかを押さえることが重要です。`],
    ["competition", "業界 / 競争環境", "市場での位置付け", `${companyName} の競争環境を見る際は、同業他社との比較、競争優位性、差別化要因を確認する必要があります。公開情報から読み取れる強みと、今後競争が激しくなりそうな領域を分けて考えると、志望動機に厚みが出ます。`],
    ["people", "組織 / 人材", "組織構造と人事制度", `${companyName} の組織・人材面では、組織構造、人事制度、企業文化、求める人物像を合わせて見ることが重要です。制度の名称だけではなく、どのような働き方や価値観が評価されやすいかを把握すると、面接準備に応用できます。`],
    ["financials", "財務 / 業績", "財務 / 業績の概況", `${companyName} の財務・業績は、売上、利益、事業別業績、直近動向を確認することで、企業の安定性と成長余地を判断できます。数字が十分に公開されていない場合は、公式発表やニュースから補助的に傾向を把握する必要があります。`],
    ["growth", "成長戦略", "経営戦略と重点投資", `${companyName} の成長戦略では、経営戦略、重点投資、新規事業、将来性とリスクを確認します。現在の強みだけでなく、どの領域に資源を投下しているかを見ることで、入社後に関わり得るテーマを見つけやすくなります。`],
    ["employee-review", "従業員評価", "口コミと働き方", `${companyName} の従業員評価では、口コミ、働き方、評価される点、不満点を切り分けて見る必要があります。公開口コミでは一部の声が強調されることもあるため、複数の情報を照合しながら傾向として読む姿勢が大切です。`],
    ["career-usage", "就活への応用", "ES / 志望動機 / 面接対策", `${companyName} への応募準備では、ESで押さえるポイント、志望動機の方向性、面接対策、想定質問をレポート内容から逆算します。企業の事業理解を自分の経験や価値観につなげて語れる状態にすることが、選考対策として重要です。`]
  ];

  return {
    companyName,
    generatedAt,
    estimatedPages: 24,
    estimatedFigures: 18,
    sources: [source],
    sourceChunks: [
      {
        id: "chunk-1",
        sourceId: source.id,
        title: source.title,
        text: source.excerpt
      }
    ],
    suggestedQuestions: [
      "事業内容と主要なビジネスモデルについて教えてください",
      "競合他社と比較した強みや差別化要因は何ですか？",
      "今後の成長戦略や注力している分野について説明してください",
      "直近の業績動向と今後の見通しはどうなっていますか？"
    ],
    sections: sectionData.map(([id, title, subTitle, content]) => ({
      id,
      title,
      subsections: [
        {
          id: `${id}-overview`,
          title: subTitle,
          content: [content],
          citations: [{ sourceId: source.id, label: "[1]" }]
        }
      ]
    }))
  };
}

export const COMPANY_RESEARCH_RESULT: CompanyResearchResult = {
  companyName: "トヨタ自動車株式会社",
  industry: "自動車・モビリティ",
  location: "愛知県豊田市",
  size: "連結 37万人規模",
  summary:
    "世界的な自動車メーカーでありながら、近年はソフトウェア・電動化・モビリティサービスへの移行も強く進めています。安定感だけでなく、事業転換期の大企業としてどこに挑戦余地があるかを見ると理解しやすい会社です。",
  keyPoints: [
    "収益基盤は強いが、面接では“なぜ今この会社か”を業界変化と結びつけて語る必要がある",
    "完成車メーカーの中でも、製造だけでなくソフトウェア・データ活用まで視野を広げている",
    "志望動機では規模の大きさより、どの事業転換に関わりたいかを具体化すると伝わりやすい"
  ],
  interviewHints: [
    "なぜメーカーの中でもトヨタなのか",
    "変化の大きい自動車業界で自分は何を学び、どう貢献したいか",
    "チームで改善を回した経験をどう結びつけるか"
  ],
  nextActions: [
    "志望動機メモを3行で作る",
    "競合2社と比較して違いを1つ言えるようにする",
    "AI面接で“なぜこの会社か”を練習する"
  ],
  report: buildMockCompanyResearchReport("トヨタ自動車株式会社"),
  chatMessages: []
};
