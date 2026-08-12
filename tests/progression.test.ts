import { describe, it, expect } from "vitest";
import { makeSession } from "./fixtures/helpers.js";
import { ws } from "./fixtures/helpers.js";
import { compareSessionPair, doubleProgressionStatus } from "../src/analysis/progression.js";

const REP_RANGE: [number, number] = [8, 12];

describe("doubleProgressionStatus", () => {
  it("hit_top when all sets at max reps", () => {
    const sets = [ws(80, 12), ws(80, 12), ws(80, 12)];
    expect(doubleProgressionStatus(sets, REP_RANGE)).toBe("hit_top");
  });

  it("progressing when sets are within range but not at top", () => {
    const sets = [ws(80, 10), ws(80, 10), ws(80, 9)];
    expect(doubleProgressionStatus(sets, REP_RANGE)).toBe("progressing");
  });

  it("below_range when any set dips below min", () => {
    const sets = [ws(80, 8), ws(80, 7), ws(80, 7)];
    expect(doubleProgressionStatus(sets, REP_RANGE)).toBe("below_range");
  });
});

describe("compareSessionPair — post-bump adjustment", () => {
  it("flags isPostBumpAdjustment when weight increased and reps still in range", () => {
    // Classic double-progression: was 80kg 12/12/12, now 82.5kg 9/8/8
    const prev = makeSession("2026-01-01", [ws(80, 12), ws(80, 12), ws(80, 12)]);
    const curr = makeSession("2026-01-08", [ws(82.5, 9), ws(82.5, 8), ws(82.5, 8)]);
    const result = compareSessionPair(prev, curr, REP_RANGE);
    expect(result.wasWeightBumped).toBe(true);
    expect(result.isPostBumpAdjustment).toBe(true);
  });

  it("does NOT flag post-bump when reps drop below min after weight increase", () => {
    const prev = makeSession("2026-01-01", [ws(80, 12), ws(80, 12), ws(80, 12)]);
    const curr = makeSession("2026-01-08", [ws(82.5, 6), ws(82.5, 5), ws(82.5, 5)]);
    const result = compareSessionPair(prev, curr, REP_RANGE);
    expect(result.wasWeightBumped).toBe(true);
    expect(result.isPostBumpAdjustment).toBe(false);
  });

  it("detects weight progression", () => {
    const prev = makeSession("2026-01-01", [ws(80, 10), ws(80, 10)]);
    const curr = makeSession("2026-01-08", [ws(82.5, 9), ws(82.5, 9)]);
    const result = compareSessionPair(prev, curr);
    expect(result.weightIncreased).toBe(true);
    expect(result.weightDecreased).toBe(false);
  });

  it("detects rep progression", () => {
    const prev = makeSession("2026-01-01", [ws(80, 9), ws(80, 9), ws(80, 8)]);
    const curr = makeSession("2026-01-08", [ws(80, 10), ws(80, 10), ws(80, 9)]);
    const result = compareSessionPair(prev, curr);
    expect(result.repProgressPositive).toBe(true);
  });
});
