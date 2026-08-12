import type { SessionMetrics } from "./progression.js";

export interface PlateauResult {
  isPlateaued: boolean;
  sessionCount: number;
  reason: string;
}

const MIN_SESSIONS_FOR_PLATEAU = 4;
const MAX_RELATIVE_VARIANCE = 0.02; // 2% variance in e1RM considered "flat"
const MIN_DAYS_BETWEEN = 3;          // ignore back-to-back sessions (deload, travel, etc.)

/**
 * Detect plateau from an ordered list of sessions (oldest first).
 * Only triggers after MIN_SESSIONS_FOR_PLATEAU properly spaced sessions with flat metrics.
 */
export function detectPlateau(sessions: SessionMetrics[]): PlateauResult {
  if (sessions.length < MIN_SESSIONS_FOR_PLATEAU) {
    return {
      isPlateaued: false,
      sessionCount: sessions.length,
      reason: `Insufficient data (${sessions.length} sessions, need ${MIN_SESSIONS_FOR_PLATEAU}).`,
    };
  }

  // Filter to properly spaced sessions
  const spaced = properlySpaced(sessions, MIN_DAYS_BETWEEN);

  if (spaced.length < MIN_SESSIONS_FOR_PLATEAU) {
    return {
      isPlateaued: false,
      sessionCount: sessions.length,
      reason: "Sessions too close together to assess plateau.",
    };
  }

  // Look at the most recent MIN_SESSIONS_FOR_PLATEAU spaced sessions
  const recent = spaced.slice(-MIN_SESSIONS_FOR_PLATEAU);

  const e1RMs = recent.map((s) => s.best1RM ?? 0).filter((v) => v > 0);
  if (e1RMs.length < MIN_SESSIONS_FOR_PLATEAU) {
    return { isPlateaued: false, sessionCount: sessions.length, reason: "Missing e1RM data." };
  }

  const first = e1RMs[0]!;
  const last = e1RMs[e1RMs.length - 1]!;
  const netGain = (last - first) / first; // relative improvement first→last

  // If there's a meaningful net gain across the window, it's not a plateau
  if (netGain > MAX_RELATIVE_VARIANCE) {
    return {
      isPlateaued: false,
      sessionCount: sessions.length,
      reason: `e1RM improved ${(netGain * 100).toFixed(1)}% over the window — still progressing.`,
    };
  }

  const mean = e1RMs.reduce((a, b) => a + b, 0) / e1RMs.length;
  const variance = e1RMs.reduce((sum, v) => sum + Math.abs(v - mean) / mean, 0) / e1RMs.length;

  if (variance <= MAX_RELATIVE_VARIANCE) {
    return {
      isPlateaued: true,
      sessionCount: recent.length,
      reason: `e1RM flat within ${(variance * 100).toFixed(1)}% over last ${recent.length} spaced sessions.`,
    };
  }

  return {
    isPlateaued: false,
    sessionCount: sessions.length,
    reason: `e1RM variance ${(variance * 100).toFixed(1)}% across recent sessions — not flat.`,
  };
}

function properlySpaced(sessions: SessionMetrics[], minDays: number): SessionMetrics[] {
  if (sessions.length === 0) return [];
  const result: SessionMetrics[] = [sessions[0]!];
  for (let i = 1; i < sessions.length; i++) {
    const prev = result[result.length - 1]!;
    const daysDiff =
      (new Date(sessions[i]!.date).getTime() - new Date(prev.date).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysDiff >= minDays) result.push(sessions[i]!);
  }
  return result;
}
