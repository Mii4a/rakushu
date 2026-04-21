import { notFound } from "next/navigation";

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
    <section className="space-y-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-medium text-rakushu-700">{template.category}</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">{template.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{template.description}</p>
            <p className="mt-3 text-xs text-slate-500">作成者: {template.user.name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs text-slate-600 sm:grid-cols-4">
            <span className="rounded-lg bg-slate-50 px-3 py-2">閲覧 {template.viewCount + 1}</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2">保存 {template.saveCount}</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2">複製 {template.cloneCount}</span>
            <span className="rounded-lg bg-slate-50 px-3 py-2">利用 {template.useCount}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full bg-rakushu-50 px-2.5 py-1 text-xs text-rakushu-700">
              #{tag}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <form action={savePublicCriteriaAction.bind(null, template.id)}>
            <button type="submit" disabled={!limits.canSaveTemplates} className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">
              お気に入り保存
            </button>
          </form>
          <form action={clonePublicCriteriaAction.bind(null, template.id)}>
            <button type="submit" disabled={!limits.canCloneTemplates} className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50">
              自分用にコピー
            </button>
          </form>
          <form action={recordCriteriaUseAction.bind(null, template.id)}>
            <button type="submit" className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700">
              この基準を利用
            </button>
          </form>
        </div>
      </article>

      <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">基準項目</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="text-sm font-medium text-slate-900">固定残業ランク</h3>
            <p className="mt-2 text-sm text-slate-600">
              A≤{settings.fixedOvertime.aMaxHours} / B≤{settings.fixedOvertime.bMaxHours} / C≤{settings.fixedOvertime.cMaxHours} / D≤{settings.fixedOvertime.dMaxHours} 時間
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="text-sm font-medium text-slate-900">年間休日ランク</h3>
            <p className="mt-2 text-sm text-slate-600">
              S≥{settings.annualHolidays.sMinDays} / A≥{settings.annualHolidays.aMinDays} / B≥{settings.annualHolidays.bMinDays} / C≥{settings.annualHolidays.cMinDays} / D≥
              {settings.annualHolidays.dMinDays} 日
            </p>
          </div>
        </div>
      </article>
    </section>
  );
}
