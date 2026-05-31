"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { db } from "@/lib/db/client";
import { userCommuteProfiles } from "@/lib/db/schema";

export type CommuteSettingsActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const initialCommuteSettingsActionState: CommuteSettingsActionState = {
  status: "idle"
};

const commuteProfileSchema = z.object({
  homeAddress: z.string().trim().max(240).optional(),
  homeNearestStation: z.string().trim().max(120).optional(),
  preferredMaxCommuteMinutes: z.union([z.literal(""), z.coerce.number().int().min(1).max(240)])
});

export async function saveCommuteProfileAction(
  _: CommuteSettingsActionState,
  formData: FormData
): Promise<CommuteSettingsActionState> {
  const user = await requireUser();
  const parsed = commuteProfileSchema.safeParse({
    homeAddress: formData.get("homeAddress")?.toString() ?? "",
    homeNearestStation: formData.get("homeNearestStation")?.toString() ?? "",
    preferredMaxCommuteMinutes: formData.get("preferredMaxCommuteMinutes")?.toString() ?? ""
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "通勤プロフィールの入力値が不正です。"
    };
  }

  const existing = (await db.select().from(userCommuteProfiles).where(eq(userCommuteProfiles.userId, user.id)).limit(1))[0];
  const now = new Date();
  const payload = {
    homeAddress: parsed.data.homeAddress || null,
    homeNearestStation: parsed.data.homeNearestStation || null,
    preferredMaxCommuteMinutes:
      typeof parsed.data.preferredMaxCommuteMinutes === "number" ? parsed.data.preferredMaxCommuteMinutes : null,
    updatedAt: now
  };

  if (!existing) {
    await db.insert(userCommuteProfiles).values({
      id: crypto.randomUUID(),
      userId: user.id,
      ...payload,
      createdAt: now
    });
  } else {
    await db.update(userCommuteProfiles).set(payload).where(eq(userCommuteProfiles.id, existing.id));
  }

  revalidatePath("/settings/commute");
  revalidatePath("/jobs");
  revalidatePath("/jobs/new");

  return {
    status: "success",
    message: "通勤プロフィールを保存しました。"
  };
}
