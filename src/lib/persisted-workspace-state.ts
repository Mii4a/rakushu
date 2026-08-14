export type PersistedWorkspaceRecord<TInput, TDetail, THistory> = {
  id: string;
  input: TInput;
  detail: TDetail;
  history: THistory;
  createdAt: Date;
};

export function buildPersistedWorkspaceState<TInput, TDetail, THistory, THistoryItem>(
  records: Array<PersistedWorkspaceRecord<TInput, TDetail, THistory>>,
  options: {
    toHistoryItem: (record: PersistedWorkspaceRecord<TInput, TDetail, THistory>) => THistoryItem;
    toActiveDetail: (record: PersistedWorkspaceRecord<TInput, TDetail, THistory>) => TDetail;
    getActiveInput: (record: PersistedWorkspaceRecord<TInput, TDetail, THistory>) => TInput;
  }
): {
  historyItems: THistoryItem[];
  activeDetail: TDetail | null;
  activeInput: TInput | null;
} {
  const sorted = [...records].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const latest = sorted[0] ?? null;

  return {
    historyItems: sorted.map((record) => options.toHistoryItem(record)),
    activeDetail: latest ? options.toActiveDetail(latest) : null,
    activeInput: latest ? options.getActiveInput(latest) : null
  };
}
