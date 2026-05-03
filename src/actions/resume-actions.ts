"use server";

import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { getUserPlan } from "@/lib/subscription";

export type ResumeActionState = {
  error: string | null;
  result: string | null;
};

export const initialResumeActionState: ResumeActionState = {
  error: null,
  result: null
};

const resumeDraftSchema = z.object({
  fullName: z.string().trim().min(1, "氏名を入力してください").max(100),
  furigana: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.union([z.literal(""), z.string().email("メールアドレス形式が不正です")]),
  education: z.string().trim().min(1, "学歴を入力してください").max(4000),
  experience: z.string().trim().max(4000).optional(),
  selfPr: z.string().trim().min(1, "自己PRを入力してください").max(4000),
  motivation: z.string().trim().min(1, "志望動機を入力してください").max(4000),
  templateName: z.string().trim().min(1, "フォーマット名を入力してください").max(120)
});

export async function generateResumeDraftAction(
  _: ResumeActionState,
  formData: FormData
): Promise<ResumeActionState> {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);

  if (plan !== "pro") {
    return {
      error: "履歴書下書き作成はProプラン限定機能です。",
      result: null
    };
  }

  const parsed = resumeDraftSchema.safeParse({
    fullName: formData.get("fullName")?.toString() ?? "",
    furigana: formData.get("furigana")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    education: formData.get("education")?.toString() ?? "",
    experience: formData.get("experience")?.toString() ?? "",
    selfPr: formData.get("selfPr")?.toString() ?? "",
    motivation: formData.get("motivation")?.toString() ?? "",
    templateName: formData.get("templateName")?.toString() ?? ""
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "入力値が不正です。",
      result: null
    };
  }

  const data = parsed.data;
  const content = `【履歴書（${data.templateName}）】\n\n氏名: ${data.fullName}\nふりがな: ${data.furigana || ""}\n電話番号: ${data.phone || ""}\nメール: ${data.email || ""}\n\n--- 学歴 ---\n${data.education}\n\n--- 職歴・経験 ---\n${data.experience || "(未記入)"}\n\n--- 自己PR ---\n${data.selfPr}\n\n--- 志望動機 ---\n${data.motivation}\n`;

  return {
    error: null,
    result: content
  };
}
