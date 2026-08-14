import { serverEnv } from "@/lib/env/server";

export async function requestAiInterviewJson<T>(input: {
  systemPrompt: string;
  userPrompt: string;
  schemaName: string;
  schema: Record<string, unknown>;
}): Promise<T> {
  if (!serverEnv.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY が設定されていません");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serverEnv.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: serverEnv.OPENAI_MAIN_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: input.systemPrompt },
        { role: "user", content: input.userPrompt }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: input.schemaName,
          strict: true,
          schema: input.schema
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${detail}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response was empty");
  }

  return JSON.parse(content) as T;
}
