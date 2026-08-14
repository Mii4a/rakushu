"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, Bookmark, ChevronDown, ChevronLeft, ChevronRight, Copy, Gift, Lock, MapPinned, ShieldCheck, Sparkles, TimerReset, TrendingUp, Briefcase } from "lucide-react";

import {
  clonePublicCriteriaAction,
  createPrivateCriteriaAction,
  recordCriteriaUseAction,
  saveChatCriteriaAction,
  savePublicCriteriaAction
} from "@/actions/criteria-actions";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import {
  CriteriaThresholdEditor,
  type AnnualHolidayState,
  type BonusState,
  type FixedOvertimeState,
  type RetirementState,
  summarizeAnnualHolidays,
  summarizeBonus,
  summarizeFixedOvertime,
  summarizeRetirement
} from "@/components/criteria/criteria-threshold-editor";
import rakushuBotWave from "../../../UI-mock/dashboard/icons/rakushu-bot-wave.png";
import rakumoAnalyticsThumbsUp from "../../../UI-mock/dashboard/character/rakumo-analytics-thumbs-up.png";

type PublicTemplateCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  selected: boolean;
  categoryLabel: string;
  categoryAccent: string;
  tags: string[];
  isSaved: boolean;
  isUsed: boolean;
  viewCount: number;
  saveCount: number;
  cloneCount: number;
  useCount: number;
};

type OwnedTemplateCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  selected: boolean;
  categoryLabel: string;
  categoryAccent: string;
  tags: string[];
};

type ScoreItem = {
  label: string;
  percentage: number;
  emphasis: string;
  icon: "timer" | "briefcase" | "sparkles" | "map" | "gift" | "shield" | "trend";
};

type CriteriaMockExperienceProps = {
  displayName: string;
  profileInitial: string;
  planLabel: string;
  activeTemplateTitle: string;
  activeTemplateDescription: string;
  activeTemplateCategory: string;
  activeTemplateCategoryLabel: string;
  activeTemplateCategoryAccent: string;
  activeTemplateTags: string[];
  publicTemplateCount: number;
  ownedTemplateCount: number;
  savedTemplateCount: number;
  usedTemplateCount: number;
  canBrowse: boolean;
  canCreatePrivate: boolean;
  canEditOwned: boolean;
  activeTemplateId: string | null;
  activeTemplateViewCount: number;
  activeTemplateSaveCount: number;
  activeTemplateCloneCount: number;
  activeTemplateUseCount: number;
  activeTemplateIsOwned: boolean;
  fixedOvertime: FixedOvertimeState;
  annualHolidays: AnnualHolidayState;
  bonus: BonusState;
  retirement: RetirementState;
  ownedFormDefaults: {
    templateId: string;
    title: string;
    description: string;
    category: string;
    tags: string;
  } | null;
  publicTemplates: PublicTemplateCard[];
  ownedTemplates: OwnedTemplateCard[];
  scoreItems: readonly ScoreItem[];
};

function SidebarFooter() {
  return (
    <>
      <div className="dashboard-sidebar-mock-promo dashboard-sidebar-mock-promo-cream">
        <div className="dashboard-sidebar-mock-speech">今日も一緒に<br />就活を進めよう！</div>
        <div className="dashboard-sidebar-mock-promo-character">
          <Image src={rakumoAnalyticsThumbsUp} alt="分析を応援するらくも" fill className="object-contain" sizes="140px" />
        </div>
      </div>

      <div className="dashboard-sidebar-mock-promo dashboard-sidebar-mock-promo-mint">
        <div className="dashboard-sidebar-mock-promo-stack">
          <p className="dashboard-sidebar-mock-promo-title">AIで希望に合う求人を</p>
          <p className="dashboard-sidebar-mock-promo-title">自動でおすすめ！</p>
          <Link href="/criteria" className="dashboard-sidebar-mock-promo-link">
            設定を見直す →
          </Link>
        </div>
        <div className="dashboard-sidebar-mock-mini-bot">
          <Image src={rakushuBotWave} alt="らくしゅうボット" fill className="object-contain" sizes="76px" />
        </div>
      </div>
    </>
  );
}

function SummaryCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-[30px] border border-[#e7ece1] bg-white p-6 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.16)]">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[1.7rem] font-black tracking-tight text-[#16181c]">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatTagsForForm(tags: string[]) {
  return tags.join("、");
}

const scoreIconMap = {
  timer: TimerReset,
  briefcase: Briefcase,
  sparkles: Sparkles,
  map: MapPinned,
  gift: Gift,
  shield: ShieldCheck,
  trend: TrendingUp
} as const;

