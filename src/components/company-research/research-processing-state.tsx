import { Building2, Search, Sparkles } from "lucide-react";

const processingSteps = [
  "企業URLを確認中",
  "企業HP・採用情報・IR・口コミを調査中",
  "情報を整理中",
  "企業分析レポートを作成中"
];

export function ResearchProcessingState({ query }: { query: string }) {
  return (
    <div className="company-research-processing-state" role="status" aria-live="polite">
      <div className="company-research-processing-orb" aria-hidden="true">
        <span className="company-research-processing-pulse" />
        <Building2 className="relative size-11" />
      </div>
      <div className="company-research-processing-copy">
        <p className="company-research-processing-kicker"><Sparkles className="size-4" /> GPT調査を実行中</p>
        <h1>企業分析レポートを作成しています</h1>
        <p>
          入力された企業URLを起点に、企業HP・採用情報・IR・ニュース・口コミなどの公開情報をGPTが参照し、総合企業調査レポートとして整理しています。
        </p>
        <div className="company-research-processing-url"><Search className="size-4" /> {query}</div>
      </div>
      <div className="company-research-processing-steps">
        {processingSteps.map((step, index) => (
          <div key={step} className="company-research-processing-step">
            <span className={index === 0 ? "company-research-processing-step-dot-active" : "company-research-processing-step-dot"} />
            <span>{step}</span>
          </div>
        ))}
      </div>
      <p className="company-research-processing-note">生成が完了すると、レポートのプレビューと追加質問チャットに切り替わります。</p>
    </div>
  );
}
