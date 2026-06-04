"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  FileCheck2,
  Home,
  Inbox,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Zap,
  type LucideIcon
} from "lucide-react";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import bag from "../../../UI-mock/dashboard/icons/bag.png";
import calendarOrange from "../../../UI-mock/dashboard/icons/calender-orange.png";
import documentCheckBlue from "../../../UI-mock/dashboard/icons/document-check-blue.png";
import interviewMeeting from "../../../UI-mock/dashboard/icons/interview-meeting.png";
import rakushuBotWave from "../../../UI-mock/dashboard/icons/rakushu-bot-wave.png";
import verifiedBadgeRed from "../../../UI-mock/dashboard/icons/verified-badge-red.png";
import rakumoAnalyticsThumbsUp from "../../../UI-mock/dashboard/character/rakumo-analytics-thumbs-up.png";
import rakumoIdeaGuide from "../../../UI-mock/dashboard/character/rakumo-idea-guide.png";

type KpiTone = "green" | "blue" | "orange" | "red";
type RecommendTone = "green" | "blue" | "orange";
type ActivityTone = "green" | "blue" | "orange";

type DashboardMockExperienceProps = {
  displayName: string;
  avatarUrl: string | null;
  analysisLabel: string;
  analysisCount: number;
  analysisLimit: number;
  planLabel: string;
  summaryCards: Array<{
    key: string;
    label: string;
    value: string;
    note: string;
    tone: KpiTone;
    icon: "briefcase" | "document" | "interview" | "verified";
  }>;
  progressPercent: number;
  progressMessage: string;
  progressSubtext: string;
  progressItems: Array<{
    key: string;
    label: string;
    value: number;
    tone: "green" | "mint" | "yellow" | "orange" | "red";
  }>;
  trendPoints: number[];
  trendLabels: string[];
  todoItems: Array<{
    id: string;
    title: string;
    note: string;
  }>;
  skillMatches: Array<{
    id: string;
    label: string;
    score: number;
  }>;
  recommendedJobs: Array<{
    id: string;
    company: string;
    title: string;
    salary: string;
    location: string;
    tags: string[];
    badge: string;
    badgeTone: RecommendTone;
    href: string;
  }>;
  recentActivities: Array<{
    id: string;
    title: string;
    timestamp: string;
    badge?: string;
    tone: ActivityTone;
  }>;
  nextStepTitle: string;
  nextStepBody: string;
  nextStepHref: string;
  nextStepLabel: string;
};

type DashboardNavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

const dashboardSidebarItems: DashboardNavItem[] = [
  { key: "dashboard", label: "ダッシュボード", icon: Home, href: "/dashboard" },
  { key: "jobs", label: "求人一覧", icon: BriefcaseBusiness, href: "/jobs" },
  { key: "saved-jobs", label: "保存した求人", icon: Inbox, href: "/jobs" },
  { key: "applications", label: "応募管理", icon: FileCheck2, href: "/jobs" },
  { key: "plan-settings", label: "プラン・条件設定", icon: CreditCard, href: "/criteria" },
  { key: "ai-report", label: "AI分析・レポート", icon: TrendingUp, href: "/dashboard" },
  { key: "settings", label: "設定", icon: Settings, href: "/settings" }
];

const progressIcons: Record<string, LucideIcon> = {
  search: Search,
  apply: Send,
  documents: FileCheck2,
  interview: BriefcaseBusiness,
  offer: ShieldCheck
};

const toneClassName: Record<KpiTone, string> = {
  green: "dashboard-mock-kpi-green",
  blue: "dashboard-mock-kpi-blue",
  orange: "dashboard-mock-kpi-orange",
  red: "dashboard-mock-kpi-red"
};

const recommendToneClassName: Record<RecommendTone, string> = {
  green: "dashboard-mock-recommend-badge-green",
  blue: "dashboard-mock-recommend-badge-blue",
  orange: "dashboard-mock-recommend-badge-orange"
};

const activityToneClassName: Record<ActivityTone, string> = {
  green: "dashboard-mock-activity-green",
  blue: "dashboard-mock-activity-blue",
  orange: "dashboard-mock-activity-orange"
};

const progressBarToneClassName: Record<DashboardMockExperienceProps["progressItems"][number]["tone"], string> = {
  green: "dashboard-mock-progress-bar-green",
  mint: "dashboard-mock-progress-bar-mint",
  yellow: "dashboard-mock-progress-bar-yellow",
  orange: "dashboard-mock-progress-bar-orange",
  red: "dashboard-mock-progress-bar-red"
};

