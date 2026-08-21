import { describe, it, expect } from "vitest";
import { makeSession, ws } from "./fixtures/helpers.js";
import { recommendExercise } from "../src/analysis/recommendations.js";

const REP_RANGE: [number, number] = [8, 12];
const DATES = Array.from({ length: 10 }, (_, i) => {
  const d = new Date("2026-01-01");
  d.setDate(d.getDate() + i * 7);
  return d.toISOString().slice(0, 10);
});

describe("recommendations — fixture scenarios", () => {
  it("steady rep progression within range → INCREASE_REPS (not MAINTAIN)", () => {
    // Weight same, reps climbing within range — signal to keep adding reps
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 8),  ws(80, 8),  ws(80, 8)]),
      makeSession(DATES[1]!, [ws(80, 9),  ws(80, 9),  ws(80, 8)]),
      makeSession(DATES[2]!, [ws(80, 10), ws(80, 9),  ws(80, 9)]),
      makeSession(DATES[3]!, [ws(80, 10), ws(80, 10), ws(80, 9)]),
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("INCREASE_REPS");
    expect(result.trend).not.toBe("regressing");
  });

  it("hit_top on all sets for ONE session → MAINTAIN (2-for-2: need confirmation)", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 9), ws(80, 9)]),
      makeSession(DATES[1]!, [ws(80, 11), ws(80, 10), ws(80, 10)]),
      makeSession(DATES[2]!, [ws(80, 12), ws(80, 12), ws(80, 12)]), // topped once
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("MAINTAIN");
    expect(result.recommendation.reason).toMatch(/2-for-2|confirm|repeat/i);
  });

  it("hit_top on all sets for TWO consecutive sessions → INCREASE_WEIGHT with computed target", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 9)]),
      makeSession(DATES[1]!, [ws(80, 12), ws(80, 12), ws(80, 12)]), // topped once
      makeSession(DATES[2]!, [ws(80, 12), ws(80, 12), ws(80, 12)]), // topped again → fire
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("INCREASE_WEIGHT");
    // Target should be the NEW (higher) weight, not the current 80kg
    expect(result.recommendation.target).not.toBe("80kg");
    expect(result.targetWeightKg).toBeDefined();
    expect(result.targetWeightKg!).toBeGreaterThan(80);
  });

  it("post weight-increase rep drop → MAINTAIN (not regression)", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 12), ws(80, 12), ws(80, 12)]),
      makeSession(DATES[1]!, [ws(82.5, 9), ws(82.5, 8), ws(82.5, 8)]), // weight bumped
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("MAINTAIN");
  });

  it("one bad workout → MAINTAIN or MONITOR, not CONSIDER_REPLACEMENT", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 10)]),
      makeSession(DATES[1]!, [ws(80, 9), ws(80, 8)]),  // one bad session
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).not.toBe("CONSIDER_REPLACEMENT");
  });

  it("first plateau → REDUCE_WEIGHT (deload first, not replacement)", () => {
    const sessions = DATES.slice(0, 5).map((d) =>
      makeSession(d, [ws(65, 10), ws(65, 10), ws(65, 10)])
    );
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("REDUCE_WEIGHT");
    expect(result.plateaued).toBe(true);
    expect(result.recommendation.reason).toMatch(/deload|flat|10%/i);
    // Target should be lower than current 65kg
    expect(result.targetWeightKg!).toBeLessThan(65);
  });

  it("plateau that already had a deload → CONSIDER_REPLACEMENT (escalation)", () => {
    // Deload happened earlier; last 4 sessions are flat at 65kg → plateau fires AND hasRecentDeload
    const sessions = [
      makeSession("2026-01-01", [ws(58.5, 10), ws(58.5, 10), ws(58.5, 10)]), // deload (early)
      makeSession("2026-01-08", [ws(65, 10), ws(65, 10), ws(65, 10)]),  // back and flat
      makeSession("2026-01-15", [ws(65, 10), ws(65, 10), ws(65, 10)]),
      makeSession("2026-01-22", [ws(65, 10), ws(65, 10), ws(65, 10)]),
      makeSession("2026-01-29", [ws(65, 10), ws(65, 10), ws(65, 10)]),
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("CONSIDER_REPLACEMENT");
    expect(result.plateaued).toBe(true);
  });

  it("new exercise / insufficient data → INSUFFICIENT_DATA", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(40, 10), ws(40, 10)]),
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("INSUFFICIENT_DATA");
  });

  it("deload session followed by strong session → not penalised", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 10), ws(80, 9)]),
      makeSession(DATES[1]!, [ws(60, 12), ws(60, 12), ws(60, 12)]), // deload
      makeSession(DATES[2]!, [ws(80, 11), ws(80, 11), ws(80, 10)]), // back strong
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).not.toBe("CONSIDER_REPLACEMENT");
  });

  it("return after break (>21 days gap) → REDUCE_WEIGHT with layoff reason", () => {
    const sessions = [
      makeSession("2026-01-01", [ws(80, 11), ws(80, 10), ws(80, 10)]),
      makeSession("2026-01-08", [ws(80, 11), ws(80, 11), ws(80, 10)]),
      makeSession("2026-03-01", [ws(80, 8),  ws(80, 8),  ws(80, 7)]), // 51-day break
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("REDUCE_WEIGHT");
    expect(result.plateaued).toBe(false);
    expect(result.targetWeightKg!).toBeLessThan(80);
    expect(result.recommendation.reason).toMatch(/layoff|break|off|lighter/i);
  });

  it("within-session rep drop-off >40% → REDUCE_WEIGHT (fatigue signature)", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 10), ws(80, 10)]),
      makeSession(DATES[1]!, [ws(80, 10), ws(80, 10), ws(80, 10)]),
      // Latest: severe drop-off 12 → 6 = 50%
      makeSession(DATES[2]!, [ws(80, 12), ws(80, 9), ws(80, 6)]),
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("REDUCE_WEIGHT");
    expect(result.recommendation.reason).toMatch(/drop|fatigue|set/i);
  });

  it("regressing e1RM trend (reps ≤12) → REDUCE_WEIGHT", () => {
    // Progressively losing weight/reps over 4 sessions → regressing trend
    const sessions = [
      makeSession(DATES[0]!, [ws(85, 12), ws(85, 12), ws(85, 12)]),
      makeSession(DATES[1]!, [ws(82.5, 11), ws(82.5, 10), ws(82.5, 10)]),
      makeSession(DATES[2]!, [ws(80, 10), ws(80, 9), ws(80, 9)]),
      makeSession(DATES[3]!, [ws(77.5, 9), ws(77.5, 8), ws(77.5, 8)]),
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("REDUCE_WEIGHT");
    expect(result.trend).toBe("regressing");
  });

  it("e1RM unreliable guard: regressing e1RM with reps >12 does NOT trigger REDUCE_WEIGHT on e1RM alone", () => {
    // High-rep work (reps >12) where e1RM estimate is noisy — should not fire REDUCE_WEIGHT
    const range: [number, number] = [15, 20];
    const sessions = [
      makeSession(DATES[0]!, [ws(40, 20), ws(40, 20)]),
      makeSession(DATES[1]!, [ws(40, 18), ws(40, 17)]),
      makeSession(DATES[2]!, [ws(40, 16), ws(40, 15)]),
      makeSession(DATES[3]!, [ws(40, 15), ws(40, 15)]),
    ];
    const result = recommendExercise(sessions, range);
    // e1RM-based REDUCE_WEIGHT should not fire; expect MONITOR or MAINTAIN
    expect(result.action).not.toBe("REDUCE_WEIGHT");
  });

  it("ctx.goal strength [3,5] overrides rep range and fires INCREASE_WEIGHT after 2 consecutive top sessions", () => {
    // Two sessions at 5 reps (top of strength range) — should trigger INCREASE_WEIGHT
    const sessions = [
      makeSession(DATES[0]!, [ws(100, 4), ws(100, 4)]),
      makeSession(DATES[1]!, [ws(100, 5), ws(100, 5), ws(100, 5)]), // topped strength range once
      makeSession(DATES[2]!, [ws(100, 5), ws(100, 5), ws(100, 5)]), // topped again → fire
    ];
    const result = recommendExercise(sessions, [3, 5], { movementPattern: "squat" });
    expect(result.action).toBe("INCREASE_WEIGHT");
    // Large compound → +5 kg increment
    expect(result.targetWeightKg).toBe(105);
  });
});
