import Image, { type StaticImageData } from "next/image";

import concernedImage from "../../../yuru-chara/rakumo_concerned.jpg";
import deadpanImage from "../../../yuru-chara/rakumo_deadpan.jpg";
import happyImage from "../../../yuru-chara/rakumo_happy.jpg";
import neutralImage from "../../../yuru-chara/rakumo_neutral.jpg";
import nihilityImage from "../../../yuru-chara/rakumo_nihility.jpg";
import skepticalImage from "../../../yuru-chara/rakumo_skeptical.jpg";
import type { RakumoCommentTone } from "@/lib/rakumo/comments";

const avatarMap: Record<RakumoCommentTone, StaticImageData> = {
  neutral: neutralImage,
  good: happyImage,
  caution: skepticalImage,
  concern: concernedImage,
  deadpan: deadpanImage
};

const altMap: Record<RakumoCommentTone, string> = {
  neutral: "やわらかい表情のらくも",
  good: "少し安心した表情のらくも",
  caution: "少し気になっている表情のらくも",
  concern: "心配そうな表情のらくも",
  deadpan: "落ち着いて見ているらくも"
};

type Props = {
  tone: RakumoCommentTone;
  className?: string;
};

export function RakumoAvatar({ tone, className }: Props) {
  const image = avatarMap[tone] ?? nihilityImage;
  const alt = altMap[tone] ?? altMap.neutral;

  if (!image) {
    return <div className={`h-16 w-16 rounded-full bg-rakumo-mint/30 ${className ?? ""}`} aria-hidden="true" />;
  }

  return (
    <div className={`relative h-16 w-16 overflow-hidden rounded-full border border-rakumo-border bg-white ${className ?? ""}`}>
      <Image src={image} alt={alt} fill className="object-cover" sizes="64px" />
    </div>
  );
}
