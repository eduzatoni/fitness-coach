import { hevyGet, hevyGetAll } from "./client.js";
import type { HevyWorkout } from "./types.js";
import { workingSets } from "../analysis/estimated-1rm.js";
import { sessionMetrics } from "../analysis/progression.js";
import type { SessionMetrics } from "../analysis/progression.js";

export async function getRecentWorkouts(
  limit: number,
  options: { refresh?: boolean } = {}
): Promise<HevyWorkout[]> {
  // Hevy's max pageSize is 10; fetch enough pages to cover limit
  const pageSize = Math.min(limit, 10);
  const pagesNeeded = Math.ceil(limit / pageSize);
  const results: HevyWorkout[] = [];

  for (let page = 1; page <= pagesNeeded && results.length < limit; page++) {
    const data = await hevyGet<{ workouts: HevyWorkout[]; page_count: number }>(
      "/workouts",
      { page, pageSize },
      options
    );
    results.push(...data.workouts);
    if (page >= data.page_count) break;
  }

  return results.slice(0, limit);
}

export async function getWorkoutById(
  id: string,
  options: { refresh?: boolean } = {}
): Promise<HevyWorkout> {
  return hevyGet<HevyWorkout>(`/workouts/${id}`, {}, options);
}

export async function getWorkoutCount(
  options: { refresh?: boolean } = {}
): Promise<number> {
  const data = await hevyGet<{ workout_count: number }>("/workouts/count", {}, options);
  return data.workout_count;
}

export async function getWorkoutsSince(
  since: string,
  options: { refresh?: boolean } = {}
): Promise<HevyWorkout[]> {
  return hevyGetAll<HevyWorkout>("/workouts/events", "events", 10, options).then(
    (events) =>
      (events as unknown as Array<{ workout: HevyWorkout }>)
        .map((e) => e.workout)
        .filter((w) => new Date(w.updated_at) >= new Date(since))
  );
}

/**
 * Collect per-session metrics for one exercise across a list of workouts.
 * Workouts should be newest-first (as returned by getRecentWorkouts).
 * Returns sessions oldest-first, capped at `limit`.
 */
export function collectExerciseSessions(
  workouts: HevyWorkout[],
  resolved: { id: string; title: string } | null,
  exerciseName: string,
  limit: number
): SessionMetrics[] {
  const sessions: SessionMetrics[] = [];
  for (const workout of [...workouts].reverse()) {
    const ex = workout.exercises.find((e) => {
      if (resolved) return e.exercise_template_id === resolved.id;
      return e.title.toLowerCase().includes(exerciseName.toLowerCase());
    });
    if (!ex) continue;
    const ws = workingSets(ex.sets);
    sessions.push(sessionMetrics(workout.start_time.slice(0, 10), ws));
    if (sessions.length >= limit) break;
  }
  return sessions;
}
