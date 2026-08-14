"use client";

import { useMemo, useState } from "react";
import { Gift, MapPinned, ShieldCheck, Sparkles, TimerReset } from "lucide-react";

export type FixedOvertimeState = { a: number; b: number; c: number; d: number };
export type AnnualHolidayState = { s: number; a: number; b: number; c: number; d: number };
export type BonusState = { s: number; a: number; b: number; c: number };
export type RetirementState = { withAllowance: string; withoutAllowance: string };

const tagSuggestions = [
  "既卒",
  "第2新卒",
  "バックエンド",
  "インフラ",
  "Web系",
  "自社開発",
  "正社員",
  "リモート可",
  "フレックス",
  "残業少なめ",
  "副業可",
  "東京",
  "通勤45分以内",
  "住宅手当",
  "書籍購入補助"
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function AssistantBubble({ children, step }: { children: React.ReactNode; step?: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#f6d79d] bg-[linear-gradient(180deg,#ffca69_0%,#ffb02f_100%)] text-xl shadow-[0_18px_28px_-24px_rgba(255,176,47,0.8)]">
        🧡
      </div>
      <div className="max-w-[46rem] rounded-[24px] border border-[#e7ece1] bg-white px-5 py-4 text-[1.02rem] font-semibold leading-8 text-[#2f3942] shadow-[0_18px_36px_-32px_rgba(15,23,42,0.18)]">
        {step ? <p className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-[#1ea54c]">{step}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[38rem] rounded-[22px] border border-[#dcebd7] bg-[#f3faef] px-5 py-4 text-[1rem] font-bold leading-7 text-[#36503c] shadow-[0_14px_30px_-28px_rgba(34,163,58,0.22)]">
        {children}
      </div>
    </div>
  );
}

function OptionChip({ active, label, onClick, icon }: { active?: boolean; label: string; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-12 items-center gap-2 rounded-full border px-4 py-3 text-sm font-bold transition ${
        active
          ? "border-[#1ea54c] bg-[#effaf0] text-[#1c8d39] shadow-[0_12px_24px_-22px_rgba(30,165,76,0.6)]"
          : "border-[#dce4da] bg-white text-[#44505a] hover:border-[#b8cfba] hover:bg-[#fbfdf9]"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  unit,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="rounded-[20px] border border-[#e7ece1] bg-[#fbfdf9] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-[#33404a]">{label}</span>
        <span className="text-sm font-black text-[#17191d]">{value}{unit}</span>
      </div>
      <input
        aria-label={label}
        className="mt-3 h-2 w-full cursor-pointer accent-[#1ea54c]"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  );
}

function MessageCard({ children }: { children: React.ReactNode }) {
  return <div className="ml-16 rounded-[28px] border border-[#e7ece1] bg-[#fcfefb] p-5 shadow-[0_16px_34px_-30px_rgba(15,23,42,0.12)]">{children}</div>;
}

export function summarizeFixedOvertime(value: FixedOvertimeState) {
  return `固定残業は ${value.a}/${value.b}/${value.c}/${value.d} 時間ラインで見たい`;
}

export function summarizeAnnualHolidays(value: AnnualHolidayState) {
  return `年間休日は ${value.a}日以上をかなり重視、${value.s}日以上なら最高評価にしたい`;
}

export function summarizeBonus(value: BonusState) {
  return `賞与は ${value.a}回以上を高評価、${value.s}回以上ならかなり嬉しい`;
}

export function summarizeRetirement(value: RetirementState) {
  return `退職金ありは ${value.withAllowance} ランク、なしは ${value.withoutAllowance} ランクで見たい`;
}

export function summarizeTags(tags: string[]) {
  return tags.length > 0 ? tags.join(" / ") : "タグはまだ未設定";
}

export function CriteriaThresholdEditor({
  fixedOvertime,
  annualHolidays,
  bonus,
  retirement,
  activeTemplateTags,
  onFixedOvertimeChange,
  onAnnualHolidaysChange,
  onBonusChange,
  onRetirementChange,
  onTagsChange
}: {
  fixedOvertime: FixedOvertimeState;
  annualHolidays: AnnualHolidayState;
  bonus: BonusState;
  retirement: RetirementState;
  activeTemplateTags: string[];
  onFixedOvertimeChange: (next: FixedOvertimeState) => void;
  onAnnualHolidaysChange: (next: AnnualHolidayState) => void;
  onBonusChange: (next: BonusState) => void;
  onRetirementChange: (next: RetirementState) => void;
  onTagsChange: (next: string[]) => void;
}) {
  const [customTag, setCustomTag] = useState("");

  const progress = useMemo(() => {
    let completed = 0;
    if (fixedOvertime.b > 0) completed += 1;
    if (annualHolidays.a > 0) completed += 1;
    if (bonus.a > 0) completed += 1;
    if (activeTemplateTags.length > 0) completed += 1;
    return completed;
  }, [activeTemplateTags.length, annualHolidays.a, bonus.a, fixedOvertime.b]);

  const progressPercent = Math.max(20, Math.min(100, progress * 25));

  const quickOvertime = [10, 20, 30, 45];
  const quickHoliday = [105, 110, 120, 125];
  const quickBonus = [1, 2, 3, 4];

  const toggleTag = (tag: string) => {
    if (activeTemplateTags.includes(tag)) {
      onTagsChange(activeTemplateTags.filter((item) => item !== tag));
      return;
    }
    onTagsChange([...activeTemplateTags, tag].slice(0, 8));
  };

  const addCustomTag = () => {
    const next = customTag.trim();
    if (!next) return;
    if (activeTemplateTags.includes(next)) {
      setCustomTag("");
      return;
    }
    onTagsChange([...activeTemplateTags, next].slice(0, 8));
    setCustomTag("");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-[#e7ece1] bg-white px-5 py-5 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.16)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-[#162126]">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#eff8ec] px-3 py-2 text-sm font-black text-[#1f9f3a]">
              <Sparkles className="size-4" />
              {progress} / 4
            </span>
            <div className="h-3 w-[20rem] max-w-[46vw] overflow-hidden rounded-full bg-[#edf1ea]">
              <div className="h-full rounded-full bg-[#209e3b] transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <span className="inline-flex items-center rounded-full bg-[#f4fbf0] px-4 py-2 text-sm font-bold text-[#1d9938]">条件設定中</span>
        </div>
      </section>

      <AssistantBubble step="最初に確認">
        <div className="space-y-3">
          <p>最初にランクの意味をそろえるね。ここでの解釈はこれで進めるよ。</p>
          <div className="grid gap-2 text-sm leading-7 text-[#42505a] sm:grid-cols-2">
            <p><span className="font-black text-[#2368e2]">S</span>: 絶対応募するべき</p>
            <p><span className="font-black text-[#1ea54c]">A</span>: 応募するべき</p>
            <p><span className="font-black text-[#6aa62c]">B</span>: 標準的</p>
            <p><span className="font-black text-[#da9129]">C</span>: あまり標準的でない</p>
            <p className="sm:col-span-2"><span className="font-black text-[#da6041]">D</span>: 避けたほうが良い</p>
          </div>
        </div>
      </AssistantBubble>

      <AssistantBubble step="Q1">
        まずは、固定残業をどれくらいまで許容したいか決めよう。ざっくり選んでもいいし、あとで細かく動かしてもOK。
      </AssistantBubble>
      <MessageCard>
        <div className="flex flex-wrap gap-3">
          {quickOvertime.map((hours) => (
            <OptionChip
              key={hours}
              active={fixedOvertime.b === hours}
              label={`${hours}時間以内`}
              icon={<TimerReset className="size-4" />}
              onClick={() =>
                onFixedOvertimeChange({
                  a: Math.max(hours - 10, 0),
                  b: hours,
                  c: Math.min(hours + 10, 60),
                  d: Math.min(hours + 25, 80)
                })
              }
            />
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <SliderRow label="Aランク上限" value={fixedOvertime.a} min={0} max={Math.max(fixedOvertime.b - 1, 0)} unit="時間" onChange={(value) => onFixedOvertimeChange({ ...fixedOvertime, a: clamp(value, 0, fixedOvertime.b - 1) })} />
          <SliderRow label="Bランク上限" value={fixedOvertime.b} min={fixedOvertime.a + 1} max={Math.max(fixedOvertime.c - 1, fixedOvertime.a + 1)} unit="時間" onChange={(value) => onFixedOvertimeChange({ ...fixedOvertime, b: clamp(value, fixedOvertime.a + 1, fixedOvertime.c - 1) })} />
          <SliderRow label="Cランク上限" value={fixedOvertime.c} min={fixedOvertime.b + 1} max={Math.max(fixedOvertime.d - 1, fixedOvertime.b + 1)} unit="時間" onChange={(value) => onFixedOvertimeChange({ ...fixedOvertime, c: clamp(value, fixedOvertime.b + 1, fixedOvertime.d - 1) })} />
          <SliderRow label="Dランク上限" value={fixedOvertime.d} min={fixedOvertime.c + 1} max={80} unit="時間" onChange={(value) => onFixedOvertimeChange({ ...fixedOvertime, d: clamp(value, fixedOvertime.c + 1, 80) })} />
        </div>
      </MessageCard>
      <UserBubble>{summarizeFixedOvertime(fixedOvertime)}</UserBubble>

      <AssistantBubble step="Q2">
        次は年間休日。休みの多さをどれくらい強く見るか教えて。多いほど上位ランクに寄せる感じで決めよう。
      </AssistantBubble>
      <MessageCard>
        <div className="flex flex-wrap gap-3">
          {quickHoliday.map((days) => (
            <OptionChip
              key={days}
              active={annualHolidays.a === days}
              label={`${days}日以上`}
              icon={<MapPinned className="size-4" />}
              onClick={() =>
                onAnnualHolidaysChange({
                  d: Math.max(days - 25, 80),
                  c: Math.max(days - 15, 90),
                  b: Math.max(days - 8, 100),
                  a: days,
                  s: Math.min(days + 8, 140)
                })
              }
            />
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <SliderRow label="Dランク下限" value={annualHolidays.d} min={60} max={annualHolidays.c - 1} unit="日" onChange={(value) => onAnnualHolidaysChange({ ...annualHolidays, d: clamp(value, 60, annualHolidays.c - 1) })} />
          <SliderRow label="Cランク下限" value={annualHolidays.c} min={annualHolidays.d + 1} max={annualHolidays.b - 1} unit="日" onChange={(value) => onAnnualHolidaysChange({ ...annualHolidays, c: clamp(value, annualHolidays.d + 1, annualHolidays.b - 1) })} />
          <SliderRow label="Bランク下限" value={annualHolidays.b} min={annualHolidays.c + 1} max={annualHolidays.a - 1} unit="日" onChange={(value) => onAnnualHolidaysChange({ ...annualHolidays, b: clamp(value, annualHolidays.c + 1, annualHolidays.a - 1) })} />
          <SliderRow label="Aランク下限" value={annualHolidays.a} min={annualHolidays.b + 1} max={annualHolidays.s - 1} unit="日" onChange={(value) => onAnnualHolidaysChange({ ...annualHolidays, a: clamp(value, annualHolidays.b + 1, annualHolidays.s - 1) })} />
          <div className="lg:col-span-2">
            <SliderRow label="Sランク下限" value={annualHolidays.s} min={annualHolidays.a + 1} max={180} unit="日" onChange={(value) => onAnnualHolidaysChange({ ...annualHolidays, s: clamp(value, annualHolidays.a + 1, 180) })} />
          </div>
        </div>
      </MessageCard>
      <UserBubble>{summarizeAnnualHolidays(annualHolidays)}</UserBubble>

      <AssistantBubble step="Q3">
        賞与と退職金も決めよう。制度がちゃんとある求人をどれくらい評価したいか、ここで基準をそろえられるよ。
      </AssistantBubble>
      <MessageCard>
        <div className="flex flex-wrap gap-3">
          {quickBonus.map((count) => (
            <OptionChip
              key={count}
              active={bonus.a === count}
              label={`${count}回以上`}
              icon={<Gift className="size-4" />}
              onClick={() =>
                onBonusChange({
                  c: Math.max(count - 1, 1),
                  b: Math.max(count, 1),
                  a: count,
                  s: Math.min(count + 1, 6)
                })
              }
            />
          ))}
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <SliderRow label="Cランク下限" value={bonus.c} min={1} max={bonus.b - 1} unit="回" onChange={(value) => onBonusChange({ ...bonus, c: clamp(value, 1, bonus.b - 1) })} />
          <SliderRow label="Bランク下限" value={bonus.b} min={bonus.c + 1} max={bonus.a} unit="回" onChange={(value) => onBonusChange({ ...bonus, b: clamp(value, bonus.c + 1, bonus.a) })} />
          <SliderRow label="Aランク下限" value={bonus.a} min={bonus.b} max={bonus.s - 1} unit="回" onChange={(value) => onBonusChange({ ...bonus, a: clamp(value, bonus.b, bonus.s - 1) })} />
          <SliderRow label="Sランク下限" value={bonus.s} min={bonus.a + 1} max={6} unit="回" onChange={(value) => onBonusChange({ ...bonus, s: clamp(value, bonus.a + 1, 6) })} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-[#dcebd7] bg-white p-4">
            <p className="text-sm font-semibold text-[#5f6d76]">退職金あり</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["S", "A", "B"].map((rank) => (
                <OptionChip key={rank} active={retirement.withAllowance === rank} label={`ランク ${rank}`} icon={<ShieldCheck className="size-4" />} onClick={() => onRetirementChange({ ...retirement, withAllowance: rank })} />
              ))}
            </div>
          </div>
          <div className="rounded-[22px] border border-[#f1e1dc] bg-white p-4">
            <p className="text-sm font-semibold text-[#5f6d76]">退職金なし</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["C", "D", "E"].map((rank) => (
                <OptionChip key={rank} active={retirement.withoutAllowance === rank} label={`ランク ${rank}`} icon={<ShieldCheck className="size-4" />} onClick={() => onRetirementChange({ ...retirement, withoutAllowance: rank })} />
              ))}
            </div>
          </div>
        </div>
      </MessageCard>
      <UserBubble>{summarizeBonus(bonus)}。{summarizeRetirement(retirement)}</UserBubble>

      <AssistantBubble step="Q4">
        最後に、気になる条件や避けたい条件をタグで足そう。右側の「選択した条件」にそのまま並ぶよ。
      </AssistantBubble>
      <MessageCard>
        <div className="flex flex-wrap gap-3">
          {tagSuggestions.map((tag) => (
            <OptionChip key={tag} active={activeTemplateTags.includes(tag)} label={tag} icon={<Sparkles className="size-4" />} onClick={() => toggleTag(tag)} />
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-3 rounded-[22px] border border-[#e7ece1] bg-white p-4 sm:flex-row">
          <input
            value={customTag}
            onChange={(event) => setCustomTag(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addCustomTag();
              }
            }}
            placeholder="例: 通勤45分以内、住宅手当あり"
            className="flex-1 rounded-[16px] border border-[#dfe6da] px-4 py-3 text-sm font-semibold text-[#27313a] outline-none focus:border-[#1ea54c]"
          />
          <button type="button" onClick={addCustomTag} className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#1ea54c] px-5 text-sm font-bold text-white shadow-[0_16px_28px_-24px_rgba(30,165,76,0.8)]">
            条件を追加
          </button>
        </div>
      </MessageCard>
      <UserBubble>{summarizeTags(activeTemplateTags)}</UserBubble>
    </div>
  );
}
