import type { HevySet, WorkingSet } from "../hevy/types.js";

/** Extract working sets (exclude warmup). */
export function workingSets(sets: HevySet[]): WorkingSet[] {
  return sets
    .filter((s) => s.type !== "warmup" && s.weight_kg !== null && s.reps !== null && s.reps > 0)
    .map((s) => ({
      weight_kg: s.weight_kg as number,
      reps: s.reps as number,
      type: s.type,
    }));
}

/** Epley 1RM estimate: w * (1 + reps/30). Returns null for 1-rep sets (already a 1RM). */
export function epley1RM(weight_kg: number, reps: number): number {
  if (reps === 1) return weight_kg;
  return weight_kg * (1 + reps / 30);
}

/** Best estimated 1RM across a set of working sets. */
export function best1RM(sets: WorkingSet[]): number | null {
  if (sets.length === 0) return null;
  return Math.max(...sets.map((s) => epley1RM(s.weight_kg, s.reps)));
}

/** Highest weight used in working sets. */
export function topWeight(sets: WorkingSet[]): number | null {
  if (sets.length === 0) return null;
  return Math.max(...sets.map((s) => s.weight_kg));
}
