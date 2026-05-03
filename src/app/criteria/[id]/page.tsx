import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Bookmark, Copy, Gauge, PlayCircle } from "lucide-react";

import { clonePublicCriteriaAction, recordCriteriaUseAction, savePublicCriteriaAction } from "@/actions/criteria-actions";
import { requireUser } from "@/lib/auth/require-user";
import { criteriaToRankSettings, getPublicCriteria, incrementCriteriaMetric, parseTags } from "@/lib/criteria/templates";
import { isProductionBuildPhase } from "@/lib/env/build-phase";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export default async function CriteriaDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  if (isProductionBuildPhase()) {
    return <section className="page-stack" />;
  }

  const { id } = (await params) ?? {};
  if (!id) {
    notFound();
  }
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const limits = PLAN_LIMITS[plan].criteria;
  const template = await getPublicCriteria(id);

  if (!template) {
    notFound();
  }

  await incrementCriteriaMetric(template, "viewCount");

  const tags = parseTags(template.tagsJson);
  const settings = criteriaToRankSettings(template);

  return (
    <section className="page-stack">
      <article className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="eyebrow">{template.category}</p>
            <h1 className="page-title mt-2">{template.title}</h1>
            <p className="page-copy mt-3">{template.description}</p>
            <p className="mt-4 text-xs text-slate-500">作成者: {template.user.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs text-slate-600 sm:grid-cols-4">
            <span className="metric-tile px-3 py-3">閲覧 {template.viewCount + 1}</span>
            <span className="metric-tile px-3 py-3">保存 {template.saveCount}</span>
            <span className="metric-tile px-3 py-3">複製 {template.cloneCount}</span>
            <span className="metric-tile px-3 py-3">利用 {template.useCount}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="tag-pill">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="panel-muted">
            <p className="metric-label">Step 1</p>
            <p className="mt-2 text-sm font-medium text-slate-900">この基準を読む</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">固定残業や年間休日の感度が、今の自分に合うかを先に確認します。</p>
          </div>
          <div className="panel-muted">
            <p className="metric-label">Step 2</p>
            <p className="mt-2 text-sm font-medium text-slate-900">保存・コピーする</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">そのまま残すか、自分用にコピーして基準の土台にします。</p>
          </div>
          <div className="panel-muted">
            <p className="metric-label">Step 3</p>
            <p className="mt-2 text-sm font-medium text-slate-900">この基準でランク付けする</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">判断軸が決まったら、求人を追加して残すかどうかを見極めます。</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <form action={savePublicCriteriaAction.bind(null, template.id)}>
            <button type="submit" disabled={!limits.canSaveTemplates} className="button-secondary">
              <Bookmark className="size-4" />
              保存する
            </button>
          </form>
          <form action={clonePublicCriteriaAction.bind(null, template.id)}>
            <button type="submit" disabled={!limits.canCloneTemplates} className="button-primary">
              <Copy className="size-4" />
              自分用にコピー
            </button>
          </form>
          <form action={recordCriteriaUseAction.bind(null, template.id)}>
            <button type="submit" className="button-accent">
              <PlayCircle className="size-4" />
              利用を記録
            </button>
          </form>
          <Link href="/jobs/new" className="button-secondary">
            この基準でランク付け
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">基準項目</h2>
            <p className="section-copy">まずはランクの付き方を確認して、この基準で残したい求人が選べそうかを見ます。</p>
          </div>
          <Gauge className="size-5 text-rakushu-600" />
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="metric-tile">
            <h3 className="text-sm font-medium text-slate-900">固定残業ランク</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              A≤{settings.fixedOvertime.aMaxHours} / B≤{settings.fixedOvertime.bMaxHours} / C≤{settings.fixedOvertime.cMaxHours} / D≤{settings.fixedOvertime.dMaxHours} 時間
            </p>
          </div>
          <div className="metric-tile">
            <h3 className="text-sm font-medium text-slate-900">年間休日ランク</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              S≥{settings.annualHolidays.sMinDays} / A≥{settings.annualHolidays.aMinDays} / B≥{settings.annualHolidays.bMinDays} / C≥{settings.annualHolidays.cMinDays} / D≥
              {settings.annualHolidays.dMinDays} 日
            </p>
          </div>
          <div className="metric-tile">
            <h3 className="text-sm font-medium text-slate-900">休日制度・福利厚生</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              完全週休2日制は高め、週休2日制は中間として扱います。福利厚生は項目数に住宅手当や社宅制度を加点して見ます。
            </p>
          </div>
          <div className="metric-tile md:col-span-2">
            <h3 className="text-sm font-medium text-slate-900">この基準の使いどころ</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              気になる求人を片っ端から保存する前に、この基準で先にランク付けしておくと、残す求人の判断がぶれにくくなります。保存したあとは求人整理ページで応募状況や次に見る予定を追えます。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/jobs/new" className="button-primary">
                求人をランク付けする
              </Link>
              <Link href="/jobs" className="button-secondary">
                求人整理を見る
              </Link>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}
