import Link from "next/link";

import type { RakumoCommentTone } from "@/lib/rakumo/comments";
import { RakumoCommentCard } from "@/components/rakumo/RakumoCommentCard";

type Props = {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
  tone?: RakumoCommentTone;
};

export function RakumoEmptyState({ title, body, ctaHref, ctaLabel, tone = "neutral" }: Props) {
  return (
    <div className="space-y-4">
      <RakumoCommentCard tone={tone} title={title} text={body} />
      <Link href={ctaHref} className="button-primary">
        {ctaLabel}
      </Link>
    </div>
  );
}
