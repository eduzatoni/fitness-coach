import type { RecommendationAction, Recommendation } from "../hevy/types.js";
import type { SessionMetrics } from "./progression.js";
import { compareSessionPair, doubleProgressionStatus } from "./progression.js";
import { performanceTrend } from "./trend.js";
import { detectPlateau } from "./plateau.js";

export interface ExerciseRecommendation {
  action: RecommendationAction;
  recommendation: Recommendation;
  trend: string;
  plateaued: boolean;
}

/**
 * Derive a recommendation from a series of exercise sessions (oldest first).
 * repRange: target rep range for double-progression, e.g. [8, 12].
 */
export function recommendExercise(
  sessions: SessionMetrics[],
  repRange: [number, number] = [8, 12]
): ExerciseRecommendation {
  if (sessions.length === 0) {
    return {
      action: "INSUFFICIENT_DATA",
      trend: "insufficient_data",
      plateaued: false,
      recommendation: {
        action: "INSUFFICIENT_DATA",
        target: "—",
        reason: "No session history found.",
      },
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

  const currentWeight = latest.topWeight;
  const targetStr = currentWeight !== null ? `${currentWeight}kg` : "current weight";
  const [, repMax] = repRange;

  // Post-bump adjustment: don't penalise a rep drop right after a weight increase
  if (pair.isPostBumpAdjustment) {
    return {
      action: "MAINTAIN",
      trend,
      plateaued: false,
      recommendation: {
        action: "MAINTAIN",
        target: targetStr,
        reason: `Weight was just increased. Reps are still within range — stay at ${targetStr} and work up to ${repMax} reps on all sets.`,
      },
    };
  }

  // Ready to increase weight
  if (dpStatus === "hit_top" && pair.weightSame) {
    return {
      action: "INCREASE_WEIGHT",
      trend,
      plateaued: false,
      recommendation: {
        action: "INCREASE_WEIGHT",
        target: targetStr,
        reason: `You hit ${repMax} reps on all sets at ${targetStr}. Time to increase the weight.`,
      },
    };
  }

  // Reps are falling below range and weight hasn't changed — potential overreach
  if (dpStatus === "below_range" && pair.weightSame && pair.repProgressNegative) {
    if (plateau.isPlateaued) {
      return {
        action: "CONSIDER_REPLACEMENT",
        trend,
        plateaued: true,
        recommendation: {
          action: "CONSIDER_REPLACEMENT",
          target: targetStr,
          reason: plateau.reason,
        },
      };
    }
    return {
      action: "MONITOR",
      trend,
      plateaued: false,
      recommendation: {
        action: "MONITOR",
        target: targetStr,
        reason: "Reps have dipped below the target range. Watch the next session before adjusting.",
      },
    };
  }

  // Genuine plateau
  if (plateau.isPlateaued) {
    return {
      action: "CONSIDER_REPLACEMENT",
      trend,
      plateaued: true,
      recommendation: {
        action: "CONSIDER_REPLACEMENT",
        target: targetStr,
        reason: plateau.reason,
      },
    };
  }

  // Still progressing within range
  if (dpStatus === "progressing" || pair.repProgressPositive || pair.e1RMImproved) {
    return {
      action: "MAINTAIN",
      trend,
      plateaued: false,
      recommendation: {
        action: "MAINTAIN",
        target: targetStr,
        reason: `Still progressing at ${targetStr}. Keep building reps toward ${repMax} on all sets.`,
      },
    };
  }

  // Stable but not plateaued
  return {
    action: "MAINTAIN",
    trend,
    plateaued: false,
    recommendation: {
      action: "MAINTAIN",
      target: targetStr,
      reason: `Performance is stable at ${targetStr}. Continue with current weight and focus on rep quality.`,
    },
  };
}
