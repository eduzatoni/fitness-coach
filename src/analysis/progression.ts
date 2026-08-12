import type { WorkingSet } from "../hevy/types.js";
import { best1RM, topWeight } from "./estimated-1rm.js";

export interface SessionMetrics {
  date: string; // ISO date string
  sets: WorkingSet[];
  topWeight: number | null;
  best1RM: number | null;
  totalReps: number;
}

export function sessionMetrics(date: string, sets: WorkingSet[]): SessionMetrics {
  return {
    date,
    sets,
    topWeight: topWeight(sets),
    best1RM: best1RM(sets),
    totalReps: sets.reduce((s, x) => s + x.reps, 0),
  };
}

export interface ProgressionResult {
  weightIncreased: boolean;
  weightDecreased: boolean;
  weightSame: boolean;
  repProgressPositive: boolean;
  repProgressNegative: boolean;
  repProgressNeutral: boolean;
  e1RMImproved: boolean;
  e1RMDeclined: boolean;
  /** Weight went up vs previous session */
  wasWeightBumped: boolean;
  /** After a weight bump, reps dropped but are still within a normal "adjustment" range */
  isPostBumpAdjustment: boolean;
}

/**
 * Compare two consecutive sessions to derive progression facts.
 * repRange: target rep range for double-progression logic [min, max].
 */
export function compareSessionPair(
  prev: SessionMetrics,
  curr: SessionMetrics,
  repRange: [number, number] = [8, 12]
): ProgressionResult {
  const weightIncreased = (curr.topWeight ?? 0) > (prev.topWeight ?? 0);
  const weightDecreased = (curr.topWeight ?? 0) < (prev.topWeight ?? 0);
  const weightSame = !weightIncreased && !weightDecreased;

  const repProgressPositive = curr.totalReps > prev.totalReps;
  const repProgressNegative = curr.totalReps < prev.totalReps;
  const repProgressNeutral = curr.totalReps === prev.totalReps;

  const e1RMImproved = (curr.best1RM ?? 0) > (prev.best1RM ?? 0);
  const e1RMDeclined = (curr.best1RM ?? 0) < (prev.best1RM ?? 0);

  const wasWeightBumped = weightIncreased;

  // Post-bump adjustment: weight went up this session vs the last, and reps are within range
  // (not above repMax — if above, the previous weight bump was too conservative and we should increase again)
  const [repMin, repMax] = repRange;
  const minRepsThisSession = curr.sets.length > 0
    ? Math.min(...curr.sets.map((s) => s.reps))
    : 0;
  const maxRepsThisSession = curr.sets.length > 0
    ? Math.max(...curr.sets.map((s) => s.reps))
    : 0;
  const isPostBumpAdjustment =
    wasWeightBumped &&
    minRepsThisSession >= repMin &&
    maxRepsThisSession <= repMax;

  return {
    weightIncreased,
    weightDecreased,
    weightSame,
    repProgressPositive,
    repProgressNegative,
    repProgressNeutral,
    e1RMImproved,
    e1RMDeclined,
    wasWeightBumped,
    isPostBumpAdjustment,
  };
}

/**
 * Double-progression classifier for a single session given a rep range target.
 * Returns whether the user hit the top of the range on all sets → ready to increase weight.
 */
export function doubleProgressionStatus(
  sets: WorkingSet[],
  repRange: [number, number] = [8, 12]
): "hit_top" | "progressing" | "below_range" {
  if (sets.length === 0) return "progressing";
  const [repMin, repMax] = repRange;
  const allHitTop = sets.every((s) => s.reps >= repMax);
  if (allHitTop) return "hit_top";
  const anyBelowMin = sets.some((s) => s.reps < repMin);
  if (anyBelowMin) return "below_range";
  return "progressing";
}
