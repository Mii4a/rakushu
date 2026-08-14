import type { CompanyResearchChatMessage, CompanyResearchReport } from "@/lib/company-research/types";
import { generateJsonWithGpt } from "@/lib/company-research/llm-client";

type ChatAnswerPayload = {
  content: string;
  citations?: CompanyResearchChatMessage["citations"];
};

function buildChatPrompt({
  question,
  report,
  previousMessages
}: {
  question: string;
  report: CompanyResearchReport;
  previousMessages: CompanyResearchChatMessage[];
}) {
  const sections = report.sections
    .map((section) =>
      `${section.title}\n${section.subsections.map((sub) => `${sub.title}: ${sub.content.join("\n")}`).join("\n")}`
    )
    .join("\n\n");
  const sources = report.sources.map((source, index) => `[${index + 1}] ${source.title} ${source.url}\n${source.excerpt}`).join("\n");
  const history = previousMessages.slice(-8).map((message) => `${message.role}: ${message.content}`).join("\n");

  return `保存済み企業研究レポートを根拠に、ユーザーの追加質問へ日本語で回答してください。

質問: ${question}

直近会話:
${history || "なし"}

レポート本文:
${sections}

参照ソース:
${sources}

回答は質問に合わせて箇条書きを使って構いません。根拠がある場合は [1] のような参照番号を末尾に含めてください。レポート内の公開情報から確認できない場合は、その旨を明記してください。

JSONのみで返してください: { "content": string, "citations": [{ "sourceId": string, "label": string }] }`;
}

export async function generateCompanyResearchChatAnswer({
  question,
  report,
  previousMessages,
  now
}: {
  question: string;
  report: CompanyResearchReport;
  previousMessages: CompanyResearchChatMessage[];
  now: Date;
}): Promise<CompanyResearchChatMessage> {
  const payload = await generateJsonWithGpt<ChatAnswerPayload>({
    system:
      "あなたは就職活動向けの企業研究チャットAIです。保存済みレポートと参照ソースに基づき、質問へ具体的に答えてください。回答できないことは断定しないでください。JSONのみを返してください。",
    user: buildChatPrompt({ question, report, previousMessages }),
    temperature: 0.2
  });

  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: payload.content || "レポート内の公開情報からは確認できません。",
    citations: payload.citations,
    createdAt: now.toISOString()
  };
}
