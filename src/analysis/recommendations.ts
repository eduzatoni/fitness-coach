import type { MovementPattern } from "./muscle-groups.js";
import type { RecommendationAction, Recommendation } from "../hevy/types.js";
import type { SessionMetrics } from "./progression.js";
import {
  compareSessionPair,
  doubleProgressionStatus,
  consecutiveTopRangeSessions,
  repDropoffRatio,
  daysSinceLast,
} from "./progression.js";
import { performanceTrend } from "./trend.js";
import { detectPlateau } from "./plateau.js";
import {
  movementClassFor,
  nextWeight,
  reduceWeight,
  DELOAD_PCT,
  LAYOFF_START_PCT,
  type TrainingGoal,
} from "./load-increment.js";

// Evidence-based thresholds
// NSCA 2-for-2 rule: require two consecutive top-range sessions before adding load
const CONFIRM_SESSIONS = 2;
// ACSM / RP: within-session rep drop >40% is a fatigue signature
const REP_DROPOFF_THRESHOLD = 0.40;
// Return-from-layoff: gap >21 days → start lower
const LAYOFF_DAYS = 21;
// Epley e1RM is reliable only up to ~12 reps; above this, use reps/volume trend instead
const E1RM_RELIABLE_MAX_REPS = 12;

export interface RecommendationContext {
  movementPattern?: MovementPattern;
  primaryMuscle?: string;
  goal?: TrainingGoal;
  equipment?: string | null;
}

export interface ExerciseRecommendation {
  action: RecommendationAction;
  recommendation: Recommendation;
  trend: string;
  plateaued: boolean;
  /** Computed target weight in kg (for INCREASE_WEIGHT / REDUCE_WEIGHT); internal / testing use. */
  targetWeightKg?: number;
  /** Rep target that pairs with a weight change — bottom of the rep range on a load increase. */
  targetReps?: number;
}

/**
 * Detect whether the plateau window already contains a deliberate deload dip.
 * A deload is inferred when some session's topWeight is ≥10% below the max topWeight in the
 * recent window, and the last session is back near the original load and still flat.
 */
function hasRecentDeload(sessions: SessionMetrics[]): boolean {
  if (sessions.length < 3) return false;
  const weights = sessions.map((s) => s.topWeight ?? 0);
  const maxW = Math.max(...weights);
  const minW = Math.min(...weights);
  const lastW = weights[weights.length - 1] ?? 0;
  // A deload was present if the minimum dipped ≥10% below the max and the latest is back near max
  return maxW > 0 && (maxW - minW) / maxW >= 0.10 && lastW >= maxW * 0.9;
}

/**
 * Derive an evidence-based recommendation from a series of exercise sessions (oldest first).
 *
 * Decision order (safety/reduce branches before increase branches):
 *  1. Post-bump adjustment (unchanged from original)
 *  2. Return-from-layoff (gap > 21 days)
 *  3. Within-session rep drop-off > 40%
 *  4. Regressing e1RM (only when reps ≤ ~12 where Epley is reliable)
 *  5. INCREASE_WEIGHT — gated by 2-for-2 rule
 *  6. Topped once, awaiting confirmation
 *  7. INCREASE_REPS — reps climbing but below top
 *  8. Plateau — deload first; escalate to CONSIDER_REPLACEMENT only after a prior deload
 *  9. Below-range/reps-negative fallback → MONITOR
 * 10. Stable/progressing fallback → MAINTAIN
 *
 * @param sessions - Session history, oldest first.
 * @param repRange - Target rep range for double-progression. Auto-assigned per exercise by default.
 * @param ctx - Optional movement context for load-increment class calculation.
 */
