import { FileText } from "lucide-react";

import type { CompanyResearchReport } from "@/lib/company-research/types";

export function ResearchReportPreviewCard({ report, onOpen }: { report: CompanyResearchReport; onOpen: () => void }) {
  const previewSections = report.sections.slice(0, 3);
  return (
    <article className="research-report-preview-card">
      <div className="research-report-preview-header">
        <div className="research-report-preview-icon"><FileText className="size-5" /></div>
        <div>
          <p className="research-report-preview-kicker">総合企業調査レポート</p>
          <h2>{report.companyName} 企業分析レポート</h2>
        </div>
      </div>
      <div className="research-report-preview-body">
        {previewSections.map((section) => (
          <section key={section.id}>
            <h3>{section.title}</h3>
            {section.subsections.slice(0, 2).map((subsection) => (
              <div key={subsection.id}>
                <h4>{subsection.title}</h4>
                {subsection.content.slice(0, 2).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            ))}
          </section>
        ))}
        <div className="research-report-preview-fade" aria-hidden="true" />
      </div>
      <footer className="research-report-preview-footer">
        <span>約{report.estimatedPages || 24}ページ</span>
        <span>最新情報を反映</span>
        <button type="button" onClick={onOpen}>レポートを開く</button>
      </footer>
    </article>
  );
}
