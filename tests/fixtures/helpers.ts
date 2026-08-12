// Shared fixture helpers for analysis tests
import type { WorkingSet } from "../../src/hevy/types.js";
import type { SessionMetrics } from "../../src/analysis/progression.js";
import { best1RM, topWeight } from "../../src/analysis/estimated-1rm.js";

export function ws(weight_kg: number, reps: number): WorkingSet {
  return { weight_kg, reps, type: "normal" };
}

export function makeSession(date: string, sets: WorkingSet[]): SessionMetrics {
  return {
    date,
    sets,
    topWeight: topWeight(sets),
    best1RM: best1RM(sets),
    totalReps: sets.reduce((s, x) => s + x.reps, 0),
  };
}
