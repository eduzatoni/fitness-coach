import { getRecentWorkouts } from "../hevy/workouts.js";
import { resolveExerciseName } from "../hevy/exercises.js";
import { workingSets } from "../analysis/estimated-1rm.js";
import { sessionMetrics } from "../analysis/progression.js";
import { recommendExercise } from "../analysis/recommendations.js";
import { performanceTrend } from "../analysis/trend.js";
import { detectPlateau } from "../analysis/plateau.js";
import { totalVolume } from "../analysis/volume.js";
import type { HevyWorkout } from "../hevy/types.js";

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
  // Fetch enough workouts to find targetSessions instances of this exercise.
  // Use a generous multiplier (5×) since an exercise may appear in 1-in-5 workouts.
  const limit = Math.min(targetSessions * 5, 100);
  const repRange = args.repRange ?? ([8, 12] as [number, number]);
  const opts = { refresh: args.refresh };

  const workouts = await getRecentWorkouts(limit, opts);
  const resolved = await resolveExerciseName(args.exercise, opts);

  // If template resolution failed, fall back to title match across actual workout history
  const matchesExercise = (workout: HevyWorkout) =>
    workout.exercises.find((e) => {
      if (resolved) return e.exercise_template_id === resolved.id;
      return e.title.toLowerCase().includes(args.exercise.toLowerCase());
    });

  const sessionList = [];
  const recentSessions: RecentSession[] = [];

  for (const workout of [...workouts].reverse()) {
    const ex = matchesExercise(workout);
    if (!ex) continue;

    const ws = workingSets(ex.sets);
    const metrics = sessionMetrics(workout.start_time.slice(0, 10), ws);
    sessionList.push(metrics);

    recentSessions.push({
      date: metrics.date,
      weight: metrics.topWeight,
      repsPerSet: ws.map((s) => s.reps).join("/"),
      totalReps: metrics.totalReps,
      best1RM: metrics.best1RM !== null ? Math.round(metrics.best1RM * 10) / 10 : null,
    });

    if (sessionList.length >= targetSessions) break;
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
  const rec = recommendExercise(sessionList, repRange);

  // e1RM change as fraction between last two sessions
  let e1RMTrend: number | null = null;
  if (prev?.best1RM && latest.best1RM) {
    e1RMTrend = Math.round(((latest.best1RM - prev.best1RM) / prev.best1RM) * 1000) / 1000;
  }

  // Rep trend from last two sessions
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
