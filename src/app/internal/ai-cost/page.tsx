import Link from "next/link";
import { redirect } from "next/navigation";

import { AppMockSidebarShell } from "@/components/app-mock-sidebar-shell";
import { requireUser } from "@/lib/auth/require-user";
import { parseAllowedInternalEmails } from "@/lib/auth/internal-access";
import { getAiCostDashboard, getJstCalendarRange, type AiCostBreakdown } from "@/lib/internal/ai-cost";
import { resolveAiCostPageAccess } from "@/lib/internal/ai-cost-page-access";

export const dynamic = "force-dynamic";

const jpyFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3
});
const percentFormatter = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});
const jstDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit"
});

function toSingle(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePeriod(value: string | undefined) {
  return value === "30" ? 30 : 7;
}

function formatJpyFromMilliYen(value: number | null) {
  if (value == null) return "算出不可";
  return `${jpyFormatter.format(value / 1000)}円`;
}

function formatPercent(rate: number) {
  return `${percentFormatter.format(rate * 100)}%`;
}

function formatJstRange(from: Date, to: Date) {
  return `JST (Asia/Tokyo): ${jstDateTimeFormatter.format(from)} 以上 / ${jstDateTimeFormatter.format(to)} 未満（終了時刻は含まない）`;
}

function breakdownRowKey(key: string | null) {
  return key === null ? "null:unattributed" : `value:${key}`;
}

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}