export function recommendExercise(
  sessions: SessionMetrics[],
  repRange: [number, number] = [8, 12],
  ctx: RecommendationContext = {}
): ExerciseRecommendation {
  if (sessions.length === 0) {
    return {
      action: "INSUFFICIENT_DATA",
      trend: "insufficient_data",
      plateaued: false,
      recommendation: { action: "INSUFFICIENT_DATA", target: "—", reason: "No session history found." },
    };
  }

  if (sessions.length === 1) {
    return {
      action: "INSUFFICIENT_DATA",
      trend: "insufficient_data",
      plateaued: false,
      recommendation: {
        action: "INSUFFICIENT_DATA",
        target: "—",
        reason: "Only one session recorded — need more data to make a recommendation.",
      },
    };
  }

  const latest = sessions[sessions.length - 1]!;
  const prev = sessions[sessions.length - 2]!;

  const pair = compareSessionPair(prev, latest, repRange);
  const dpStatus = doubleProgressionStatus(latest.sets, repRange);
  const trend = performanceTrend(sessions);
  const plateau = detectPlateau(sessions);

  const cls = movementClassFor(ctx.movementPattern);
  const currentWeight = latest.topWeight ?? 0;
  const currentStr = currentWeight > 0 ? `${currentWeight}kg` : "current weight";
  const [repMin, repMax] = repRange;

  const topStreak = consecutiveTopRangeSessions(sessions, repRange);
  const dropoff = repDropoffRatio(latest.sets);
  const gap = daysSinceLast(sessions);

  const maxRepsLatest = latest.sets.length > 0
    ? Math.max(...latest.sets.map((s) => s.reps))
    : 0;
  const e1RMReliable = maxRepsLatest <= E1RM_RELIABLE_MAX_REPS;

  // 1. Post-bump adjustment: rep drop after a weight increase is expected — don't penalise it
  if (pair.isPostBumpAdjustment) {
    return {
      action: "MAINTAIN",
      trend,
      plateaued: false,
      recommendation: {
        action: "MAINTAIN",
        target: currentStr,
        reason: `Weight was just increased. Reps are still within range — stay at ${currentStr} and work up to ${repMax} reps on all sets.`,
      },
    };
  }

  // 2. Return-from-layoff: first session back after a long break — start lighter
  if (gap !== null && gap > LAYOFF_DAYS && currentWeight > 0) {
    const newW = reduceWeight(currentWeight, cls, LAYOFF_START_PCT);
    const newStr = `${newW}kg`;
    return {
      action: "REDUCE_WEIGHT",
      trend,
      plateaued: false,
      targetWeightKg: newW,
      recommendation: {
        action: "REDUCE_WEIGHT",
        target: newStr,
        reason: `First session back after ${gap} days off — start lighter at ${newStr} and rebuild.`,
      },
    };
  }

  // 3. Within-session rep drop-off (fatigue signature): reps collapse across sets
  if (
    dropoff > REP_DROPOFF_THRESHOLD &&
    pair.weightSame &&
    latest.sets.length >= 2 &&
    currentWeight > 0
  ) {
    const newW = reduceWeight(currentWeight, cls);
    const newStr = `${newW}kg`;
    const firstReps = latest.sets[0]!.reps;
    const lastReps = latest.sets[latest.sets.length - 1]!.reps;
    return {
      action: "REDUCE_WEIGHT",
      trend,
      plateaued: false,
      targetWeightKg: newW,
      recommendation: {
        action: "REDUCE_WEIGHT",
        target: newStr,
        reason: `Reps dropped ${Math.round(dropoff * 100)}% across sets (${firstReps} → ${lastReps}) — fatigue signature. Drop to ${newStr} so all sets stay in range.`,
      },
    };
  }

  // 4. Regressing e1RM trend — only act when Epley is reliable (reps ≤ 12)
  if (trend === "regressing" && e1RMReliable && !plateau.isPlateaued && currentWeight > 0) {
    const newW = reduceWeight(currentWeight, cls);
    const newStr = `${newW}kg`;
    return {
      action: "REDUCE_WEIGHT",
      trend,
      plateaued: false,
      targetWeightKg: newW,
      recommendation: {
        action: "REDUCE_WEIGHT",
        target: newStr,
        reason: `Estimated strength is trending down across sessions. Drop to ${newStr} and rebuild.`,
      },
    };
  }

  // 5. INCREASE_WEIGHT — 2-for-2 rule (NSCA): two consecutive sessions at the same weight all at top
  if (dpStatus === "hit_top" && pair.weightSame && topStreak >= CONFIRM_SESSIONS && currentWeight > 0) {
    const newW = nextWeight(currentWeight, cls, ctx.equipment);
    // Double progression: adding load resets reps to the bottom of the range, then climb back up.
    const newStr = `${newW}kg × ${repMin}`;
    return {
      action: "INCREASE_WEIGHT",
      trend,
      plateaued: false,
      targetWeightKg: newW,
      targetReps: repMin,
      recommendation: {
        action: "INCREASE_WEIGHT",
        target: newStr,
        reason: `Hit ${repMax} reps on all sets for ${topStreak} sessions at ${currentStr} — increase to ${newW}kg and drop back to ${repMin} reps, then build back up to ${repMax}.`,
      },
    };
  }

  // 6. Topped the range once — hold and confirm (2-for-2 requires a second session)
  if (dpStatus === "hit_top" && pair.weightSame && topStreak < CONFIRM_SESSIONS) {
    return {
      action: "MAINTAIN",
      trend,
      plateaued: false,
      recommendation: {
        action: "MAINTAIN",
        target: currentStr,
        reason: `Topped the range at ${currentStr} — repeat it next session to confirm (2-for-2) before adding weight.`,
      },
    };
  }

  // 7. INCREASE_REPS — reps climbing within range, not plateaued
  if (
    dpStatus === "progressing" &&
    pair.weightSame &&
    pair.repProgressPositive &&
    !plateau.isPlateaued
  ) {
    return {
      action: "INCREASE_REPS",
      trend,
      plateaued: false,
      recommendation: {
        action: "INCREASE_REPS",
        target: currentStr,
        reason: `Reps climbing at ${currentStr} — keep adding reps toward ${repMax} on all sets before increasing weight.`,
      },
    };
  }

  // 8. Plateau — deload first, escalate to replacement only if a prior deload already failed
  if (plateau.isPlateaued && currentWeight > 0) {
    if (hasRecentDeload(sessions)) {
      // Already tried a deload in the recent window and it re-flattened → suggest variation
      return {
        action: "CONSIDER_REPLACEMENT",
        trend,
        plateaued: true,
        recommendation: {
          action: "CONSIDER_REPLACEMENT",
          target: currentStr,
          reason: `${plateau.reason} A previous deload didn't break the plateau — consider a rep-range change or exercise variation.`,
        },
      };
    }
    // First plateau: deload ~10% and re-progress (ACSM / StrongLifts / RP guidance)
    const newW = reduceWeight(currentWeight, cls, DELOAD_PCT);
    const newStr = `${newW}kg`;
    return {
      action: "REDUCE_WEIGHT",
      trend,
      plateaued: true,
      targetWeightKg: newW,
      recommendation: {
        action: "REDUCE_WEIGHT",
        target: newStr,
        reason: `Flat for ${plateau.sessionCount} sessions — deload ~${Math.round(DELOAD_PCT * 100)}% to ${newStr} and re-progress before considering an exercise change.`,
      },
    };
  }

  // 9. Reps falling below range, weight unchanged — watch before acting
  if (dpStatus === "below_range" && pair.weightSame && pair.repProgressNegative) {
    return {
      action: "MONITOR",
      trend,
      plateaued: false,
      recommendation: {
        action: "MONITOR",
        target: currentStr,
        reason: "Reps have dipped below the target range. Watch the next session before adjusting.",
      },
    };
  }

  // 10. Still progressing or stable — maintain
  return {
    action: "MAINTAIN",
    trend,
    plateaued: false,
    recommendation: {
      action: "MAINTAIN",
      target: currentStr,
      reason:
        dpStatus === "progressing" || pair.repProgressPositive || pair.e1RMImproved
          ? `Still progressing at ${currentStr}. Keep building reps toward ${repMax} on all sets.`
          : `Performance is stable at ${currentStr}. Continue with current weight and focus on rep quality.`,
    },
  };
}