function getKpiIcon(icon: DashboardMockExperienceProps["summaryCards"][number]["icon"]): StaticImageData {
  switch (icon) {
    case "briefcase":
      return bag;
    case "document":
      return documentCheckBlue;
    case "interview":
      return interviewMeeting;
    case "verified":
      return verifiedBadgeRed;
  }
}

function ProgressRing({ value, displayValue }: { value: number; displayValue: number }) {
  return (
    <div
      className="dashboard-mock-progress-ring"
      style={{
        background: `conic-gradient(#2fb348 ${value * 3.6}deg, #e8ecef ${value * 3.6}deg 360deg)`
      }}
      aria-label={`進捗 ${displayValue}%`}
    >
      <div className="dashboard-mock-progress-ring-inner">
        <span className="dashboard-mock-progress-ring-value">{displayValue}</span>
        <span className="dashboard-mock-progress-ring-percent">%</span>
      </div>
    </div>
  );
}

function MiniLineChart({ points, labels, animated }: { points: number[]; labels: string[]; animated: boolean }) {
  const safePoints = points.length > 0 ? points : [0, 0, 0, 0, 0, 0];
  const safeLabels = labels.length > 0 ? labels : ["-", "-", "-", "-", "-", "-"];
  const width = 460;
  const height = 210;
  const padX = 28;
  const padY = 18;
  const maxPoint = Math.max(...safePoints, 4);

  const coordinates = safePoints.map((point, index) => {
    const x = padX + (index * (width - padX * 2)) / Math.max(safePoints.length - 1, 1);
    const y = height - padY - (point / maxPoint) * (height - padY * 2);
    return { x, y, point };
  });

  const linePath = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const fillPath = `${linePath} L${coordinates[coordinates.length - 1]?.x ?? width},${height - padY} L${coordinates[0]?.x ?? 0},${height - padY} Z`;
  const axisTicks = [0, 5, 10, 15, 20].map((tick) => ({
    label: tick,
    y: height - padY - (tick / 20) * (height - padY * 2)
  }));

  return (
    <div className="dashboard-mock-chart-shell">
      <div className="dashboard-mock-chart-axis-labels" aria-hidden="true">
        {axisTicks.map((tick) => (
          <span key={tick.label} style={{ top: tick.y - 8 }}>
            {tick.label}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="dashboard-mock-chart-svg" aria-label="応募状況の推移">
        <defs>
          <linearGradient id="chartAreaGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(39, 173, 69, 0.14)" />
            <stop offset="100%" stopColor="rgba(39, 173, 69, 0.02)" />
          </linearGradient>
        </defs>
        {axisTicks.map((tick) => (
          <line
            key={tick.label}
            x1={padX}
            y1={tick.y}
            x2={width - padX}
            y2={tick.y}
            className="dashboard-mock-chart-grid"
          />
        ))}
        <path d={fillPath} className={`dashboard-mock-chart-fill ${animated ? "dashboard-mock-chart-fill-animated" : ""}`} />
        <path d={linePath} className={`dashboard-mock-chart-line ${animated ? "dashboard-mock-chart-line-animated" : ""}`} />
        {coordinates.map((point, index) => (
          <g key={`${point.x}-${point.y}`} className={animated ? "dashboard-mock-chart-point-group-animated" : ""}>
            <circle cx={point.x} cy={point.y} r="5" className="dashboard-mock-chart-point" />
            {index === coordinates.length - 1 ? (
              <foreignObject x={point.x - 28} y={point.y - 70} width="102" height="58">
                <div className="dashboard-mock-chart-tooltip">
                  <span>{safeLabels[index] ?? "最新"}</span>
                  <strong>応募数 {point.point}件</strong>
                </div>
              </foreignObject>
            ) : null}
          </g>
        ))}
      </svg>
      <div className="dashboard-mock-chart-label-row">
        {safeLabels.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function splitKpiValue(value: string) {
  const match = value.match(/^(\d+)(.*)$/);
  if (!match) {
    return { main: value, unit: "" };
  }

  return {
    main: match[1],
    unit: match[2].trim()
  };
}

function getSkillIconClassName(label: string) {
  if (label.toLowerCase() === "python") return "dashboard-mock-skill-icon dashboard-mock-skill-icon-python";
  if (label.toLowerCase() === "aws") return "dashboard-mock-skill-icon dashboard-mock-skill-icon-aws";
  if (label.toLowerCase() === "go") return "dashboard-mock-skill-icon dashboard-mock-skill-icon-go";
  return "dashboard-mock-skill-icon";
}

function getSkillIconLabel(label: string) {
  if (label.toLowerCase() === "python") return "Py";
  if (label.toLowerCase() === "aws") return "aws";
  if (label.toLowerCase() === "go") return "Go";
  return label.slice(0, 2);
}

function getRecommendLogoClassName(index: number) {
  return `dashboard-mock-recommend-logo dashboard-mock-recommend-logo-${index + 1}`;
}

function getRecommendLogo(index: number) {
  if (index === 1) return "◐";
  if (index === 2) return "▥";
  return "◒";
}

function getRevealStyle(index: number): CSSProperties {
  return { ["--reveal-delay" as string]: `${index * 70}ms` };
}

export function DashboardMockExperience(props: DashboardMockExperienceProps) {
  const profileInitial = props.displayName.slice(0, 1) || "山";
  const visibleTodoItems = props.todoItems.slice(0, 4);
  const visibleSkillItems = props.skillMatches.slice(0, 3);
  const visibleRecommendedJobs = props.recommendedJobs.slice(0, 3);
  const visibleActivities = props.recentActivities.slice(0, 3);

  const [isReady, setIsReady] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [completedTodoIds, setCompletedTodoIds] = useState<string[]>([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduceMotion = mediaQuery.matches;
    setIsReady(true);

    if (reduceMotion) {
      setAnimatedProgress(props.progressPercent);
      return;
    }

    let animationFrame = 0;
    const start = window.performance.now();
    const duration = 700;

    const animate = (timestamp: number) => {
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedProgress(Math.round(props.progressPercent * eased));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [props.progressPercent]);

  const completedTodoCount = completedTodoIds.length;
  const todoCompletionPercent = visibleTodoItems.length > 0 ? Math.round((completedTodoCount / visibleTodoItems.length) * 100) : 0;
  const focusStats = [
    {
      key: "plan",
      label: "利用プラン",
      value: props.planLabel,
      helper: "使える機能の範囲",
      icon: CreditCard
    },
    {
      key: "analysis",
      label: props.analysisLabel,
      value: `${props.analysisCount} / ${props.analysisLimit}`,
      helper: "使い切る前に優先度を付ける",
      icon: TrendingUp
    },
    {
      key: "todo",
      label: "今日の前進",
      value: `${completedTodoCount}/${visibleTodoItems.length || 0}`,
      helper: completedTodoCount > 0 ? "小さい完了を積む" : "まずは 1 件だけ触る",
      icon: CheckCircle2
    }
  ];

  const sidebarFooter = useMemo(
    () => (
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
    ),
    []
  );

  return (
    <section className={`dashboard-frame dashboard-mock-frame ${isReady ? "dashboard-mock-ready" : ""}`}>
      <div className="dashboard-mock-shell">
        <DashboardSidebar activeKey="dashboard" note="" items={dashboardSidebarItems} footerContent={sidebarFooter} showMobileToggle variant="mock" />

        <div className="dashboard-mock-content-shell">
          <header className="dashboard-mock-topbar dashboard-mock-reveal" style={getRevealStyle(0)}>
            <div>
              <h1>ダッシュボード</h1>
              <p>あなたの活動状況を一目で確認できます。</p>
            </div>
            <div className="dashboard-mock-topbar-actions">
              <button type="button" className="dashboard-mock-icon-button dashboard-mock-notification-button" aria-label="通知を見る">
                <Bell className="size-[1.35rem]" />
                <span className="dashboard-mock-notification-dot" />
              </button>
              <div className="dashboard-mock-user-chip">
                <div className="dashboard-mock-user-avatar">
                  {props.avatarUrl ? (
                    <Image src={props.avatarUrl} alt={`${props.displayName}のプロフィール画像`} fill className="object-cover" sizes="40px" />
                  ) : (
                    <span>{profileInitial}</span>
                  )}
                </div>
                <span className="dashboard-mock-user-name">{props.displayName} さん</span>
                <ChevronDown className="dashboard-mock-user-chevron" />
              </div>
              <Link href="/jobs/new" className="dashboard-mock-primary-button">
                <span className="dashboard-mock-primary-button-plus">＋</span>
                求人を探す
              </Link>
            </div>
          </header>

          <section className="dashboard-mock-focus-panel dashboard-mock-reveal" style={getRevealStyle(1)}>
            <div className="dashboard-mock-focus-copy">
              <div className="dashboard-mock-focus-kicker-row">
                <span className="dashboard-mock-focus-kicker">今日のガイド</span>
                <span className="dashboard-mock-focus-pill">
                  <Zap className="size-3.5" />
                  迷いを減らす
                </span>
              </div>
              <h2>{props.nextStepTitle}</h2>
              <p>{props.nextStepBody}</p>
              <div className="dashboard-mock-focus-actions">
                <Link href={props.nextStepHref} className="dashboard-mock-primary-button dashboard-mock-primary-button-inline">
                  {props.nextStepLabel}
                  <ArrowRight className="size-4" />
                </Link>
                <span className="dashboard-mock-focus-support-copy">全部まとめてではなく、まずは 1 件進めれば十分です。</span>
              </div>
            </div>
            <div className="dashboard-mock-focus-stats">
              {focusStats.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="dashboard-mock-focus-stat dashboard-mock-interactive" style={getRevealStyle(index + 2)}>
                    <div className="dashboard-mock-focus-stat-icon">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="dashboard-mock-focus-stat-label">{item.label}</p>
                      <p className="dashboard-mock-focus-stat-value">{item.value}</p>
                      <p className="dashboard-mock-focus-stat-helper">{item.helper}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="dashboard-mock-main-grid">
            <div className="dashboard-mock-primary-column">
              <section className="dashboard-mock-kpi-grid">
                {props.summaryCards.map((card, index) => {
                  const value = splitKpiValue(card.value);
                  return (
                    <article key={card.key} className="dashboard-mock-kpi-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(index + 2)}>
                      <div className={`dashboard-mock-kpi-icon ${toneClassName[card.tone]}`}>
                        <Image src={getKpiIcon(card.icon)} alt="" width={60} height={60} />
                      </div>
                      <div className="dashboard-mock-kpi-copy">
                        <p className="dashboard-mock-kpi-label">{card.label}</p>
                        <p className="dashboard-mock-kpi-value">
                          <span>{value.main}</span>
                          {value.unit ? <span className="dashboard-mock-kpi-unit">{value.unit}</span> : null}
                        </p>
                        <p className="dashboard-mock-kpi-note">{card.note}</p>
                      </div>
                    </article>
                  );
                })}
              </section>

              <div className="dashboard-mock-analytics-grid">
                <section className="dashboard-mock-surface-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(6)}>
                  <div className="dashboard-mock-card-heading">
                    <h2>活動の進捗</h2>
                  </div>
                  <div className="dashboard-mock-progress-layout">
                    <div className="dashboard-mock-progress-side">
                      <ProgressRing value={animatedProgress} displayValue={animatedProgress} />
                      <div className="dashboard-mock-progress-side-copy">
                        <p className="dashboard-mock-progress-message">{props.progressMessage}</p>
                        <p className="dashboard-mock-progress-subtext">{props.progressSubtext}</p>
                      </div>
                    </div>
                    <div className="dashboard-mock-progress-bars">
                      {props.progressItems.map((item) => {
                        const Icon = progressIcons[item.key] ?? Search;
                        return (
                          <div key={item.key} className="dashboard-mock-progress-row">
                            <div className="dashboard-mock-progress-row-label">
                              <Icon className="dashboard-mock-progress-icon" />
                              <span>{item.label}</span>
                            </div>
                            <div className="dashboard-mock-progress-row-track">
                              <div
                                className={`dashboard-mock-progress-row-fill ${progressBarToneClassName[item.tone]}`}
                                style={{ width: `${isReady ? item.value : 0}%` }}
                              />
                            </div>
                            <span className="dashboard-mock-progress-row-value">{item.value}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>

                <section className="dashboard-mock-surface-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(7)}>
                  <div className="dashboard-mock-card-heading dashboard-mock-card-heading-between">
                    <h2>応募状況の推移</h2>
                    <span className="dashboard-mock-inline-chip">直近6週間 ▾</span>
                  </div>
                  <MiniLineChart points={props.trendPoints} labels={props.trendLabels} animated={isReady} />
                </section>
              </div>

              <section className="dashboard-mock-surface-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(8)}>
                <div className="dashboard-mock-card-heading dashboard-mock-card-heading-between">
                  <h2>おすすめ求人</h2>
                  <Link href="/jobs" className="dashboard-mock-text-link">
                    もっと見る →
                  </Link>
                </div>
                <div className="dashboard-mock-recommend-grid">
                  {visibleRecommendedJobs.map((job, index) => (
                    <Link key={job.id} href={job.href} className="dashboard-mock-recommend-card dashboard-mock-interactive">
                      <span className={`dashboard-mock-recommend-badge ${recommendToneClassName[job.badgeTone]}`}>{job.badge}</span>
                      <div className="dashboard-mock-recommend-company-row">
                        <div className={getRecommendLogoClassName(index)}>
                          <span>{getRecommendLogo(index)}</span>
                        </div>
                        <p>{job.company}</p>
                      </div>
                      <h3>{job.title}</h3>
                      <p className="dashboard-mock-recommend-salary">{job.salary}</p>
                      <p className="dashboard-mock-recommend-location">◉ {job.location}</p>
                      <div className="dashboard-mock-tag-row">
                        {job.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="dashboard-mock-tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <div className="dashboard-mock-bottom-grid">
                <section className="dashboard-mock-surface-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(9)}>
                  <div className="dashboard-mock-card-heading">
                    <h2>最近の活動</h2>
                  </div>
                  <div className="dashboard-mock-activity-list">
                    {visibleActivities.map((activity) => (
                      <article key={activity.id} className="dashboard-mock-activity-row dashboard-mock-interactive">
                        <div className={`dashboard-mock-activity-icon ${activityToneClassName[activity.tone]}`}>
                          <Sparkles className="size-[0.95rem]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="dashboard-mock-activity-title">{activity.title}</p>
                          {activity.badge ? <span className="dashboard-mock-activity-badge">{activity.badge}</span> : null}
                        </div>
                        <span className="dashboard-mock-activity-time">{activity.timestamp}</span>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <aside className="dashboard-mock-right-rail">
              <section className="dashboard-mock-surface-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(10)}>
                <div className="dashboard-mock-card-heading dashboard-mock-card-heading-between">
                  <h2>今日のToDo</h2>
                  <span className="dashboard-mock-inline-chip dashboard-mock-inline-chip-soft">
                    <Clock3 className="size-3.5" />
                    完了 {completedTodoCount}/{visibleTodoItems.length || 0}
                  </span>
                </div>
                <div className="dashboard-mock-mini-progress">
                  <div className="dashboard-mock-mini-progress-track">
                    <div className="dashboard-mock-mini-progress-fill" style={{ width: `${isReady ? todoCompletionPercent : 0}%` }} />
                  </div>
                  <p>{todoCompletionPercent}% 進行</p>
                </div>
                <div className="dashboard-mock-todo-list">
                  {visibleTodoItems.map((item) => {
                    const checked = completedTodoIds.includes(item.id);
                    return (
                      <label key={item.id} className={`dashboard-mock-todo-row dashboard-mock-interactive ${checked ? "dashboard-mock-todo-row-checked" : ""}`}>
                        <input
                          type="checkbox"
                          aria-label={item.title}
                          checked={checked}
                          onChange={() => {
                            setCompletedTodoIds((current) =>
                              current.includes(item.id) ? current.filter((todoId) => todoId !== item.id) : [...current, item.id]
                            );
                          }}
                        />
                        <div>
                          <p className="dashboard-mock-todo-title">{item.title}</p>
                          <p className="dashboard-mock-todo-note">
                            <Image src={calendarOrange} alt="" width={12} height={12} />
                            {item.note}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <Link href={props.nextStepHref} className="dashboard-mock-center-link">
                  すべてのToDoを見る →
                </Link>
              </section>

              <section className="dashboard-mock-surface-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(11)}>
                <div className="dashboard-mock-card-heading dashboard-mock-card-heading-between">
                  <h2>スキルマッチ度トップ3</h2>
                  <Link href="/jobs" className="dashboard-mock-text-link">
                    もっと見る →
                  </Link>
                </div>
                <div className="dashboard-mock-skill-list">
                  {visibleSkillItems.map((item) => (
                    <div key={item.id} className="dashboard-mock-skill-row">
                      <div className="dashboard-mock-skill-label-row">
                        <div className={getSkillIconClassName(item.label)}>{getSkillIconLabel(item.label)}</div>
                        <span>{item.label}</span>
                      </div>
                      <div className="dashboard-mock-skill-track">
                        <div className="dashboard-mock-skill-fill" style={{ width: `${isReady ? item.score : 0}%` }} />
                      </div>
                      <span className="dashboard-mock-skill-score">{item.score}%</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="dashboard-mock-surface-card dashboard-mock-advice-card dashboard-mock-reveal dashboard-mock-interactive" style={getRevealStyle(12)}>
                <div className="dashboard-mock-card-heading dashboard-mock-card-heading-between">
                  <h2>AIからのアドバイス</h2>
                  <span className="dashboard-mock-advice-bulb">💡</span>
                </div>
                <div className="dashboard-mock-advice-content">
                  <div className="dashboard-mock-advice-copy">
                    <p>{props.nextStepTitle}</p>
                    <p className="dashboard-mock-advice-subtext">{props.nextStepBody}</p>
                    <Link href={props.nextStepHref} className="dashboard-mock-advice-button">
                      {props.nextStepLabel}
                    </Link>
                  </div>
                  <div className="dashboard-mock-advice-visual">
                    <Image src={rakumoIdeaGuide} alt="アドバイスするらくも" fill className="object-contain" sizes="180px" />
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