function BreakdownTable({ title, rows, emptyText, keyLabel }: { title: string; rows: AiCostBreakdown<string | null>[]; emptyText: string; keyLabel: string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">上位 {Math.min(rows.length, 20)} 件</p>
      </div>
      <div className="mt-4 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-8 text-sm text-slate-500">{emptyText}</p>
        ) : (
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                <th className="border-b border-slate-200 px-3 py-3">{keyLabel}</th>
                <th className="border-b border-slate-200 px-3 py-3">known total</th>
                <th className="border-b border-slate-200 px-3 py-3">success cost / run</th>
                <th className="border-b border-slate-200 px-3 py-3">success</th>
                <th className="border-b border-slate-200 px-3 py-3">fallback</th>
                <th className="border-b border-slate-200 px-3 py-3">error</th>
                <th className="border-b border-slate-200 px-3 py-3">completed / total</th>
                <th className="border-b border-slate-200 px-3 py-3">unpriced</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row) => (
                <tr key={breakdownRowKey(row.key)} className="align-top">
                  <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-900">{row.key ?? "未紐付け"}</td>
                  <td className="border-b border-slate-100 px-3 py-3">{formatJpyFromMilliYen(row.totalCostMilliYen)}</td>
                  <td className="border-b border-slate-100 px-3 py-3">{formatJpyFromMilliYen(row.costPerSuccessfulRunMilliYen)}</td>
                  <td className="border-b border-slate-100 px-3 py-3">{row.successCalls} ({formatPercent(row.successCalls / Math.max(row.totalCalls, 1))})</td>
                  <td className="border-b border-slate-100 px-3 py-3">{row.fallbackCalls} ({formatPercent(row.fallbackRate)})</td>
                  <td className="border-b border-slate-100 px-3 py-3">{row.errorCalls} ({formatPercent(row.errorRate)})</td>
                  <td className="border-b border-slate-100 px-3 py-3">{row.completedCalls} / {row.totalCalls}</td>
                  <td className="border-b border-slate-100 px-3 py-3">{row.unpricedCalls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default async function InternalAiCostPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const access = resolveAiCostPageAccess({
    requesterEmail: user.email,
    adminEmails: parseAllowedInternalEmails(process.env.INTERNAL_ADMIN_EMAILS)
  });
  if (!access.allowed) {
    redirect(access.redirectTo ?? "/jobs");
  }

  const params = (await searchParams) ?? {};
  const period = normalizePeriod(toSingle(params.period));
  const now = new Date();
  const range7d = getJstCalendarRange(7, now);
  const range30d = getJstCalendarRange(30, now);
  const [dashboard7d, dashboard30d] = await Promise.all([
    getAiCostDashboard(range7d),
    getAiCostDashboard(range30d)
  ]);
  const selectedDashboard = period === 30 ? dashboard30d : dashboard7d;
  const selectedRange = period === 30 ? range30d : range7d;

  const ranges = [
    { key: 7, label: "7日", href: "/internal/ai-cost?period=7", dashboard: dashboard7d },
    { key: 30, label: "30日", href: "/internal/ai-cost?period=30", dashboard: dashboard30d }
  ] as const;

  return (
    <AppMockSidebarShell activeKey="settings">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Internal</p>
          <h1 className="text-3xl font-black text-slate-900">AI cost dashboard</h1>
          <p className="text-sm leading-7 text-slate-600">
            管理者向けの内部コスト確認ページ。7日と30日の総額を並べつつ、選択期間の内訳をモデル・アクション・機能・ユーザー別に確認できる。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {ranges.map((range) => (
            <Link key={range.key} href={range.href} className={`rounded-3xl border p-5 shadow-sm transition ${range.key === period ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"}`}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-70">{range.label}</p>
              <p className="mt-2 text-2xl font-black">{formatJpyFromMilliYen(range.dashboard.totalCostMilliYen)}</p>
              <p className={`mt-2 text-sm ${range.key === period ? "text-slate-200" : "text-slate-500"}`}>known total cost</p>
            </Link>
          ))}
        </div>

        <form className="flex flex-wrap items-end gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            <span>period</span>
            <select name="period" defaultValue={String(period)} className="h-11 rounded-2xl border border-slate-200 px-4 text-sm">
              <option value="7">7日</option>
              <option value="30">30日</option>
            </select>
          </label>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-bold text-white">
            表示更新
          </button>
          <Link href="/internal/ai-cost?period=7" className="text-sm font-semibold text-slate-600">7日</Link>
          <Link href="/internal/ai-cost?period=30" className="text-sm font-semibold text-slate-600">30日</Link>
        </form>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="selected known total cost" value={formatJpyFromMilliYen(selectedDashboard.totalCostMilliYen)} hint={`${period}日 / ${formatJstRange(selectedRange.from, selectedRange.to)}`} />
          <MetricCard label="cost per successful run" value={formatJpyFromMilliYen(selectedDashboard.costPerSuccessfulRunMilliYen)} hint="null は 算出不可" />
          <MetricCard label="success / fallback / error" value={`${selectedDashboard.successCalls} / ${selectedDashboard.fallbackCalls} / ${selectedDashboard.errorCalls}`} hint={`${formatPercent(selectedDashboard.successCalls / Math.max(selectedDashboard.totalCalls, 1))} / ${formatPercent(selectedDashboard.fallbackRate)} / ${formatPercent(selectedDashboard.errorRate)}`} />
          <MetricCard label="completed / total / unpriced" value={`${selectedDashboard.completedCalls} / ${selectedDashboard.totalCalls} / ${selectedDashboard.unpricedCalls}`} hint="unpriced は金額不明の呼び出し数" />
        </div>

        {selectedDashboard.unpricedCalls > 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            一部の呼び出しに金額が付いていないため、known total cost は価格判明分のみで集計している。
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          <BreakdownTable title="model breakdown" rows={selectedDashboard.byModel} emptyText="model データなし" keyLabel="model" />
          <BreakdownTable title="action breakdown" rows={selectedDashboard.byAction} emptyText="action データなし" keyLabel="action" />
          <BreakdownTable title="feature breakdown" rows={selectedDashboard.byFeature} emptyText="feature データなし" keyLabel="feature" />
          <BreakdownTable title="user top 20" rows={selectedDashboard.byUser} emptyText="user データなし" keyLabel="user id" />
        </div>
      </section>
    </AppMockSidebarShell>
  );
}
