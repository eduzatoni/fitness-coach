import { describe, it, expect } from "vitest";
import { makeSession, ws } from "./fixtures/helpers.js";
import { performanceTrend } from "../src/analysis/trend.js";

const DATES = Array.from({ length: 8 }, (_, i) => {
  const d = new Date("2026-01-01");
  d.setDate(d.getDate() + i * 7);
  return d.toISOString().slice(0, 10);
});

describe("performanceTrend", () => {
  it("returns insufficient_data for < 3 sessions", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10)]),
      makeSession(DATES[1]!, [ws(80, 10)]),
    ];
    expect(performanceTrend(sessions)).toBe("insufficient_data");
  });

  it("detects progressing trend", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(70, 10)]),
      makeSession(DATES[1]!, [ws(72.5, 10)]),
      makeSession(DATES[2]!, [ws(75, 10)]),
      makeSession(DATES[3]!, [ws(77.5, 10)]),
    ];
    expect(performanceTrend(sessions)).toBe("progressing");
  });

  it("detects stable trend", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10)]),
      makeSession(DATES[1]!, [ws(80, 10)]),
      makeSession(DATES[2]!, [ws(80, 10)]),
      makeSession(DATES[3]!, [ws(80, 10)]),
    ];
    expect(performanceTrend(sessions)).toBe("stable");
  });

  it("detects regressing trend", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10)]),
      makeSession(DATES[1]!, [ws(77.5, 9)]),
      makeSession(DATES[2]!, [ws(75, 8)]),
      makeSession(DATES[3]!, [ws(72.5, 8)]),
    ];
    expect(performanceTrend(sessions)).toBe("regressing");
  });
});
