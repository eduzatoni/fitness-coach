import { getRecentWorkouts, collectExerciseSessions } from "../hevy/workouts.js";
import { resolveExerciseName } from "../hevy/exercises.js";
import { workingSets } from "../analysis/estimated-1rm.js";
import { totalVolume } from "../analysis/volume.js";

interface SetRecord {
  type: string;
  weight_kg: number;
  reps: number;
}

interface SessionRecord {
  date: string;
  sets: SetRecord[];
  /** e.g. "10/9/8" — working sets only, for easy display */
  repsPerSet: string;
  topWeight: number | null;
  best1RM: number | null;
  totalReps: number;
  totalVolume: number;
}

export async function getExerciseHistoryTool(args: {
  exercise: string;
  sessions?: number;
  refresh?: boolean;
}): Promise<{ exercise: string; resolvedTitle: string | null; sessions: SessionRecord[] }> {
  const targetSessions = args.sessions ?? 10;
  const limit = Math.min(targetSessions * 5, 100);
  const opts = { refresh: args.refresh };

  const [workouts, resolved] = await Promise.all([
    getRecentWorkouts(limit, opts),
    resolveExerciseName(args.exercise, opts),
  ]);

  // Use shared collector for SessionMetrics, then re-walk for display fields
  const sessionMetricsList = collectExerciseSessions(workouts, resolved, args.exercise, targetSessions);

  // Map back to display records (walk workouts in same order to get set-level data)
  const history: SessionRecord[] = [];
  for (const workout of [...workouts].reverse()) {
    const exercise = workout.exercises.find((e) => {
      if (resolved) return e.exercise_template_id === resolved.id;
      return e.title.toLowerCase().includes(args.exercise.toLowerCase());
    });
    if (!exercise) continue;

    const ws = workingSets(exercise.sets);
    const metrics = sessionMetricsList[history.length];
    if (!metrics) break;

    history.push({
      date: metrics.date,
      sets: ws.map((s) => ({ type: s.type, weight_kg: s.weight_kg, reps: s.reps })),
      repsPerSet: ws.map((s) => s.reps).join("/"),
      topWeight: metrics.topWeight,
      best1RM: metrics.best1RM !== null ? Math.round(metrics.best1RM * 10) / 10 : null,
      totalReps: metrics.totalReps,
      totalVolume: Math.round(totalVolume(ws)),
    });

    if (history.length >= targetSessions) break;
  }

  return {
    exercise: args.exercise,
    resolvedTitle: resolved?.title ?? null,
    sessions: history,
  };
}
