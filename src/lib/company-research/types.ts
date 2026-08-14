export type ResearchSourceKind = "official" | "ir" | "recruit" | "review" | "news" | "other";

export type ResearchSource = {
  id: string;
  kind: ResearchSourceKind;
  title: string;
  url: string;
  fetchedAt: string;
  excerpt: string;
  reliability: "high" | "medium" | "low";
};

export type ResearchCitation = {
  sourceId: string;
  label: string;
};

export type ResearchChunk = {
  id: string;
  sourceId: string;
  title: string;
  text: string;
};

export type ResearchSubsection = {
  id: string;
  title: string;
  content: string[];
  citations: ResearchCitation[];
};

export type ResearchSection = {
  id: string;
  title: string;
  summary?: string;
  subsections: ResearchSubsection[];
};

export type CompanyResearchReport = {
  companyName: string;
  generatedAt: string;
  estimatedPages: number;
  estimatedFigures: number;
  sections: ResearchSection[];
  sources: ResearchSource[];
  sourceChunks?: ResearchChunk[];
  suggestedQuestions: string[];
};

export type CompanyResearchChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: ResearchCitation[];
  createdAt: string;
};

export type CompanyResearchResult = {
  companyName: string;
  industry: string;
  location: string;
  size: string;
  summary: string;
  keyPoints: string[];
  interviewHints: string[];
  nextActions: string[];
  report: CompanyResearchReport;
  chatMessages: CompanyResearchChatMessage[];
};
