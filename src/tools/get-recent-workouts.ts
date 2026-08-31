import { getRecentWorkouts } from "../hevy/workouts.js";
import type { HevyWorkout } from "../hevy/types.js";

interface TrimmedSet {
  type: string;
  weight_kg: number | null;
  reps: number | null;
  rpe: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
}

interface TrimmedExercise {
  title: string;
  sets: TrimmedSet[];
}

interface TrimmedWorkout {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  exercises: TrimmedExercise[];
}

function trimWorkout(w: HevyWorkout): TrimmedWorkout {
  const start = new Date(w.start_time);
  const end = new Date(w.end_time);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  return {
    id: w.id,
    title: w.title,
    date: w.start_time.slice(0, 10),
    durationMinutes,
    exercises: w.exercises.map((e) => ({
      title: e.title,
      sets: e.sets.map((s) => ({
        type: s.type,
        weight_kg: s.weight_kg,
        reps: s.reps,
        rpe: s.rpe,
        distance_meters: s.distance_meters,
        duration_seconds: s.duration_seconds,
      })),
    })),
  };
}

export async function getRecentWorkoutsTool(
  args: { limit?: number; refresh?: boolean } = {}
): Promise<{ workouts: TrimmedWorkout[] }> {
  const limit = args.limit ?? 5;
  const workouts = await getRecentWorkouts(limit, { refresh: args.refresh });
  return { workouts: workouts.map(trimWorkout) };
}
