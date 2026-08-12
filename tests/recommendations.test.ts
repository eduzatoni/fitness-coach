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
  it("steady rep progression within range → MAINTAIN", () => {
    // Weight same but reps growing — still within range, not at top yet
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 8),  ws(80, 8),  ws(80, 8)]),
      makeSession(DATES[1]!, [ws(80, 9),  ws(80, 9),  ws(80, 8)]),
      makeSession(DATES[2]!, [ws(80, 10), ws(80, 9),  ws(80, 9)]),
      makeSession(DATES[3]!, [ws(80, 10), ws(80, 10), ws(80, 9)]),
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("MAINTAIN");
    expect(result.trend).not.toBe("regressing");
  });

  it("double progression: hit_top on all sets → INCREASE_WEIGHT", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 9), ws(80, 9)]),
      makeSession(DATES[1]!, [ws(80, 11), ws(80, 10), ws(80, 10)]),
      makeSession(DATES[2]!, [ws(80, 12), ws(80, 12), ws(80, 12)]), // all at top
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("INCREASE_WEIGHT");
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

  it("plateau over 5 sessions → CONSIDER_REPLACEMENT", () => {
    const sessions = DATES.slice(0, 5).map((d) =>
      makeSession(d, [ws(65, 10), ws(65, 10), ws(65, 10)])
    );
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
    // deload = low weight intentionally, then bounce back
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 10), ws(80, 9)]),
      makeSession(DATES[1]!, [ws(60, 12), ws(60, 12), ws(60, 12)]), // deload
      makeSession(DATES[2]!, [ws(80, 11), ws(80, 11), ws(80, 10)]), // back strong
    ];
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).not.toBe("CONSIDER_REPLACEMENT");
  });

  it("exercise replacement scenario: consistent flat despite not being a new exercise", () => {
    const sessions = DATES.slice(0, 6).map((d) =>
      makeSession(d, [ws(65, 10), ws(65, 10), ws(65, 10)])
    );
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("CONSIDER_REPLACEMENT");
  });

  it("irregular frequency: widely spaced flat sessions → plateau", () => {
    const irregularDates = ["2026-01-01", "2026-01-10", "2026-01-25", "2026-02-08", "2026-02-22"];
    const sessions = irregularDates.map((d) =>
      makeSession(d, [ws(65, 10), ws(65, 10), ws(65, 10)])
    );
    const result = recommendExercise(sessions, REP_RANGE);
    expect(result.action).toBe("CONSIDER_REPLACEMENT");
  });
});
