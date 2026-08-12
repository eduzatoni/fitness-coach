import { hevyGet, hevyGetAll } from "./client.js";
import type { HevyWorkout } from "./types.js";

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
    // events endpoint returns event objects; filter updated_at >= since
    (events) =>
      (events as unknown as Array<{ workout: HevyWorkout }>)
        .map((e) => e.workout)
        .filter((w) => w.updated_at >= since)
  );
}
