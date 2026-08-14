import { describe, expect, test } from "vitest";

import { buildPersistedWorkspaceState } from "@/lib/persisted-workspace-state";

describe("buildPersistedWorkspaceState", () => {
  test("sorts records newest-first and derives history + active detail from the latest record", () => {
    const state = buildPersistedWorkspaceState(
      [
        {
          id: "older",
          input: "old-input",
          detail: { title: "old detail" },
          history: { label: "old label" },
          createdAt: new Date("2026-06-14T00:00:00.000Z")
        },
        {
          id: "newer",
          input: "new-input",
          detail: { title: "new detail" },
          history: { label: "new label" },
          createdAt: new Date("2026-06-15T00:00:00.000Z")
        }
      ],
      {
        toHistoryItem: (record) => ({ id: record.id, label: record.history.label }),
        toActiveDetail: (record) => record.detail,
        getActiveInput: (record) => record.input
      }
    );

    expect(state.historyItems).toEqual([
      { id: "newer", label: "new label" },
      { id: "older", label: "old label" }
    ]);
    expect(state.activeDetail).toEqual({ title: "new detail" });
    expect(state.activeInput).toBe("new-input");
  });

  test("returns null active values and empty history when there are no records", () => {
    const state = buildPersistedWorkspaceState([], {
      toHistoryItem: (record) => ({ id: record.id }),
      toActiveDetail: (record) => record.detail,
      getActiveInput: (record) => record.input
    });

    expect(state.historyItems).toEqual([]);
    expect(state.activeDetail).toBeNull();
    expect(state.activeInput).toBeNull();
  });
});
