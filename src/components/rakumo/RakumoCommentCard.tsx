import type { RakumoCommentTone } from "@/lib/rakumo/comments";
import { RakumoAvatar } from "@/components/rakumo/RakumoAvatar";

const toneStyles: Record<RakumoCommentTone, { border: string; bg: string; badge: string; label: string }> = {
  neutral: {
    border: "border-rakumo-border",
    bg: "bg-rakumo-cream",
    badge: "bg-slate-100 text-slate-600",
    label: "ひとまず"
  },
  good: {
    border: "border-rakumo-mint/60",
    bg: "bg-[#F2FFFB]",
    badge: "bg-rakumo-mint/20 text-rakumo-ink",
    label: "よさそう"
  },
  caution: {
    border: "border-rakumo-warning/70",
    bg: "bg-[#FFF8D9]",
    badge: "bg-rakumo-warning/60 text-rakumo-ink",
    label: "少し注意"
  },
  concern: {
    border: "border-rakumo-peach/80",
    bg: "bg-[#FFF3EA]",
    badge: "bg-rakumo-peach/70 text-rakumo-ink",
    label: "少し気になる"
  },
  deadpan: {
    border: "border-rakumo-lavender/70",
    bg: "bg-[#F7F4FF]",
    badge: "bg-rakumo-lavender/45 text-rakumo-ink",
    label: "らくも目線"
  }
};

type Props = {
  tone: RakumoCommentTone;
  text: string;
  title?: string;
  className?: string;
};

export function RakumoCommentCard({ tone, text, title = "らくものひとこと", className }: Props) {
  const style = toneStyles[tone];

  return (
    <div className={`rounded-3xl border p-4 shadow-[0_8px_24px_-20px_rgba(45,58,74,0.28)] ${style.border} ${style.bg} ${className ?? ""}`}>
      <div className="flex items-start gap-4">
        <RakumoAvatar tone={tone} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-rakumo-ink">{title}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${style.badge}`}>{style.label}</span>
          </div>
          <div className="relative mt-3 rounded-[24px] bg-white/80 px-4 py-3 text-sm leading-6 text-rakumo-ink">
            <div className="absolute -left-2 top-4 h-4 w-4 rotate-45 rounded-[4px] bg-white/80" aria-hidden="true" />
            <p className="relative">{text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
