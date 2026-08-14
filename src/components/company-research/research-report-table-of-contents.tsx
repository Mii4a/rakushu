import type { ResearchSection } from "@/lib/company-research/types";

export function ResearchReportTableOfContents({
  sections,
  activeId,
  onSelect
}: {
  sections: ResearchSection[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="research-report-toc" aria-label="企業分析レポート目次">
      <p>目次</p>
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onSelect(section.id)}
          className={section.id === activeId ? "research-report-toc-active" : ""}
        >
          {section.title}
        </button>
      ))}
    </nav>
  );
}
