// Load increment math for the evidence-based progression engine.
// Sources:
//   ACSM Position Stand (2009) — 2–10% load increment band, increment by muscle group
//   NSCA Essentials of S&C — load progression tables, 2-for-2 rule context
//   StrongLifts 5×5 — concrete per-category increments (5 lb upper / 10 lb lower)
//   Renaissance Periodization — deload percentage guidance

import type { MovementPattern } from "./muscle-groups.js";

export type IncrementClass = "large_compound" | "upper_compound" | "isolation";
export type TrainingGoal = "strength" | "hypertrophy" | "endurance";

// Nominal absolute increments (kg) by movement class
export const INCREMENT_KG: Record<IncrementClass, number> = {
  large_compound: 5,    // squat / deadlift / leg press / hip hinge
  upper_compound: 2.5,  // bench / OHP / row / pulldown
  isolation: 2.5,       // curl / extension / raise / fly — nominal; clamped down for light loads
};

// Smallest practical plate step for rounding by class
export const PLATE_STEP_KG: Record<IncrementClass, number> = {
  large_compound: 2.5,
  upper_compound: 2.5,
  isolation: 0.5,
};

// ACSM 2–10% band
export const MIN_INCREMENT_PCT = 0.02;
export const MAX_INCREMENT_PCT = 0.10;

export const DELOAD_PCT = 0.10;
export const LAYOFF_START_PCT = 0.10;

export const REP_RANGE_FOR: Record<TrainingGoal, [number, number]> = {
  strength: [3, 5],
  hypertrophy: [8, 12],
  endurance: [15, 20],
};

/** Round value to nearest multiple of step. */
export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Map a MovementPattern to an IncrementClass. Defaults to upper_compound. */
export function movementClassFor(pattern: MovementPattern | undefined): IncrementClass {
  if (pattern === "squat" || pattern === "hinge") return "large_compound";
  if (
    pattern === "horizontal_push" ||
    pattern === "vertical_push" ||
    pattern === "horizontal_pull" ||
    pattern === "vertical_pull"
  ) return "upper_compound";
  if (pattern === "isolation") return "isolation";
  // carry, core, cardio, unknown, undefined → safe default (2.5 kg nominal, clamped)
  return "upper_compound";
}

// High-rep-biased primary muscles (core + calves respond well to higher volume/reps)
const HIGH_REP_MUSCLES = new Set(["abdominals", "calves", "abs", "core"]);

/**
 * Evidence-based rep range for an exercise by role.
 * - Core pattern or high-rep muscle (abs, calves) → endurance-leaning [12, 20]
 * - Everything else → hypertrophy [8, 12] (best-supported general range for "build strength and muscle")
 * Strength [3, 5] is opt-in via explicit repRange/goal arg on the tool call.
 */
export function repRangeForExercise(
  pattern: MovementPattern | undefined,
  primaryMuscle?: string
): [number, number] {
  if (pattern === "core") return [12, 20];
  if (primaryMuscle && HIGH_REP_MUSCLES.has(primaryMuscle.toLowerCase())) return [12, 20];
  return [8, 12];
}

/**
 * Compute the load increment for a given class and current weight.
 * Starts from the nominal increment, then clamps to the ACSM 2–10% band.
 */
export function incrementFor(cls: IncrementClass, currentWeightKg: number): number {
  const nominal = INCREMENT_KG[cls];
  const min = currentWeightKg * MIN_INCREMENT_PCT;
  const max = currentWeightKg * MAX_INCREMENT_PCT;
  return Math.min(Math.max(nominal, min), max);
}

/**
 * Next working weight: current + clamped increment, rounded to the plate step.
 * Guarantees forward progress — if rounding would return the current weight, bump by one step.
 */
export function nextWeight(currentWeightKg: number, cls: IncrementClass): number {
  const delta = incrementFor(cls, currentWeightKg);
  const step = PLATE_STEP_KG[cls];
  const candidate = roundToStep(currentWeightKg + delta, step);
  // Guard: ensure we always move forward
  if (candidate <= currentWeightKg) return currentWeightKg + step;
  return candidate;
}

/**
 * Reduced working weight (for deload / layoff reintroduction).
 * Defaults to DELOAD_PCT (10%), rounded to the plate step.
 */
export function reduceWeight(
  currentWeightKg: number,
  cls: IncrementClass,
  pct: number = DELOAD_PCT
): number {
  const step = PLATE_STEP_KG[cls];
  return roundToStep(currentWeightKg * (1 - pct), step);
}
