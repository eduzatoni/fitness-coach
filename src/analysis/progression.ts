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

/**
 * Count trailing sessions (newest → oldest) that hit the top of the rep range
 * at the SAME topWeight as the most recent session. Resets at any weight change.
 * Used for the 2-for-2 rule: require streak >= 2 before adding weight.
 */
export function consecutiveTopRangeSessions(
  sessions: SessionMetrics[],
  repRange: [number, number] = [8, 12]
): number {
  if (sessions.length === 0) return 0;
  const latestWeight = sessions[sessions.length - 1]!.topWeight;
  let streak = 0;
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i]!;
    if (s.topWeight !== latestWeight) break;
    if (doubleProgressionStatus(s.sets, repRange) !== "hit_top") break;
    streak++;
  }
  return streak;
}

/**
 * Within-session rep drop-off ratio: (firstSetReps - lastSetReps) / firstSetReps.
 * Returns 0 if there are fewer than 2 sets or firstSetReps is 0.
 * A ratio > 0.40 is a fatigue signature warranting load reduction.
 */
export function repDropoffRatio(sets: WorkingSet[]): number {
  if (sets.length < 2) return 0;
  const first = sets[0]!.reps;
  const last = sets[sets.length - 1]!.reps;
  if (first === 0) return 0;
  return Math.max(0, (first - last) / first);
}

/**
 * Whole-day gap between the last two session dates.
 * Returns null if fewer than 2 sessions are available.
 */
export function daysSinceLast(sessions: SessionMetrics[]): number | null {
  if (sessions.length < 2) return null;
  const prev = sessions[sessions.length - 2]!.date;
  const curr = sessions[sessions.length - 1]!.date;
  const ms = new Date(curr).getTime() - new Date(prev).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
