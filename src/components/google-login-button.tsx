"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth/client";

export function GoogleLoginButton() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: "/dashboard"
    });
    setLoading(false);
  };

  return (
    <button
      type="button"
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rakushu-500 px-4 py-2 font-medium text-white transition hover:bg-rakushu-700 disabled:opacity-60"
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      Googleでログイン
    </button>
  );
}
