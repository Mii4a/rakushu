import type { CompanyResearchChatMessage } from "@/lib/company-research/types";

export function ResearchChatMessage({ message }: { message: CompanyResearchChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "research-chat-message-user" : "research-chat-message-assistant"}>
      <div className="research-chat-message-label">{isUser ? "あなた" : "らくしゅうAI"}</div>
      <div className="research-chat-message-bubble">
        {message.content.split("\n").map((line, index) => (
          <p key={`${message.id}-${index}`}>{line || "\u00a0"}</p>
        ))}
        {message.citations && message.citations.length > 0 ? (
          <div className="research-chat-citations">
            {message.citations.map((citation) => (
              <span key={`${message.id}-${citation.sourceId}-${citation.label}`}>{citation.label}</span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
