import { getRecentWorkouts, collectExerciseSessions } from "../hevy/workouts.js";
import { resolveExerciseName } from "../hevy/exercises.js";
import { workingSets } from "../analysis/estimated-1rm.js";
import { recommendExercise } from "../analysis/recommendations.js";
import { performanceTrend } from "../analysis/trend.js";
import { detectPlateau } from "../analysis/plateau.js";
import { inferMovementPattern } from "../analysis/muscle-groups.js";
import { repRangeForExercise, REP_RANGE_FOR, type TrainingGoal } from "../analysis/load-increment.js";

interface RecentSession {
  date: string;
  weight: number | null;
  /** e.g. "10/9/8" — working sets only */
  repsPerSet: string;
  totalReps: number;
  best1RM: number | null;
}

export async function analyzeExerciseTool(args: {
  exercise: string;
  sessions?: number;
  repRange?: [number, number];
  goal?: TrainingGoal;
  refresh?: boolean;
}): Promise<{
  exercise: string;
  resolvedTitle: string | null;
  sessionsAnalyzed: number;
  trend: string;
  currentWorkingWeight: number | null;
  previousWorkingWeight: number | null;
  repTrend: "positive" | "negative" | "neutral" | "insufficient_data";
  estimated1RMTrend: number | null;
  plateauSessions: number;
  recentSessions: RecentSession[];
  recommendation: { action: string; target: string; reason: string };
}> {
  const targetSessions = args.sessions ?? 10;
  const limit = Math.min(targetSessions * 5, 100);
  const opts = { refresh: args.refresh };

  const [workouts, resolved] = await Promise.all([
    getRecentWorkouts(limit, opts),
    resolveExerciseName(args.exercise, opts),
  ]);

  // Derive movement context from the resolved Hevy template
  const primaryMuscle = resolved?.primary_muscle_group ?? "";
  const movementPattern = resolved
    ? inferMovementPattern(resolved.title, primaryMuscle)
    : undefined;

  // Rep range priority: explicit repRange arg > goal arg > auto-assign by exercise role
  const repRange: [number, number] =
    args.repRange ??
    (args.goal ? REP_RANGE_FOR[args.goal] : null) ??
    repRangeForExercise(movementPattern, primaryMuscle);

  // Use shared session collector for the SessionMetrics list
  const sessionList = collectExerciseSessions(workouts, resolved, args.exercise, targetSessions);

  // Build display-friendly recentSessions (needs repsPerSet, so re-walk workouts)
  const recentSessions: RecentSession[] = [];
  for (const workout of [...workouts].reverse()) {
    const ex = workout.exercises.find((e) => {
      if (resolved) return e.exercise_template_id === resolved.id;
      return e.title.toLowerCase().includes(args.exercise.toLowerCase());
    });
    if (!ex) continue;
    const ws = workingSets(ex.sets);
    recentSessions.push({
      date: workout.start_time.slice(0, 10),
      weight: ws.length > 0 ? Math.max(...ws.map((s) => s.weight_kg)) : null,
      repsPerSet: ws.map((s) => s.reps).join("/"),
      totalReps: ws.reduce((s, x) => s + x.reps, 0),
      best1RM: ws.length > 0
        ? Math.round(Math.max(...ws.map((s) => s.weight_kg * (s.reps === 1 ? 1 : 1 + s.reps / 30))) * 10) / 10
        : null,
    });
    if (recentSessions.length >= targetSessions) break;
  }

  if (sessionList.length === 0) {
    return {
      exercise: args.exercise,
      resolvedTitle: resolved?.title ?? null,
      sessionsAnalyzed: 0,
      trend: "insufficient_data",
      currentWorkingWeight: null,
      previousWorkingWeight: null,
      repTrend: "insufficient_data",
      estimated1RMTrend: null,
      plateauSessions: 0,
      recentSessions: [],
      recommendation: {
        action: "INSUFFICIENT_DATA",
        target: "—",
        reason: "No sessions found for this exercise.",
      },
    };
  }

  const latest = sessionList[sessionList.length - 1]!;
  const prev = sessionList.length >= 2 ? sessionList[sessionList.length - 2]! : null;

  const trend = performanceTrend(sessionList);
  const plateau = detectPlateau(sessionList);
  const rec = recommendExercise(sessionList, repRange, { movementPattern, primaryMuscle, goal: args.goal });

  let e1RMTrend: number | null = null;
  if (prev?.best1RM && latest.best1RM) {
    e1RMTrend = Math.round(((latest.best1RM - prev.best1RM) / prev.best1RM) * 1000) / 1000;
  }

  let repTrend: "positive" | "negative" | "neutral" | "insufficient_data" = "insufficient_data";
  if (prev) {
    if (latest.totalReps > prev.totalReps) repTrend = "positive";
    else if (latest.totalReps < prev.totalReps) repTrend = "negative";
    else repTrend = "neutral";
  }

  return {
    exercise: args.exercise,
    resolvedTitle: resolved?.title ?? null,
    sessionsAnalyzed: sessionList.length,
    trend,
    currentWorkingWeight: latest.topWeight,
    previousWorkingWeight: prev?.topWeight ?? null,
    repTrend,
    estimated1RMTrend: e1RMTrend,
    plateauSessions: plateau.isPlateaued ? plateau.sessionCount : 0,
    recentSessions,
    recommendation: rec.recommendation,
  };
}
