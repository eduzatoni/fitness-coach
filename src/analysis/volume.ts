import type { WorkingSet } from "../hevy/types.js";

/** Total volume (kg × reps) across all working sets. */
export function totalVolume(sets: WorkingSet[]): number {
  return sets.reduce((sum, s) => sum + s.weight_kg * s.reps, 0);
}

/** Number of hard working sets (excludes dropsets optionally counted separately). */
export function hardSetCount(sets: WorkingSet[]): number {
  return sets.filter((s) => s.type === "normal" || s.type === "failure").length;
}

/** Total reps across all working sets. */
export function totalReps(sets: WorkingSet[]): number {
  return sets.reduce((sum, s) => sum + s.reps, 0);
}
