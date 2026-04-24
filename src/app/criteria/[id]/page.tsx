import { notFound } from "next/navigation";
import { Bookmark, Copy, Gauge, PlayCircle } from "lucide-react";

import { clonePublicCriteriaAction, recordCriteriaUseAction, savePublicCriteriaAction } from "@/actions/criteria-actions";
import { requireUser } from "@/lib/auth/require-user";
import { criteriaToRankSettings, getPublicCriteria, incrementCriteriaMetric, parseTags } from "@/lib/criteria/templates";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

export default async function CriteriaDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

        <div className="mt-6 flex flex-wrap gap-2">
          <form action={savePublicCriteriaAction.bind(null, template.id)}>
            <button type="submit" disabled={!limits.canSaveTemplates} className="button-secondary">
              <Bookmark className="size-4" />
              お気に入り保存
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
              この基準を利用
            </button>
          </form>
        </div>
      </article>

      <article className="panel">
        <div className="section-heading">
          <div>
            <h2 className="section-title">基準項目</h2>
            <p className="section-copy">このテンプレートが採用している閾値です。利用前に固定残業と年間休日の感度を確認できます。</p>
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
        </div>
      </article>
    </section>
  );
}
