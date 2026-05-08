"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CircleUserRound } from "lucide-react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth/client";

type AccountMenuProps = {
  image?: string | null;
  name?: string | null;
};

export function AccountMenu({ image, name }: AccountMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="アカウントメニュー"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-rakumo-border bg-white/90 text-rakumo-ink shadow-sm hover:border-rakumo-mint/70 hover:bg-rakumo-cream hover:text-rakumo-ink"
      >
        {image ? (
          <img
            src={image}
            alt={name ? `${name}のプロフィール画像` : "プロフィール画像"}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <CircleUserRound className="size-5" />
        )}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-50 w-48 rounded-2xl border border-rakumo-border bg-white p-2 shadow-[0_24px_40px_-28px_rgba(45,58,74,0.35)]">
          <Link
            href="/settings/account"
            onClick={() => setIsOpen(false)}
            className="block rounded-xl px-3 py-2 text-sm text-rakumo-ink transition hover:bg-rakumo-cream hover:text-rakumo-ink"
          >
            アカウント設定
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-xl px-3 py-2 text-left text-sm text-rakumo-ink transition hover:bg-rakumo-cream hover:text-rakumo-ink"
          >
            ログアウト
          </button>
        </div>
      ) : null}
    </div>
  );
}
