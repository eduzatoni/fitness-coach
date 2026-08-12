import type { SessionMetrics } from "./progression.js";
import type { PerformanceTrend } from "../hevy/types.js";

/**
 * Determine performance trend across a list of sessions (oldest first).
 * Requires at least 3 sessions for a meaningful trend.
 */
export function performanceTrend(sessions: SessionMetrics[]): PerformanceTrend {
  if (sessions.length < 3) return "insufficient_data";

  const e1RMs = sessions.map((s) => s.best1RM ?? 0);

  // Linear regression slope over e1RM values
  const n = e1RMs.length;
  const xs = e1RMs.map((_, i) => i);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = e1RMs.reduce((a, b) => a + b, 0) / n;

  const numerator = xs.reduce((sum, x, i) => sum + (x - xMean) * ((e1RMs[i] ?? 0) - yMean), 0);
  const denominator = xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);

  if (denominator === 0) return "stable";
  const slope = numerator / denominator;

  // Relative slope: change per session as fraction of mean
  const relativeSlope = yMean > 0 ? slope / yMean : 0;

  if (relativeSlope > 0.005) return "progressing";   // >0.5% per session
  if (relativeSlope < -0.005) return "regressing";
  return "stable";
}
