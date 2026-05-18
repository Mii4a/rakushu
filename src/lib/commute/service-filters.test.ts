import { describe, expect, it } from "vitest";

import { classifyCommuteServiceLabel } from "./service-filters";

describe("classifyCommuteServiceLabel", () => {
  it("denies shinkansen and limited express labels", () => {
    expect(classifyCommuteServiceLabel("東海道新幹線")).toBe("deny");
    expect(classifyCommuteServiceLabel("LIMITED EXPRESS")).toBe("deny");
    expect(classifyCommuteServiceLabel("特急はるか")).toBe("deny");
  });

  it("marks ambiguous labels separately", () => {
    expect(classifyCommuteServiceLabel("新快速")).toBe("ambiguous");
    expect(classifyCommuteServiceLabel("通勤特急")).toBe("ambiguous");
  });

  it("allows common commuter services", () => {
    expect(classifyCommuteServiceLabel("各駅停車")).toBe("allow");
    expect(classifyCommuteServiceLabel("通勤快速")).toBe("allow");
    expect(classifyCommuteServiceLabel("急行")).toBe("allow");
  });

  it("returns unknown when no label matches", () => {
    expect(classifyCommuteServiceLabel("中央線")).toBe("unknown");
    expect(classifyCommuteServiceLabel(undefined, null, "")).toBe("unknown");
  });

  it("prefers deny over ambiguous and allow when multiple labels are present", () => {
    expect(classifyCommuteServiceLabel("快速", "特急")).toBe("deny");
  });
});
