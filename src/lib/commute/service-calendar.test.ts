import { describe, expect, it } from "vitest";

import { resolveActiveServiceIds } from "./service-calendar";

describe("resolveActiveServiceIds", () => {
  it("returns weekday services when targetDate is omitted", () => {
    const result = resolveActiveServiceIds({
      services: [
        { serviceId: "weekday", monday: true, tuesday: true, wednesday: true, thursday: true, friday: true },
        { serviceId: "weekend", monday: false, tuesday: false, wednesday: false, thursday: false, friday: false }
      ],
      exceptions: []
    });

    expect([...result]).toEqual(["weekday"]);
  });

  it("applies calendar date additions and removals on a target date", () => {
    const result = resolveActiveServiceIds({
      services: [
        { serviceId: "weekday", monday: true, tuesday: true, wednesday: true, thursday: true, friday: true },
        { serviceId: "special", monday: false, tuesday: false, wednesday: false, thursday: false, friday: false }
      ],
      exceptions: [
        { serviceId: "weekday", serviceDate: "20260504", exceptionType: 2 },
        { serviceId: "special", serviceDate: "20260504", exceptionType: 1 }
      ],
      targetDate: "20260504"
    });

    expect([...result]).toEqual(["special"]);
  });
});
