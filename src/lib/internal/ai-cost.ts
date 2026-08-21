import { and, gte, lt } from "drizzle-orm";

import { db } from "../db/client";
import { aiUsageEvents } from "../db/schema";

export type AiCostEventRow = {
  userId: string | null;
  model: string;
  featureArea: string;
  actionKey: string;
  requestStatus: string;
  totalCostMilliYen: number | null;
};

export type AiCostGroupRow = {
  totalCalls: number;
  successCalls: number;
  fallbackCalls: number;
  errorCalls: number;
  completedCalls: number;
  fallbackRate: number;
  errorRate: number;
  totalCostMilliYen: number;
  unpricedCalls: number;
  costPerSuccessfulRunMilliYen: number | null;
};

export type AiCostBreakdown<Key extends string | null> = AiCostGroupRow & {
  key: Key;
};

export type AiCostDashboard = AiCostGroupRow & {
  byModel: AiCostBreakdown<string>[];
  byAction: AiCostBreakdown<string>[];
  byFeature: AiCostBreakdown<string>[];
  byUser: AiCostBreakdown<string | null>[];
};

const SAFE_ERROR = "Invalid AI cost date range";

function isFiniteDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function emptyGroup(): AiCostGroupRow {
  return {
    totalCalls: 0,
    successCalls: 0,
    fallbackCalls: 0,
    errorCalls: 0,
    completedCalls: 0,
    fallbackRate: 0,
    errorRate: 0,
    totalCostMilliYen: 0,
    unpricedCalls: 0,
    costPerSuccessfulRunMilliYen: null
  };
}

function finalizeGroup(group: AiCostGroupRow): AiCostGroupRow {
  return {
    ...group,
    fallbackRate: group.completedCalls === 0 ? 0 : group.fallbackCalls / group.completedCalls,
    errorRate: group.totalCalls === 0 ? 0 : group.errorCalls / group.totalCalls,
    costPerSuccessfulRunMilliYen: group.successCalls === 0 ? null : group.totalCostMilliYen / group.successCalls
  };
}

function accumulate(group: AiCostGroupRow, row: AiCostEventRow): void {
  group.totalCalls += 1;
  if (row.requestStatus === "success") group.successCalls += 1;
  if (row.requestStatus === "fallback") group.fallbackCalls += 1;
  if (row.requestStatus === "error") group.errorCalls += 1;
  if (row.requestStatus === "success" || row.requestStatus === "fallback") group.completedCalls += 1;
  if (row.totalCostMilliYen == null) group.unpricedCalls += 1;
  else group.totalCostMilliYen += row.totalCostMilliYen;
}

function buildGroup(rows: AiCostEventRow[]): AiCostGroupRow {
  const group = emptyGroup();
  for (const row of rows) accumulate(group, row);
  return finalizeGroup(group);
}

function sortBreakdowns<Key extends string | null>(groups: AiCostBreakdown<Key>[]): AiCostBreakdown<Key>[] {
  return groups.sort((a, b) => {
    const costDiff = b.totalCostMilliYen - a.totalCostMilliYen;
    if (costDiff !== 0) return costDiff;
    const callDiff = b.totalCalls - a.totalCalls;
    if (callDiff !== 0) return callDiff;
    if (a.key === null) return b.key === null ? 0 : 1;
    if (b.key === null) return -1;
    return a.key.localeCompare(b.key);
  });
}

function bucket<Key extends string | null>(
  rows: AiCostEventRow[],
  selector: (row: AiCostEventRow) => Key
): AiCostBreakdown<Key>[] {
  const groups = new Map<Key, AiCostGroupRow>();
  for (const row of rows) {
    const key = selector(row);
    const group = groups.get(key) ?? emptyGroup();
    accumulate(group, row);
    groups.set(key, group);
  }
  return sortBreakdowns(
    [...groups.entries()].map(([key, group]) => ({ key, ...finalizeGroup(group) }))
  );
}

export function aggregateAiCostEvents(rows: AiCostEventRow[]): AiCostDashboard {
  const summary = buildGroup(rows);
  return {
    ...summary,
    byModel: bucket(rows, (row) => row.model),
    byAction: bucket(rows, (row) => row.actionKey),
    byFeature: bucket(rows, (row) => row.featureArea),
    byUser: bucket(rows, (row) => row.userId)
  };
}

export function getJstCalendarRange(days: number, now = new Date()): { from: Date; to: Date } {
  if (!Number.isSafeInteger(days) || days <= 0) throw new Error(SAFE_ERROR);
  if (!isFiniteDate(now)) throw new Error(SAFE_ERROR);
  const offsetMs = 9 * 60 * 60 * 1000;
  const nowJst = new Date(now.getTime() + offsetMs);
  const nextJstMidnightUtc = Date.UTC(nowJst.getUTCFullYear(), nowJst.getUTCMonth(), nowJst.getUTCDate() + 1);
  const to = new Date(nextJstMidnightUtc - offsetMs);
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  if (!isFiniteDate(from) || !isFiniteDate(to)) throw new Error(SAFE_ERROR);
  return { from, to };
}

export async function getAiCostDashboard({ from, to }: { from: Date; to: Date }): Promise<AiCostDashboard> {
  if (!isFiniteDate(from) || !isFiniteDate(to) || from.getTime() >= to.getTime()) throw new Error(SAFE_ERROR);
  const rows = await db
    .select({
      userId: aiUsageEvents.userId,
      model: aiUsageEvents.model,
      featureArea: aiUsageEvents.featureArea,
      actionKey: aiUsageEvents.actionKey,
      requestStatus: aiUsageEvents.requestStatus,
      totalCostMilliYen: aiUsageEvents.totalCostMilliYen
    })
    .from(aiUsageEvents)
    .where(and(gte(aiUsageEvents.createdAt, from), lt(aiUsageEvents.createdAt, to)));

  return aggregateAiCostEvents(rows as AiCostEventRow[]);
}
