"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, X } from "lucide-react";

import type { CompanyResearchReport } from "@/lib/company-research/types";
import { ResearchReportTableOfContents } from "@/components/company-research/research-report-table-of-contents";

export function ResearchReportModal({ report, open, onClose }: { report: CompanyResearchReport; open: boolean; onClose: () => void }) {
  const [activeId, setActiveId] = useState<string | null>(report.sections[0]?.id ?? null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const scrollToSection = (id: string) => {
    setActiveId(id);
    contentRef.current?.querySelector(`[data-section-id="${id}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const sourceLabelById = new Map(report.sources.map((source, index) => [source.id, `[${index + 1}]`]));

  return (
    <div className="research-report-modal-overlay" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${report.companyName} 企業分析レポート`} className="research-report-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="research-report-modal-header">
          <div className="research-report-modal-title">
            <span><FileText className="size-5" /></span>
            <div>
              <p>生成日時 {new Date(report.generatedAt).toLocaleString("ja-JP")}</p>
              <h2>{report.companyName} 企業分析レポート</h2>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="レポートを閉じる"><X className="size-5" /></button>
        </header>
        <div className="research-report-modal-grid">
          <ResearchReportTableOfContents sections={report.sections} activeId={activeId} onSelect={scrollToSection} />
          <div ref={contentRef} className="research-report-modal-content" onScroll={(event) => {
            const containerTop = event.currentTarget.getBoundingClientRect().top;
            const current = report.sections.find((section) => {
              const element = event.currentTarget.querySelector(`[data-section-id="${section.id}"]`);
              if (!element) return false;
              return element.getBoundingClientRect().top - containerTop > -20;
            });
            if (current) setActiveId(current.id);
          }}>
            {report.sections.map((section) => (
              <section key={section.id} data-section-id={section.id} className="research-report-modal-section">
                <h3>{section.title}</h3>
                {section.subsections.map((subsection) => (
                  <div key={subsection.id}>
                    <h4>{subsection.title}</h4>
                    {subsection.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                    {subsection.citations.length > 0 ? (
                      <div className="research-report-modal-citations" aria-label={`${subsection.title} の引用`}>
                        {subsection.citations.map((citation) => (
                          <span key={`${subsection.id}-${citation.sourceId}-${citation.label}`}>
                            {citation.label || sourceLabelById.get(citation.sourceId) || citation.sourceId}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </section>
            ))}
          </div>
        </div>
        <footer className="research-report-modal-footer">本レポートは公開情報をもとにAIが作成した参考情報です。最新情報は必ず公式サイト等でご確認ください。</footer>
      </div>
    </div>
  );
}
