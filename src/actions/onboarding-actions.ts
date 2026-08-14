"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireUser } from "@/lib/auth/require-user";
import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { userOnboardingProfiles } from "@/lib/db/schema";
import { type OnboardingDraft } from "@/lib/onboarding/draft";

const draftSchema = z.object({
  started: z.boolean(),
  currentStep: z.number().int().min(0).max(5),
  nickname: z.string().trim().max(50),
  applicantStatus: z.array(z.string().trim().min(1).max(50)).max(12),
  workStyles: z.array(z.string().trim().min(1).max(50)).max(12),
  locations: z.array(z.string().trim().min(1).max(80)).max(8),
  commutePreference: z.string().trim().max(80),
  locationNote: z.string().trim().max(240),
  salaryPreference: z.string().trim().max(80),
  avoidConditions: z.array(z.string().trim().min(1).max(80)).max(14),
  jobHuntingStatus: z.string().trim().max(80),
  priority: z.array(z.string().trim().min(1).max(80)).max(3),
  deferredRoles: z.boolean(),
  deferredSkills: z.boolean(),
  completedAt: z.string().datetime().optional(),
  skippedAt: z.string().datetime().optional()
});

function normalizeNickname(value: string) {
  const nickname = value.trim();

  if (!nickname) {
    return {
      ok: false as const,
      message: "呼び名を入力してください。"
    };
  }

  if (nickname.length > 50) {
    return {
      ok: false as const,
      message: "呼び名は50文字以内で入力してください。"
    };
  }

  return {
    ok: true as const,
    nickname
  };
}

async function upsertOnboardingProfile(userId: string, draft: OnboardingDraft) {
  const existing = (
    await db.select().from(userOnboardingProfiles).where(eq(userOnboardingProfiles.userId, userId)).limit(1)
  )[0];
  const now = new Date();
  const payload = {
    started: draft.started,
    currentStep: draft.currentStep,
    nickname: draft.nickname.trim() || null,
    applicantStatusJson: JSON.stringify(draft.applicantStatus),
    workStylesJson: JSON.stringify(draft.workStyles),
    locationsJson: JSON.stringify(draft.locations),
    commutePreference: draft.commutePreference || null,
    locationNote: draft.locationNote || null,
    salaryPreference: draft.salaryPreference || null,
    avoidConditionsJson: JSON.stringify(draft.avoidConditions),
    jobHuntingStatus: draft.jobHuntingStatus || null,
    priorityJson: JSON.stringify(draft.priority),
    deferredRoles: draft.deferredRoles,
    deferredSkills: draft.deferredSkills,
    completedAt: draft.completedAt ? new Date(draft.completedAt) : null,
    skippedAt: draft.skippedAt ? new Date(draft.skippedAt) : null,
    updatedAt: now
  };

  if (!existing) {
    await db.insert(userOnboardingProfiles).values({
      id: crypto.randomUUID(),
      userId,
      ...payload,
      createdAt: now
    });
    return;
  }

  await db.update(userOnboardingProfiles).set(payload).where(eq(userOnboardingProfiles.id, existing.id));
}

function revalidateOnboardingPaths() {
  revalidatePath("/", "layout");
  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/jobs");
  revalidatePath("/jobs/new");
  revalidatePath("/settings/account");
}

export async function saveOnboardingProgressAction(draftInput: OnboardingDraft) {
  const user = await requireUser();
  const parsed = draftSchema.safeParse(draftInput);

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "オンボーディングの入力値が不正です。"
    };
  }

  await upsertOnboardingProfile(user.id, {
    ...parsed.data,
    completedAt: undefined,
    skippedAt: undefined
  });

  revalidateOnboardingPaths();

  return {
    ok: true as const
  };
}

export async function skipOnboardingAction(draftInput: OnboardingDraft) {
  const user = await requireUser();
  const parsed = draftSchema.safeParse({
    ...draftInput,
    skippedAt: draftInput.skippedAt ?? new Date().toISOString(),
    completedAt: undefined
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "オンボーディングの保存に失敗しました。"
    };
  }

  await upsertOnboardingProfile(user.id, parsed.data);
  revalidateOnboardingPaths();

  return {
    ok: true as const
  };
}

export async function completeOnboardingAction(draftInput: OnboardingDraft) {
  const user = await requireUser();
  const normalizedNickname = normalizeNickname(draftInput.nickname);

  if (!normalizedNickname.ok) {
    return {
      ok: false as const,
      message: normalizedNickname.message
    };
  }

  const parsed = draftSchema.safeParse({
    ...draftInput,
    nickname: normalizedNickname.nickname,
    completedAt: draftInput.completedAt ?? new Date().toISOString(),
    skippedAt: undefined
  });

  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "オンボーディングの保存に失敗しました。"
    };
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: normalizedNickname.nickname
      }
    });
  } catch {
    return {
      ok: false as const,
      message: "呼び名の保存に失敗しました。"
    };
  }

  await upsertOnboardingProfile(user.id, parsed.data);
  revalidateOnboardingPaths();

  return {
    ok: true as const,
    nickname: normalizedNickname.nickname
  };
}
