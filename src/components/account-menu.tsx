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
        className="flex size-9 items-center justify-center overflow-hidden rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100 hover:text-rakushu-700"
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
        <div className="absolute right-0 top-12 z-50 w-44 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          <Link
            href="/settings/account"
            onClick={() => setIsOpen(false)}
            className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100 hover:text-rakushu-700"
          >
            アカウント設定
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-rakushu-700"
          >
            ログアウト
          </button>
        </div>
      ) : null}
    </div>
  );
}
