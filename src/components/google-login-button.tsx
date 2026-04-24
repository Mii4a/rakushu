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
      className="button-primary w-full"
      onClick={handleLogin}
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : null}
      Googleでログイン
    </button>
  );
}
