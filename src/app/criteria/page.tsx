import Link from "next/link";
import { ArrowRight, Bookmark, Copy, Search } from "lucide-react";

import { clonePublicCriteriaAction, savePublicCriteriaAction } from "@/actions/criteria-actions";
import { requireUser } from "@/lib/auth/require-user";
import { CRITERIA_CATEGORIES, listPublicCriteria, parseTags, type CriteriaSort } from "@/lib/criteria/templates";
import { PLAN_LIMITS } from "@/lib/plans";
import { getUserPlan } from "@/lib/subscription";

const SORT_LABELS: Record<CriteriaSort, string> = {
  popular: "人気順",
  new: "新着順",
  saves: "保存数順",
  uses: "利用数順"
};

function getSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CriteriaPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const plan = await getUserPlan(user.id);
  const criteriaLimits = PLAN_LIMITS[plan].criteria;
  const params = await searchParams;
  const sort = (getSingle(params.sort) ?? "popular") as CriteriaSort;
  const category = getSingle(params.category);
  const tag = getSingle(params.tag);
  const keyword = getSingle(params.q);

  const templates = criteriaLimits.canBrowsePublic
    ? await listPublicCriteria({
        sort,
        category,
        tag,
        keyword
      })
    : [];

  return (
    <section className="page-stack">
      <div className="page-hero">
        <p className="eyebrow">Public criteria</p>
        <h1 className="page-title">公開された就活判断基準を探す</h1>
        <p className="page-copy">
          人気度は閲覧だけでなく、保存・複製・利用を重めに集計します。Starterは閲覧と一部保存・コピー、Plusは編集、Proは公開と統計確認まで利用できます。
        </p>
      </div>

      {!criteriaLimits.canBrowsePublic ? (
        <div className="panel">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          みんなの基準はStarterプラン以上で利用できます。
          <Link href="/pricing" className="ml-2 underline">
            料金プランを見る
          </Link>
        </div>
        </div>
      ) : (
        <>
          <form className="panel grid gap-3 md:grid-cols-[1fr_180px_180px_140px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={keyword ?? ""} placeholder="キーワード検索" className="field-input pl-10" />
            </div>
            <select name="category" defaultValue={category ?? ""} className="field-input">
              <option value="">カテゴリすべて</option>
              {CRITERIA_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} className="field-input">
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="button-primary">
              絞り込み
            </button>
          </form>

          {templates.length === 0 ? (
            <div className="panel">
              <div className="panel-muted text-sm text-slate-600">
              条件に合う公開基準はまだありません。Proユーザーが公開するとここに表示されます。
            </div>
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => {
                const tags = parseTags(template.tagsJson);
                return (
                  <li key={template.id} className="panel">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">{template.category}</p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-900">
                          <Link href={`/criteria/${template.id}`} className="hover:underline">
                            {template.title}
                          </Link>
                        </h2>
                      </div>
                      <span className="soft-pill">人気 {template.popularityScore}</span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{template.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((item) => (
                        <Link key={item} href={`/criteria?tag=${encodeURIComponent(item)}`} className="tag-pill">
                          #{item}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600 xl:grid-cols-4">
                      <div className="metric-tile p-3 text-center">閲覧 {template.viewCount}</div>
                      <div className="metric-tile p-3 text-center">保存 {template.saveCount}</div>
                      <div className="metric-tile p-3 text-center">複製 {template.cloneCount}</div>
                      <div className="metric-tile p-3 text-center">利用 {template.useCount}</div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <form action={savePublicCriteriaAction.bind(null, template.id)}>
                        <button type="submit" className="button-secondary">
                          <Bookmark className="size-4" />
                          保存
                        </button>
                      </form>
                      <form action={clonePublicCriteriaAction.bind(null, template.id)}>
                        <button type="submit" className="button-primary">
                          <Copy className="size-4" />
                          コピー
                        </button>
                      </form>
                      <Link href={`/criteria/${template.id}`} className="button-secondary ml-auto">
                        詳細
                        <ArrowRight className="size-4" />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