function buildConditionChips({
  fixedOvertime,
  annualHolidays,
  bonus,
  retirement,
  tags
}: {
  fixedOvertime: FixedOvertimeState;
  annualHolidays: AnnualHolidayState;
  bonus: BonusState;
  retirement: RetirementState;
  tags: string[];
}) {
  return [
    `固定残業 ${fixedOvertime.b}時間以内重視`,
    `年間休日 ${annualHolidays.a}日以上`,
    `賞与 ${bonus.a}回以上`,
    `退職金あり ${retirement.withAllowance}`,
    `退職金なし ${retirement.withoutAllowance}`,
    ...tags
  ];
}

export function CriteriaMockExperience(props: CriteriaMockExperienceProps) {
  const [fixedOvertime, setFixedOvertime] = useState(props.fixedOvertime);
  const [annualHolidays, setAnnualHolidays] = useState(props.annualHolidays);
  const [bonus, setBonus] = useState(props.bonus);
  const [retirement, setRetirement] = useState(props.retirement);
  const [tags, setTags] = useState(props.activeTemplateTags.length > 0 ? props.activeTemplateTags : ["固定残業", "年間休日", "福利厚生"]);
  const popularTemplates = props.publicTemplates.slice(0, 5);
  const initialCarouselIndex = Math.max(0, popularTemplates.findIndex((template) => template.selected));
  const [carouselIndex, setCarouselIndex] = useState(initialCarouselIndex);
  const [carouselPaused, setCarouselPaused] = useState(false);

  useEffect(() => {
    if (popularTemplates.length < 2 || carouselPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setCarouselIndex((current) => (current + 1) % popularTemplates.length), 4200);
    return () => window.clearInterval(timer);
  }, [carouselPaused, popularTemplates.length]);

  useEffect(() => {
    setFixedOvertime(props.fixedOvertime);
    setAnnualHolidays(props.annualHolidays);
    setBonus(props.bonus);
    setRetirement(props.retirement);
    setTags(props.activeTemplateTags.length > 0 ? props.activeTemplateTags : ["固定残業", "年間休日", "福利厚生"]);
  }, [props.activeTemplateId, props.activeTemplateTags, props.annualHolidays, props.bonus, props.fixedOvertime, props.retirement]);

  const selectedConditionChips = useMemo(
    () => buildConditionChips({ fixedOvertime, annualHolidays, bonus, retirement, tags }),
    [annualHolidays, bonus, fixedOvertime, retirement, tags]
  );

  const saveTitle = props.ownedFormDefaults?.title?.trim() || `${props.activeTemplateTitle} を自分用に調整`;
  const saveDescription = props.ownedFormDefaults?.description?.trim() || props.activeTemplateDescription;
  const saveCategory = props.ownedFormDefaults?.category || props.activeTemplateCategory;
  const canPersistCurrentState = props.canEditOwned || props.canCreatePrivate;

  return (
    <section className="dashboard-frame dashboard-mock-frame">
      <div className="dashboard-mock-shell">
        <DashboardSidebar activeKey="criteria" note="" footerContent={<SidebarFooter />} showMobileToggle variant="mock" />

        <div className="dashboard-mock-content-shell">
          <header className="dashboard-mock-topbar">
            <div>
              <h1>チェック基準</h1>
              <p>他のユーザーの知恵を選んで使うか、自分だけの求人チェック基準を作成できます。</p>
            </div>
            <div className="dashboard-mock-topbar-actions">
              <button type="button" className="dashboard-mock-icon-button" aria-label="通知を見る">
                <Bell className="size-[1.35rem]" />
              </button>
              <div className="dashboard-mock-user-chip">
                <div className="dashboard-mock-user-avatar">
                  <span>{props.profileInitial}</span>
                </div>
                <span className="dashboard-mock-user-name">{props.displayName}</span>
                <ChevronDown className="dashboard-mock-user-chevron" />
              </div>
            </div>
          </header>

          {popularTemplates.length > 0 ? (
            <section
              role="region"
              aria-label="人気のチェック基準"
              className="mb-6 rounded-[26px] border border-[#e5e9e3] bg-white p-5 shadow-[0_18px_38px_-34px_rgba(15,23,42,.28)]"
              onMouseEnter={() => setCarouselPaused(true)}
              onMouseLeave={() => setCarouselPaused(false)}
              onFocusCapture={() => setCarouselPaused(true)}
              onBlurCapture={() => setCarouselPaused(false)}
            >
              <div className="flex items-center justify-between gap-4">
                <div><h2 className="text-lg font-black text-[#17191d]">人気の基準プリセット</h2><p className="mt-1 text-sm text-[#69727b]">多くの学生に使われている基準から、自分に近いものを選べます。</p></div>
                <div className="flex gap-2">
                  <button type="button" aria-label="前の基準" onClick={() => setCarouselIndex((current) => (current - 1 + popularTemplates.length) % popularTemplates.length)} className="flex size-10 items-center justify-center rounded-full border border-[#dce1dc] bg-white text-[#363c42]"><ChevronLeft className="size-5" /></button>
                  <button type="button" aria-label="次の基準" onClick={() => setCarouselIndex((current) => (current + 1) % popularTemplates.length)} className="flex size-10 items-center justify-center rounded-full border border-[#dce1dc] bg-white text-[#363c42]"><ChevronRight className="size-5" /></button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 gap-3 overflow-hidden md:grid-cols-3 lg:grid-cols-5">
                {popularTemplates.map((template, index) => {
                  const distance = Math.min(Math.abs(index - carouselIndex), popularTemplates.length - Math.abs(index - carouselIndex));
                  const active = distance === 0;
                  return (
                    <Link key={template.id} href={template.href} aria-current={active ? "true" : undefined} className={`flex min-h-[160px] flex-col justify-between rounded-[18px] border p-4 text-center transition-[transform,opacity,border-color,box-shadow] duration-500 motion-reduce:transition-none ${active ? "scale-[1.04] border-[#4b9b43] bg-[#fbfff9] opacity-100 shadow-[0_16px_30px_-24px_rgba(45,139,59,.55)]" : distance === 1 ? "scale-[.97] border-[#e1e5df] opacity-75" : "scale-[.93] border-[#e8ebe6] opacity-50"}`}>
                      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-[#eef7eb] text-[#2e8e39]"><Sparkles className="size-5" /></div>
                      <div><h3 className="font-black text-[#1b1f23]">{template.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#68717a]">{template.description}</p></div>
                      <p className="text-[11px] font-semibold text-[#899198]">約 {template.useCount.toLocaleString()} 人が利用</p>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-center gap-2">{popularTemplates.map((template, index) => <button key={template.id} type="button" aria-label={`${index + 1}番目の基準を表示`} onClick={() => setCarouselIndex(index)} className={`size-2 rounded-full ${index === carouselIndex ? "bg-[#318d3c]" : "bg-[#daddd9]"}`} />)}</div>
            </section>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <div className="space-y-6">
              <CriteriaThresholdEditor
                fixedOvertime={fixedOvertime}
                annualHolidays={annualHolidays}
                bonus={bonus}
                retirement={retirement}
                activeTemplateTags={tags}
                onFixedOvertimeChange={setFixedOvertime}
                onAnnualHolidaysChange={setAnnualHolidays}
                onBonusChange={setBonus}
                onRetirementChange={setRetirement}
                onTagsChange={setTags}
              />

              <section className="rounded-[30px] border border-[#e7ece1] bg-white p-6 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.16)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[1.35rem] font-black text-[#15191d]">基準テンプレート</p>
                    <p className="mt-2 text-sm leading-7 text-[#66717c]">公開基準を下敷きにするか、自分用基準を育てるかをここで切り替えられます。</p>
                  </div>
                  {props.canCreatePrivate ? (
                    <form action={createPrivateCriteriaAction}>
                      <button type="submit" className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#1ea54c] px-5 text-sm font-bold text-white shadow-[0_16px_28px_-24px_rgba(30,165,76,0.8)]">
                        <Sparkles className="mr-2 size-4" />
                        新しく自分用基準を作る
                      </button>
                    </form>
                  ) : null}
                </div>

                {props.canBrowse ? (
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {props.publicTemplates.map((template) => (
                      <article key={template.id} className={`rounded-[24px] border p-5 transition ${template.selected ? "border-[#22a33a] bg-[#fcfff9] shadow-[0_16px_32px_-28px_rgba(34,163,58,0.3)]" : "border-[#e7ece1] bg-white"}`}>
                        <Link href={template.href} className="block">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[1.15rem] font-black text-[#17191d]">{template.title}</p>
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${template.categoryAccent}`}>{template.categoryLabel}</span>
                              </div>
                              <p className="mt-2 text-sm leading-7 text-[#66717c]">{template.description}</p>
                            </div>
                            <ChevronRight className="mt-1 size-5 shrink-0 text-[#95a1aa]" />
                          </div>
                        </Link>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {template.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="rounded-full border border-[#dbe4d5] bg-white px-3 py-1 text-xs font-semibold text-[#53616a]">{tag}</span>
                          ))}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <form action={savePublicCriteriaAction.bind(null, template.id)}>
                            <button type="submit" className={`inline-flex h-10 items-center justify-center rounded-[14px] px-4 text-sm font-bold ${template.isSaved ? "bg-[#1ea54c] text-white" : "border border-[#dfe6da] bg-white text-[#4f5a63]"}`}>
                              <Bookmark className="mr-2 size-4" />
                              {template.isSaved ? "保存済み" : "保存する"}
                            </button>
                          </form>
                          <form action={clonePublicCriteriaAction.bind(null, template.id)}>
                            <button type="submit" className="inline-flex h-10 items-center justify-center rounded-[14px] border border-[#dfe6da] bg-white px-4 text-sm font-bold text-[#4f5a63]">
                              <Copy className="mr-2 size-4" />
                              自分用にコピー
                            </button>
                          </form>
                          <form action={recordCriteriaUseAction.bind(null, template.id)}>
                            <button type="submit" className={`inline-flex h-10 items-center justify-center rounded-[14px] border px-4 text-sm font-bold ${template.isUsed ? "border-[#cfe7d4] bg-[#f6fff7] text-[#1a9b37]" : "border-[#dfe6da] bg-white text-[#4f5a63]"}`}>
                              <Sparkles className="mr-2 size-4" />
                              {template.isUsed ? "利用中" : "利用を記録"}
                            </button>
                          </form>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-[#efdba2] bg-[#fff9e9] px-5 py-5 text-sm leading-7 text-[#8a6619]">
                    公開基準の閲覧・保存・複製は Starter プラン以上で利用できます。
                  </div>
                )}

                {props.ownedTemplates.length > 0 ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {props.ownedTemplates.map((template) => (
                      <article key={template.id} className={`rounded-[24px] border p-5 transition ${template.selected ? "border-[#22a33a] bg-[#fcfff9]" : "border-[#e7ece1] bg-white"}`}>
                        <Link href={template.href} className="block">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[1.08rem] font-black text-[#17191d]">{template.title}</p>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${template.categoryAccent}`}>{template.categoryLabel}</span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-[#66717c]">{template.description}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {template.tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="rounded-full border border-[#dbe4d5] bg-white px-3 py-1 text-xs font-semibold text-[#53616a]">{tag}</span>
                            ))}
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>

            <aside className="space-y-5">
              <SummaryCard
                title="選択した条件"
                action={<span className="inline-flex items-center gap-2 text-sm font-bold text-[#5c6771]"><Sparkles className="size-4" />編集</span>}
              >
                <div className="flex flex-wrap gap-3">
                  {selectedConditionChips.map((chip) => (
                    <span key={chip} className="inline-flex items-center rounded-full border border-[#d7e8d8] bg-[#fbfff8] px-3 py-2 text-sm font-semibold text-[#385248]">
                      {chip}
                    </span>
                  ))}
                </div>
              </SummaryCard>

              <SummaryCard title="スコアにどう反映される？">
                <div className="space-y-5">
                  {props.scoreItems.map((item) => {
                    const Icon = scoreIconMap[item.icon];
                    return (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-[#f4faf1] text-[#209e3b]">
                              <Icon className="size-4.5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-[#1d2328]">{item.label}</p>
                              <p className="text-xs font-semibold text-[#738089]">{item.emphasis}</p>
                            </div>
                          </div>
                          <span className="text-[1.1rem] font-black text-[#24292f]">{item.percentage}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#edf1ea]">
                          <div className="h-2 rounded-full bg-[#209e3b]" style={{ width: `${item.percentage * 4}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SummaryCard>

              <section className="overflow-hidden rounded-[30px] border border-[#dcead8] bg-[linear-gradient(180deg,#fcfff9_0%,#f2faf0_100%)] p-5 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.16)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="max-w-[15rem]">
                    <p className="text-[1.75rem] font-black text-[#17191d]">いい感じ！</p>
                    <p className="mt-3 text-sm leading-8 text-[#5f6d76]">条件を入れるほど、ぴったり求人を探しやすくなるよ〜</p>
                  </div>
                  <div className="relative h-28 w-28 shrink-0">
                    <Image src={rakumoAnalyticsThumbsUp} alt="応援するらくも" fill className="object-contain" sizes="112px" />
                  </div>
                </div>
              </section>

              <form action={saveChatCriteriaAction} className="space-y-4">
                <input type="hidden" name="targetTemplateId" value={props.activeTemplateIsOwned ? props.activeTemplateId ?? "" : ""} />
                <input type="hidden" name="sourceTemplateId" value={!props.activeTemplateIsOwned ? props.activeTemplateId ?? "" : ""} />
                <input type="hidden" name="title" value={saveTitle} />
                <input type="hidden" name="description" value={saveDescription} />
                <input type="hidden" name="category" value={saveCategory} />
                <input type="hidden" name="tags" value={formatTagsForForm(tags)} />
                <input type="hidden" name="overtimeAMaxHours" value={fixedOvertime.a} />
                <input type="hidden" name="overtimeBMaxHours" value={fixedOvertime.b} />
                <input type="hidden" name="overtimeCMaxHours" value={fixedOvertime.c} />
                <input type="hidden" name="overtimeDMaxHours" value={fixedOvertime.d} />
                <input type="hidden" name="holidaySMinDays" value={annualHolidays.s} />
                <input type="hidden" name="holidayAMinDays" value={annualHolidays.a} />
                <input type="hidden" name="holidayBMinDays" value={annualHolidays.b} />
                <input type="hidden" name="holidayCMinDays" value={annualHolidays.c} />
                <input type="hidden" name="holidayDMinDays" value={annualHolidays.d} />
                <input type="hidden" name="bonusSMinCount" value={bonus.s} />
                <input type="hidden" name="bonusAMinCount" value={bonus.a} />
                <input type="hidden" name="bonusBMinCount" value={bonus.b} />
                <input type="hidden" name="bonusCMinCount" value={bonus.c} />
                <input type="hidden" name="retirementWithAllowanceRank" value={retirement.withAllowance} />
                <input type="hidden" name="retirementWithoutAllowanceRank" value={retirement.withoutAllowance} />

                <button
                  type="submit"
                  disabled={!canPersistCurrentState}
                  className="inline-flex h-14 w-full items-center justify-center rounded-[18px] bg-[#198f31] px-4 text-lg font-bold text-white shadow-[0_18px_30px_-24px_rgba(25,143,49,0.88)] disabled:cursor-not-allowed disabled:bg-[#b8c6b8]"
                >
                  保存する
                </button>
              </form>

              {!canPersistCurrentState ? (
                <Link href="/pricing" className="inline-flex h-14 w-full items-center justify-center rounded-[18px] border border-[#e4d3ab] bg-[#fff7e4] px-4 text-base font-bold text-[#8b6617]">
                  <Lock className="mr-2 size-4" />
                  保存には Plus プラン以上が必要です
                </Link>
              ) : null}

              <Link href="/jobs" className="inline-flex h-14 w-full items-center justify-center rounded-[18px] border border-[#1d9637] bg-white px-4 text-lg font-bold text-[#1d9637]">
                おすすめ求人を見る
              </Link>

              <SummaryCard title="今の会話の要約">
                <div className="space-y-3 text-sm leading-7 text-[#5d6972]">
                  <p>{summarizeFixedOvertime(fixedOvertime)}</p>
                  <p>{summarizeAnnualHolidays(annualHolidays)}</p>
                  <p>{summarizeBonus(bonus)}</p>
                  <p>{summarizeRetirement(retirement)}</p>
                  <p>タグ: {tags.join(" / ")}</p>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-center">
                    <div className="rounded-[18px] bg-[#f8fbf6] px-3 py-4"><p className="text-xs font-semibold text-[#71808a]">閲覧</p><p className="mt-2 text-[1.45rem] font-black text-[#17191d]">{props.activeTemplateViewCount}</p></div>
                    <div className="rounded-[18px] bg-[#f8fbf6] px-3 py-4"><p className="text-xs font-semibold text-[#71808a]">保存</p><p className="mt-2 text-[1.45rem] font-black text-[#17191d]">{props.activeTemplateSaveCount}</p></div>
                    <div className="rounded-[18px] bg-[#f8fbf6] px-3 py-4"><p className="text-xs font-semibold text-[#71808a]">複製</p><p className="mt-2 text-[1.45rem] font-black text-[#17191d]">{props.activeTemplateCloneCount}</p></div>
                    <div className="rounded-[18px] bg-[#f8fbf6] px-3 py-4"><p className="text-xs font-semibold text-[#71808a]">利用</p><p className="mt-2 text-[1.45rem] font-black text-[#17191d]">{props.activeTemplateUseCount}</p></div>
                  </div>
                </div>
              </SummaryCard>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
