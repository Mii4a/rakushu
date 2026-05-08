import type { ParsedJob, Rank } from "@/lib/analysis";

export type RakumoCommentTone = "neutral" | "good" | "caution" | "concern" | "deadpan";

export const rakumoComments: Record<RakumoCommentTone, string[]> = {
  good: [
    "かなり良さそう。でも残業欄だけ確認しておこう",
    "条件は悪くないね。仕事内容の具体性も見ておきたい"
  ],
  caution: [
    "条件はいいけど、残業の書き方がちょっとあいまい",
    "未経験歓迎なのに、必須条件が多めかも"
  ],
  concern: [
    "ここ、あなたの希望とは少しズレるかも",
    "情報が少ないね。口コミか採用ページも見たい"
  ],
  deadpan: [
    "アットホーム推しが強いね。制度の説明も見よう",
    "成長環境って言葉だけでは判断できないね"
  ],
  neutral: [
    "まずは気になる求人を1つ入れてみよう",
    "完璧に整理しなくて大丈夫。雑に入れてから整えよう"
  ]
};

type JobCommentInput = {
  rank: string | null | undefined;
  parsed: ParsedJob | null;
};

const deadpanWarnings = new Set([
  "アットホーム",
  "成長できる環境",
  "裁量が大きい",
  "やりがい",
  "風通しが良い",
  "人物重視",
  "若手活躍"
]);

function pickComment(tone: RakumoCommentTone, indexHint: number) {
  const options = rakumoComments[tone];
  return options[indexHint % options.length] ?? rakumoComments.neutral[0];
}

export function getRakumoJobComment({ rank, parsed }: JobCommentInput): { tone: RakumoCommentTone; text: string } {
  const normalizedRank = rank === "S" || rank === "A" || rank === "B" || rank === "C" || rank === "D" || rank === "E" || rank === "UNKNOWN" ? (rank as Rank) : "UNKNOWN";
  const warnings = parsed?.warnings.value ?? [];
  const warningCount = warnings.length;

  if (warnings.some((warning) => deadpanWarnings.has(warning))) {
    return { tone: "deadpan", text: pickComment("deadpan", warningCount) };
  }

  if (normalizedRank === "S" || normalizedRank === "A") {
    return { tone: "good", text: pickComment("good", warningCount) };
  }

  if (normalizedRank === "B" || warningCount > 0) {
    return { tone: "caution", text: pickComment("caution", warningCount) };
  }

  if (normalizedRank === "C" || normalizedRank === "D" || normalizedRank === "E") {
    return { tone: "concern", text: pickComment("concern", warningCount) };
  }

  return { tone: "neutral", text: pickComment("neutral", warningCount) };
}
