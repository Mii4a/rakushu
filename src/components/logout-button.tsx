"use client";

import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition hover:bg-slate-100"
    >
      ログアウト
    </button>
  );
}
