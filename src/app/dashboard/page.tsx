import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, CreditCard, Layers3, Plus } from "lucide-react";

import { getSession } from "@/lib/auth/session";
import type { ParsedJob } from "@/lib/analysis";
import { db } from "@/lib/db/client";
import { jobAnalyses, jobs } from "@/lib/db/schema";

function formatHours(value: number) {
  const hours = Math.trunc(value);
  const minutes = Math.round((value - hours) * 60);
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}

function formatRankDetail(label: string, parsed: ParsedJob | null) {
  if (!parsed) return "値なし";

  if (label === "総合") {
    const warningCount = parsed.warnings.value?.length ?? 0;
    return warningCount > 0 ? `警告 ${warningCount}件` : "警告なし";
  }

  if (label === "固定残業") {
    if (parsed.fixedOvertimeHours.status === "none") return "固定残業なし";
    if (parsed.fixedOvertimeHours.value == null) return "時間不明";
    return formatHours(parsed.fixedOvertimeHours.value);
  }

  if (label === "年間休日") {
    return parsed.annualHolidays.value != null ? `${parsed.annualHolidays.value}日` : "日数不明";
  }

  if (label === "休日制度") {
    return parsed.holidayType.value ?? "制度不明";
  }

  if (label === "福利厚生") {
    const count = parsed.benefits.value?.length ?? 0;
    if (count === 0) return "項目なし";
    return `${count}項目`;
  }

  return "値なし";
}

function renderRankBadge(label: string, rank: string | null | undefined, detail: string) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-950">{rank ?? "UNKNOWN"}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  const recentJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, session.user.id),
    orderBy: [desc(jobs.createdAt)],
    limit: 6,
    with: {
      analyses: {
        orderBy: [desc(jobAnalyses.createdAt)],
        limit: 1
      }
    }
  });

  const totalJobs = recentJobs.length;
  const latestAnalysisCount = recentJobs.filter((job) => job.analyses[0]).length;
  const criticalWarnings = recentJobs.reduce((count, job) => {
    const latest = job.analyses[0];
    if (!latest?.evidenceJson) return count;
    const parsed = JSON.parse(latest.evidenceJson) as ParsedJob;
    return count + (parsed.warnings.value?.length ?? 0);
  }, 0);

  return (
    <section className="page-stack">
      <div className="page-hero page-hero-split">
        <div className="space-y-5">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1 className="page-title">こんにちは、{session.user.name} さん</h1>
            <p className="page-copy mt-3">
              直近の求人評価、警告数、判断基準へのアクセスを同じ面で扱えるようにしました。まずは新しい求人を1件入れて、ランクの出方と警告の傾向を確認できます。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/jobs/new" className="button-primary">
              <Plus className="size-4" />
              求人を解析する
            </Link>
            <Link href="/jobs" className="button-secondary">
              <BriefcaseBusiness className="size-4" />
              求人一覧
            </Link>
            <Link href="/criteria" className="button-secondary">
              <Layers3 className="size-4" />
              みんなの基準
            </Link>
            <Link href="/pricing" className="button-secondary">
              <CreditCard className="size-4" />
              料金とプラン
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="metric-tile">
            <p className="metric-label">表示中の最近の求人</p>
            <p className="metric-value">{totalJobs}</p>
            <p className="metric-note">最新6件をダッシュボードに表示しています。</p>
          </div>
          <div className="metric-tile">
            <p className="metric-label">解析済み</p>
            <p className="metric-value">{latestAnalysisCount}</p>
            <p className="metric-note">保存済み求人のうち、直近解析がある件数です。</p>
          </div>
          <div className="metric-tile">
            <p className="metric-label">検出警告</p>
            <p className="metric-value">{criticalWarnings}</p>
            <p className="metric-note">表示中の求人に含まれる注意ワード総数です。</p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">最近登録した求人</h2>
            <p className="section-copy">横断で見比べやすいよう、総合と内訳ランクを同じ粒度で並べています。</p>
          </div>
          <Link href="/jobs" className="button-secondary">
            すべて見る
            <ArrowRight className="size-4" />
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="mt-5 panel-muted">
            <p className="text-sm leading-6 text-slate-600">まだ求人が登録されていません。最初の1件を解析すると、この画面に最近の評価が並びます。</p>
            <Link href="/jobs/new" className="button-primary mt-4">
              求人を登録する
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {recentJobs.map((job) => {
              const latest = job.analyses[0];
              const parsed = latest?.evidenceJson ? (JSON.parse(latest.evidenceJson) as ParsedJob) : null;
              const displayCompanyName = parsed?.companyName.value ?? job.companyName ?? "会社名不明";
              const displayTitle = parsed?.title.value ?? job.title ?? "職種不明";

              return (
                <article key={job.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-slate-950">{displayCompanyName}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{displayTitle}</p>
                    </div>
                    <Link href={`/jobs/${job.id}`} className="button-secondary px-3 py-2">
                      詳細
                    </Link>
                  </div>

                  {latest ? (
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                      {renderRankBadge("総合", latest.totalRank, formatRankDetail("総合", parsed))}
                      {renderRankBadge("固定残業", latest.salaryRank, formatRankDetail("固定残業", parsed))}
                      {renderRankBadge("年間休日", latest.holidayRank, formatRankDetail("年間休日", parsed))}
                      {renderRankBadge("休日制度", latest.holidayTypeRank, formatRankDetail("休日制度", parsed))}
                      {renderRankBadge("福利厚生", latest.benefitRank, formatRankDetail("福利厚生", parsed))}
                    </div>
                  ) : (
                    <p className="mt-5 text-sm text-slate-500">解析結果はまだありません。</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel">
          <h2 className="section-title">解析の流れ</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>1. 求人本文を貼り付ける</p>
            <p>2. 抽出値と警告を確認する</p>
            <p>3. 自分用基準や公開基準と照らして判断する</p>
          </div>
        </div>

        <div className="panel">
          <h2 className="section-title">料金・制限</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">保存件数、解析回数、基準機能の解放範囲はプランごとに変わります。必要な範囲だけ課金できる構成です。</p>
          <Link href="/pricing" className="button-secondary mt-4">
            プラン詳細
          </Link>
        </div>

        <div className="panel">
          <h2 className="section-title">共有基準</h2>
          <p className="mt-4 text-sm leading-6 text-slate-600">公開された判断基準を参照して、自分の評価軸を早く整えられます。人気順や用途順で探索できます。</p>
          <Link href="/criteria" className="button-secondary mt-4">
            基準を見る
          </Link>
        </div>
      </div>
    </section>
  );
}
