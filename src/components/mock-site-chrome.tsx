import Link from "next/link";
import { Bell, ChevronDown } from "lucide-react";

const navItems = [
  { href: "/#how-to", label: "使い方" },
  { href: "/#features", label: "機能" },
  { href: "/pricing", label: "料金" },
  { href: "/about", label: "よくある質問" }
] as const;

export function MockSiteHeader({ activeHref }: { activeHref?: string }) {
  return (
    <header className="border-b border-[#ececec]">
      <div className="mx-auto flex w-full max-w-[1480px] items-center gap-6 px-6 py-5 xl:px-10">
        <Link href="/" className="whitespace-nowrap text-[3.6rem] font-black tracking-[-0.06em] text-[#19a34a]">
          らくしゅう
        </Link>

        <nav className="ml-auto hidden items-center gap-12 text-[1.05rem] font-semibold text-[#2f3747] md:flex">
          {navItems.map((item) => {
            const active = activeHref === item.href;
            return (
              <Link key={item.href} href={item.href} className={active ? "border-b-4 border-[#2fae4a] pb-2 text-[#2fae4a]" : "pb-2 transition hover:text-[#17a34a]"}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-4 md:ml-0">
          <button
            type="button"
            aria-label="通知"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#e9eaee] bg-white text-[#1f2937] shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)]"
          >
            <Bell className="h-5 w-5" />
          </button>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-full border border-[#e8eaef] bg-white px-3 py-2 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.35)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#f5d7c2_0%,#f0b388_100%)] text-sm font-bold text-[#673b2d]">
              山
            </div>
            <span className="text-base font-semibold text-[#374151]">山田 花子</span>
            <ChevronDown className="h-4 w-4 text-[#6b7280]" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MockSiteFooter({ copy }: { copy: string }) {
  return (
    <section className="mt-8 pb-8">
      <div className="mx-auto max-w-[1480px] px-6 xl:px-10">
        <div className="rounded-[28px] border border-[#eceff3] bg-white px-6 py-5 text-center text-[1.15rem] font-semibold leading-8 text-[#6b7280] shadow-[0_24px_64px_-54px_rgba(15,23,42,0.18)]">
          {copy}
        </div>
      </div>
    </section>
  );
}
