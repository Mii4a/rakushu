import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Bell, Bookmark, ChevronDown, Search } from "lucide-react";

export function JobsMockShell({ children }: { children: React.ReactNode }) {
  return <section className="jobs-mock-surface min-h-screen bg-white">{children}</section>;
}

export function JobsMockHeader({ displayName }: { displayName: string }) {
  return (
    <header className="border-b border-[#ecefe8] bg-white">
      <div className="mx-auto flex w-full max-w-[1380px] items-center justify-between gap-6 px-6 py-4 lg:px-10">
        <Link href="/" className="text-[2.35rem] font-black tracking-[-0.06em] text-[#21a53a]">
          らくしゅう
        </Link>
        <nav className="hidden items-center gap-12 text-[1.05rem] font-semibold text-[#262c31] lg:flex">
          <Link href="/" className="hover:text-[#1d9b38]">使い方</Link>
          <Link href="/" className="hover:text-[#1d9b38]">機能</Link>
          <Link href="/pricing" className="relative text-[#262c31] hover:text-[#1d9b38]">料金</Link>
          <Link href="/" className="hover:text-[#1d9b38]">よくある質問</Link>
        </nav>
        <div className="flex items-center gap-4">
          <button type="button" aria-label="通知" className="inline-flex size-11 items-center justify-center rounded-full border border-[#e8ebe3] bg-white text-[#20262d]">
            <Bell className="size-5" />
          </button>
          <div className="inline-flex items-center gap-3 rounded-full border border-[#e8ebe3] bg-white px-2.5 py-1.5 text-sm font-semibold text-[#23292f]">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#f3f5ef] text-[#1f9c39]">{displayName.slice(0, 1) || "ら"}</div>
            <span className="hidden sm:inline">{displayName}</span>
            <ChevronDown className="size-4 text-[#6a737d]" />
          </div>
        </div>
      </div>
    </header>
  );
}

export function PageAccentTitle({ title, description, cta }: { title: string; description: string; cta?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="flex items-center gap-4">
          <span className="inline-flex h-9 w-7 rounded-[8px] bg-[linear-gradient(180deg,#60c84d_0%,#35a83b_100%)]" />
          <h1 className="text-[3rem] font-black tracking-[-0.04em] text-[#191d21] sm:text-[3.6rem]">{title}</h1>
        </div>
        <p className="mt-4 text-[1.05rem] text-[#5f6771]">{description}</p>
      </div>
      {cta ? <div className="shrink-0">{cta}</div> : null}
    </div>
  );
}

export function ScoreRing({ score, label, size = 144 }: { score: number; label?: string; size?: number }) {
  return (
    <div className="flex flex-col items-center text-center">
      {label ? <p className="mb-3 text-sm font-semibold text-[#6a737c]">{label}</p> : null}
      <div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(#41b14b ${score * 3.6}deg, #ebefe9 ${score * 3.6}deg 360deg)`
        }}
      >
        <div className="flex items-center justify-center rounded-full bg-white" style={{ width: size - 18, height: size - 18 }}>
          <div>
            <div className="text-[3.2rem] font-black leading-none text-[#34a63e]">{score}</div>
            <div className="mt-1 text-lg font-semibold text-[#6b737b]">/100</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompanyMark({ label, tone = 0 }: { label: string; tone?: number }) {
  const tones = [
    "bg-[#edf7ff] text-[#2b7feb]",
    "bg-[#eef8e7] text-[#2ba33e]",
    "bg-[#fff4df] text-[#f29f05]",
    "bg-[#f2eeff] text-[#7a58f4]",
    "bg-[#eef3ff] text-[#346cf2]"
  ];
  return (
    <div className={`flex size-14 items-center justify-center rounded-[16px] text-lg font-black shadow-[inset_0_0_0_1px_rgba(230,233,224,1)] ${tones[tone % tones.length]}`}>
      {label.slice(0, 1)}
    </div>
  );
}

export function MockCharacterCard({ image, bubble, title, body }: { image: StaticImageData; bubble?: string; title: string; body?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-[#ebeee7] bg-white px-5 py-5 shadow-[0_10px_24px_-26px_rgba(15,23,42,0.18)]">
      {bubble ? <div className="absolute left-5 top-5 max-w-[11rem] rounded-[18px] border border-[#cfe8c8] bg-white px-4 py-3 text-[1rem] font-bold leading-6 text-[#2b3238] shadow-[0_10px_20px_-20px_rgba(15,23,42,0.2)]">{bubble}</div> : null}
      <div className="relative ml-auto h-[150px] w-[160px]">
        <Image src={image} alt={title} fill className="object-contain object-right-bottom" />
      </div>
      <h3 className="mt-2 text-[1.45rem] font-black tracking-tight text-[#191d21]">{title}</h3>
      {body ? <p className="mt-2 text-sm leading-7 text-[#69737c]">{body}</p> : null}
    </div>
  );
}

export function SearchIconField({ name, defaultValue, placeholder }: { name: string; defaultValue?: string; placeholder: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#656d76]" />
      <input name={name} defaultValue={defaultValue} placeholder={placeholder} className="h-14 w-full rounded-[16px] border border-[#e6e9e1] bg-white pl-12 pr-4 text-[0.98rem] text-[#1f252a] outline-none focus:border-[#86d58a] focus:ring-4 focus:ring-[#86d58a]/15" />
    </div>
  );
}

export function OutlineButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-[16px] border border-[#89d390] bg-white px-5 py-3 text-sm font-bold text-[#239f3c]">{children}</Link>;
}

export function SolidButton({ href, children }: { href: string; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-[16px] bg-[#2aa63d] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_24px_-22px_rgba(42,166,61,0.8)]">{children}</Link>;
}

export function TinyStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[#edf0e7] bg-white px-4 py-4 text-center shadow-[0_8px_18px_-24px_rgba(15,23,42,0.18)]">
      <p className="text-sm font-semibold text-[#6d7680]">{label}</p>
      <p className="mt-2 text-[2rem] font-black tracking-tight text-[#1b2025]">{value}</p>
    </div>
  );
}

export function MatchBar({ label, score, tone }: { label: string; score: number; tone: "green" | "yellow" | "orange" }) {
  const toneClass = tone === "green" ? "bg-[#2faa45]" : tone === "yellow" ? "bg-[#e6b927]" : "bg-[#ff9c1a]";
  return (
    <div className="grid items-center gap-3 sm:grid-cols-[110px_minmax(0,1fr)_64px]">
      <div className="text-sm font-semibold text-[#30363c]">{label}</div>
      <div className="h-[6px] overflow-hidden rounded-full bg-[#ebeff2]"><div className={`h-full rounded-full ${toneClass}`} style={{ width: `${score}%` }} /></div>
      <div className="text-right text-sm font-bold text-[#2a3035]">{score} <span className="font-medium text-[#7b848d]">/100</span></div>
    </div>
  );
}

export function JobMetaChip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-[#ebeee7] bg-white px-2.5 py-1 text-xs font-semibold text-[#5e6872]">{children}</span>;
}

export function SectionPanel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-[28px] border border-[#ebeee7] bg-white shadow-[0_12px_28px_-30px_rgba(15,23,42,0.18)] ${className}`}>{children}</div>;
}

export function CompareCheckboxVisual({ checked = false }: { checked?: boolean }) {
  return <div className={`flex size-6 items-center justify-center rounded-[7px] border ${checked ? "border-[#2ba33e] bg-[#2ba33e] text-white" : "border-[#d8ddd4] bg-white text-transparent"}`}><Bookmark className="size-3.5" /></div>;
}
