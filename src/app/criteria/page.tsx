import Link from "next/link";

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
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-rakushu-700">みんなの基準</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">公開された就活判断基準を探す</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          人気度は閲覧だけでなく、保存・複製・利用を重めに集計します。Starterは閲覧と一部保存・コピー、Plusは編集、Proは公開と統計確認まで利用できます。
        </p>
      </div>

      {!criteriaLimits.canBrowsePublic ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          みんなの基準はStarterプラン以上で利用できます。
          <Link href="/pricing" className="ml-2 underline">
            料金プランを見る
          </Link>
        </div>
      ) : (
        <>
          <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_160px_160px_120px]">
            <input name="q" defaultValue={keyword ?? ""} placeholder="キーワード検索" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <select name="category" defaultValue={category ?? ""} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <option value="">カテゴリすべて</option>
              {CRITERIA_CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select name="sort" defaultValue={sort} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-rakushu-500 px-4 py-2 text-sm font-medium text-white hover:bg-rakushu-700">
              絞り込み
            </button>
          </form>

          {templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              条件に合う公開基準はまだありません。Proユーザーが公開するとここに表示されます。
            </div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {templates.map((template) => {
                const tags = parseTags(template.tagsJson);
                return (
                  <li key={template.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-rakushu-700">{template.category}</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-900">
                          <Link href={`/criteria/${template.id}`} className="hover:underline">
                            {template.title}
                          </Link>
                        </h2>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">人気 {template.popularityScore}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">{template.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.map((item) => (
                        <Link key={item} href={`/criteria?tag=${encodeURIComponent(item)}`} className="rounded-full bg-rakushu-50 px-2.5 py-1 text-xs text-rakushu-700">
                          #{item}
                        </Link>
                      ))}
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-slate-600">
                      <span>閲覧 {template.viewCount}</span>
                      <span>保存 {template.saveCount}</span>
                      <span>複製 {template.cloneCount}</span>
                      <span>利用 {template.useCount}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <form action={savePublicCriteriaAction.bind(null, template.id)}>
                        <button type="submit" className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                          保存
                        </button>
                      </form>
                      <form action={clonePublicCriteriaAction.bind(null, template.id)}>
                        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700">
                          コピー
                        </button>
                      </form>
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
