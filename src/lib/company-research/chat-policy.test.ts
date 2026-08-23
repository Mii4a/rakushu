import { describe, expect, test } from "vitest";

import { MAX_COMPANY_RESEARCH_CHAT_QUESTIONS, MAX_COMPANY_RESEARCH_QUESTION_LENGTH, countCompanyResearchUserQuestions } from "./chat-limits";
import { parsePersistedCompanyResearchChatMessages } from "./chat-policy";
import type { CompanyResearchChatMessage } from "./types";

function buildMessage(overrides: Partial<CompanyResearchChatMessage> = {}): CompanyResearchChatMessage {
  return {
    id: "message-1",
    role: "assistant",
    content: "assistant reply",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("company research chat policy", () => {
  test("exports exact shared limits", () => {
    expect(MAX_COMPANY_RESEARCH_CHAT_QUESTIONS).toBe(3);
    expect(MAX_COMPANY_RESEARCH_QUESTION_LENGTH).toBe(200);
  });

  test("counts user questions only", () => {
    const messages: CompanyResearchChatMessage[] = [
      buildMessage({ role: "user" }),
      buildMessage({ role: "assistant" }),
      buildMessage({ role: "user" }),
      buildMessage({ role: "user" }),
      buildMessage({ role: "assistant" })
    ];

    expect(countCompanyResearchUserQuestions(messages)).toBe(3);
  });

  test("parses an empty array", () => {
    expect(parsePersistedCompanyResearchChatMessages([])).toEqual([]);
  });

  test.each([null, undefined, 1, "x", { messages: [] }, [{ id: "", role: "user", content: "x", createdAt: "now" }], [{ id: "m", role: "assistant", content: "x", createdAt: "now", citations: null }], [{ id: "m", role: "assistant", content: "x", createdAt: "now", citations: {} }], [{ id: "m", role: "assistant", content: "x", createdAt: "now", citations: Array.from({ length: 21 }, () => ({ sourceId: "s", label: "[1]" })) }]])(
    "malformed input %s returns null",
    (value) => {
      expect(() => parsePersistedCompanyResearchChatMessages(value)).not.toThrow();
      expect(parsePersistedCompanyResearchChatMessages(value)).toBeNull();
    }
  );

  test("drops unknown keys and reconstructs safe objects", () => {
    const input = [{
      id: "message-1",
      role: "user",
      content: " hello ",
      createdAt: "2026-01-01T00:00:00.000Z",
      citations: [{ sourceId: "source-1", label: "[1]", extra: true }],
      extra: "nope"
    }];
    const parsed = parsePersistedCompanyResearchChatMessages(input);

    expect(parsed).toEqual([
      {
        id: "message-1",
        role: "user",
        content: " hello ",
        createdAt: "2026-01-01T00:00:00.000Z",
        citations: [{ sourceId: "source-1", label: "[1]" }]
      }
    ]);
    expect(Object.getPrototypeOf(parsed?.[0] ?? null)).toBe(Object.prototype);
    expect(input[0]).toHaveProperty("extra");
  });

  test("accepts old assistant content up to 4000 characters", () => {
    const parsed = parsePersistedCompanyResearchChatMessages([
      {
        id: "message-1",
        role: "assistant",
        content: "x".repeat(4000),
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]);

    expect(parsed?.[0]?.content.length).toBe(4000);
  });

  test("preserves valid content without trimming while trimming ids and citations", () => {
    const parsed = parsePersistedCompanyResearchChatMessages([
      {
        id: "  message-1  ",
        role: "assistant",
        content: " hello ",
        createdAt: "2026-01-01T00:00:00.000Z",
        citations: [{ sourceId: "  source-1  ", label: "  [1]  " }]
      }
    ]);

    expect(parsed).toEqual([
      {
        id: "message-1",
        role: "assistant",
        content: " hello ",
        createdAt: "2026-01-01T00:00:00.000Z",
        citations: [{ sourceId: "source-1", label: "[1]" }]
      }
    ]);
  });

  test("rejects overlong user content but accepts legacy assistant content up to 4000", () => {
    const user = parsePersistedCompanyResearchChatMessages([
      buildMessage({ role: "user", content: "x".repeat(201) })
    ]);
    expect(user).toBeNull();

    const assistant = parsePersistedCompanyResearchChatMessages([
      buildMessage({ role: "assistant", content: "x".repeat(4000) })
    ]);
    expect(assistant?.[0]?.content.length).toBe(4000);
  });

  test("rejects overlong assistant content and too many messages", () => {
    const tooMany = Array.from({ length: 51 }, (_, index) => buildMessage({ id: `m-${index}`, role: index % 2 === 0 ? "user" : "assistant" }));
    expect(parsePersistedCompanyResearchChatMessages(tooMany)).toBeNull();

    const overlong = parsePersistedCompanyResearchChatMessages([
      buildMessage({ role: "assistant", content: "x".repeat(4001) })
    ]);
    expect(overlong).toBeNull();
  });

  test("safe against hostile getters and revoked proxies", () => {
    const hostile = new Proxy(
      [{ id: "message-1", role: "user", content: "x", createdAt: "2026-01-01T00:00:00.000Z" }],
      {
        get() {
          throw new Error("boom");
        }
      }
    );
    const revoked = Proxy.revocable(hostile, {});
    revoked.revoke();

    expect(() => parsePersistedCompanyResearchChatMessages(revoked.proxy)).not.toThrow();
    expect(parsePersistedCompanyResearchChatMessages(revoked.proxy)).toBeNull();
  });

  test("counts only exact user role from parsed messages", () => {
    const parsed = parsePersistedCompanyResearchChatMessages([
      buildMessage({ role: "user" }),
      buildMessage({ role: "assistant" }),
      buildMessage({ role: "user" })
    ]);

    expect(parsed && countCompanyResearchUserQuestions(parsed)).toBe(2);
  });
});
