"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth/client";

type GoogleLoginButtonProps = {
  variant?: "default" | "login-mock";
};

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="h-7 w-7 shrink-0">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.207 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4c-7.682 0-14.347 4.337-17.694 10.691Z" />
      <path fill="#4CAF50" d="M24 44c5.168 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.144 35.091 26.686 36 24 36c-5.186 0-9.62-3.317-11.283-7.946l-6.522 5.025C9.5 39.556 16.52 44 24 44Z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
    </svg>
  );
}

export function GoogleLoginButton({ variant = "default" }: GoogleLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const callbackURL = `${window.location.origin}/dashboard`;
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL
      });

      if (result.error) {
        setError(result.error.message ?? "Googleログインを開始できませんでした。");
        return;
      }
    } catch {
      setError("Googleログインの開始に失敗しました。設定を確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const buttonClassName =
    variant === "login-mock"
      ? "flex min-h-[72px] w-full items-center justify-center gap-4 rounded-[18px] border border-[#e6e9ef] bg-white px-6 text-[1.02rem] font-bold text-[#1f2937] shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)] hover:bg-[#fcfcfc] disabled:cursor-not-allowed disabled:opacity-60"
      : "button-primary w-full";

  return (
    <div className="space-y-3">
      <button type="button" className={buttonClassName} onClick={handleLogin} disabled={loading}>
        {loading ? <Loader2 className="size-5 animate-spin" /> : <GoogleMark />}
        <span>Google でログイン</span>
      </button>

      {error ? (
        <p className={variant === "login-mock" ? "rounded-[14px] border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700" : "rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
