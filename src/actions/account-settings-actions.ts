"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireUser } from "@/lib/auth/require-user";
import { auth } from "@/lib/auth/server";

export type AccountSettingsActionState =
  | {
      status: "idle";
      message?: string;
    }
  | {
      status: "error";
      message: string;
    }
  | {
      status: "success";
      message: string;
    };

function normalizeName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return {
      ok: false as const,
      message: "名前を入力してください。"
    };
  }

  const name = value.trim();

  if (name.length === 0) {
    return {
      ok: false as const,
      message: "名前を入力してください。"
    };
  }

  if (name.length > 50) {
    return {
      ok: false as const,
      message: "名前は50文字以内で入力してください。"
    };
  }

  return {
    ok: true as const,
    name
  };
}

export async function updateAccountNameAction(
  _previousState: AccountSettingsActionState,
  formData: FormData
): Promise<AccountSettingsActionState> {
  await requireUser();

  const normalizedName = normalizeName(formData.get("name"));

  if (!normalizedName.ok) {
    return {
      status: "error",
      message: normalizedName.message
    };
  }

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: normalizedName.name
      }
    });
  } catch {
    return {
      status: "error",
      message: "名前の保存に失敗しました。"
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/settings/account");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "名前を保存しました。"
  };
}
