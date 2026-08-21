import { describe, it, expect } from "vitest";
import { makeSession } from "./fixtures/helpers.js";
import { ws } from "./fixtures/helpers.js";
import {
  compareSessionPair,
  doubleProgressionStatus,
  consecutiveTopRangeSessions,
  repDropoffRatio,
  daysSinceLast,
} from "../src/analysis/progression.js";

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

describe("consecutiveTopRangeSessions", () => {
  it("returns 0 when latest session is not hit_top", () => {
    const sessions = [
      makeSession("2026-01-01", [ws(80, 10), ws(80, 10), ws(80, 9)]),
      makeSession("2026-01-08", [ws(80, 11), ws(80, 10), ws(80, 10)]),
    ];
    expect(consecutiveTopRangeSessions(sessions, REP_RANGE)).toBe(0);
  });

  it("returns 1 when only the latest session is hit_top", () => {
    const sessions = [
      makeSession("2026-01-01", [ws(80, 10), ws(80, 10), ws(80, 9)]),
      makeSession("2026-01-08", [ws(80, 12), ws(80, 12), ws(80, 12)]),
    ];
    expect(consecutiveTopRangeSessions(sessions, REP_RANGE)).toBe(1);
  });

  it("returns 2 when last two sessions are both hit_top at the same weight", () => {
    const sessions = [
      makeSession("2025-12-25", [ws(80, 10), ws(80, 9)]),
      makeSession("2026-01-01", [ws(80, 12), ws(80, 12), ws(80, 12)]),
      makeSession("2026-01-08", [ws(80, 12), ws(80, 12), ws(80, 12)]),
    ];
    expect(consecutiveTopRangeSessions(sessions, REP_RANGE)).toBe(2);
  });

  it("resets the streak when weight changed between top sessions", () => {
    const sessions = [
      makeSession("2026-01-01", [ws(80, 12), ws(80, 12), ws(80, 12)]),
      makeSession("2026-01-08", [ws(82.5, 12), ws(82.5, 12), ws(82.5, 12)]),
    ];
    // Second session is hit_top but at a DIFFERENT weight → streak = 1, not 2
    expect(consecutiveTopRangeSessions(sessions, REP_RANGE)).toBe(1);
  });
});

describe("repDropoffRatio", () => {
  it("returns 0.5 for a 50% drop-off (12, 10, 6)", () => {
    const sets = [ws(80, 12), ws(80, 10), ws(80, 6)];
    expect(repDropoffRatio(sets)).toBeCloseTo(0.5);
  });

  it("returns 0 for uniform reps", () => {
    const sets = [ws(80, 10), ws(80, 10), ws(80, 10)];
    expect(repDropoffRatio(sets)).toBe(0);
  });

  it("returns 0 for a single set (can't compute drop-off)", () => {
    expect(repDropoffRatio([ws(80, 10)])).toBe(0);
  });

  it("returns 0 for empty sets", () => {
    expect(repDropoffRatio([])).toBe(0);
  });
});

describe("daysSinceLast", () => {
  it("returns the gap between the last two session dates", () => {
    const sessions = [
      makeSession("2026-01-01", [ws(80, 10)]),
      makeSession("2026-01-08", [ws(80, 10)]),
    ];
    expect(daysSinceLast(sessions)).toBe(7);
  });

  it("detects a 22-day layoff gap", () => {
    const sessions = [
      makeSession("2026-01-01", [ws(80, 10)]),
      makeSession("2026-01-23", [ws(80, 10)]),
    ];
    expect(daysSinceLast(sessions)).toBe(22);
  });

  it("returns null with fewer than 2 sessions", () => {
    expect(daysSinceLast([])).toBeNull();
    expect(daysSinceLast([makeSession("2026-01-01", [ws(80, 10)])])).toBeNull();
  });
});
