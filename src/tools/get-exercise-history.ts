import { getRecentWorkouts } from "../hevy/workouts.js";
import { resolveExerciseName } from "../hevy/exercises.js";
import { workingSets } from "../analysis/estimated-1rm.js";
import { sessionMetrics } from "../analysis/progression.js";
import { totalVolume } from "../analysis/volume.js";

interface SetRecord {
  type: string;
  weight_kg: number;
  reps: number;
}

interface SessionRecord {
  date: string;
  sets: SetRecord[];
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
  const limit = (args.sessions ?? 10) * 3; // fetch extra workouts since not every one has this exercise
  const workouts = await getRecentWorkouts(limit, { refresh: args.refresh });

  const resolved = await resolveExerciseName(args.exercise, { refresh: args.refresh });

  const history: SessionRecord[] = [];

  for (const workout of [...workouts].reverse()) {
    const exercise = workout.exercises.find((e) => {
      if (resolved) return e.exercise_template_id === resolved.id;
      return e.title.toLowerCase().includes(args.exercise.toLowerCase());
    });
    if (!exercise) continue;

    const ws = workingSets(exercise.sets);
    const metrics = sessionMetrics(workout.start_time.slice(0, 10), ws);

    history.push({
      date: metrics.date,
      sets: ws.map((s) => ({ type: s.type, weight_kg: s.weight_kg, reps: s.reps })),
      topWeight: metrics.topWeight,
      best1RM: metrics.best1RM !== null ? Math.round(metrics.best1RM * 10) / 10 : null,
      totalReps: metrics.totalReps,
      totalVolume: Math.round(totalVolume(ws)),
    });

    if (history.length >= (args.sessions ?? 10)) break;
  }

  return {
    exercise: args.exercise,
    resolvedTitle: resolved?.title ?? null,
    sessions: history,
  };
}
