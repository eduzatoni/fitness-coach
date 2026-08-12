import type { HevyExerciseTemplate } from "../hevy/types.js";

export type MovementPattern =
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "carry"
  | "isolation"
  | "core"
  | "cardio"
  | "unknown";

/** Infer movement pattern from muscle group + exercise title heuristics. */
export function inferMovementPattern(
  title: string,
  primaryMuscle: string
): MovementPattern {
  const t = title.toLowerCase();
  const m = primaryMuscle.toLowerCase();

  if (m === "chest" || t.includes("bench") || t.includes("push up") || t.includes("chest press")) {
    if (t.includes("incline") || t.includes("overhead")) return "horizontal_push";
    return "horizontal_push";
  }
  if (t.includes("overhead press") || t.includes("shoulder press") || t.includes("military press") || t.includes("arnold")) {
    return "vertical_push";
  }
  if (t.includes("row") || t.includes("chest supported") || t.includes("face pull") || t.includes("rear delt")) {
    return "horizontal_pull";
  }
  if (t.includes("pull up") || t.includes("pullup") || t.includes("chin up") || t.includes("chinup") || t.includes("lat pulldown") || t.includes("pull-down")) {
    return "vertical_pull";
  }
  if (t.includes("squat") || t.includes("leg press") || t.includes("lunge") || t.includes("split squat") || t.includes("hack squat")) {
    return "squat";
  }
  if (t.includes("deadlift") || t.includes("rdl") || t.includes("romanian") || t.includes("good morning") || t.includes("hip thrust") || t.includes("glute bridge")) {
    return "hinge";
  }
  if (t.includes("carry") || t.includes("farmer")) {
    return "carry";
  }
  if (t.includes("plank") || t.includes("crunch") || t.includes("sit up") || t.includes("ab ") || t.includes("core") || m === "core" || m === "abdominals") {
    return "core";
  }
  if (m === "cardio" || t.includes("treadmill") || t.includes("bike") || t.includes("row machine")) {
    return "cardio";
  }
  // Anything in a single-muscle group with a matching title is likely isolation
  if (["biceps", "triceps", "calves", "forearms"].includes(m) ||
      t.includes("curl") || t.includes("extension") || t.includes("kickback") ||
      t.includes("raise") || t.includes("fly") || t.includes("flye")) {
    return "isolation";
  }

  return "unknown";
}

export interface MuscleGroupVolume {
  muscleGroup: string;
  weeklySetEstimate: number;
  exercises: string[];
}

/** Aggregate weekly set estimates per primary muscle group from routine exercises. */
export function aggregateMuscleVolume(
  exercises: Array<{ title: string; sets: number; template?: HevyExerciseTemplate | null }>,
  sessionsPerWeek: number = 1
): MuscleGroupVolume[] {
  const map = new Map<string, { sets: number; exercises: Set<string> }>();

  for (const ex of exercises) {
    const muscle = ex.template?.primary_muscle_group ?? "unknown";
    const entry = map.get(muscle) ?? { sets: 0, exercises: new Set() };
    entry.sets += ex.sets * sessionsPerWeek;
    entry.exercises.add(ex.title);
    map.set(muscle, entry);
  }

  return Array.from(map.entries())
    .map(([muscleGroup, { sets, exercises }]) => ({
      muscleGroup,
      weeklySetEstimate: sets,
      exercises: Array.from(exercises),
    }))
    .sort((a, b) => b.weeklySetEstimate - a.weeklySetEstimate);
}

/** Flag obvious imbalances in the muscle-volume map. Returns human-readable flags. */
export function flagVolumeImbalances(volumes: MuscleGroupVolume[]): string[] {
  const flags: string[] = [];
  const byMuscle = Object.fromEntries(volumes.map((v) => [v.muscleGroup, v.weeklySetEstimate]));

  const chest = byMuscle["chest"] ?? 0;
  const back = (byMuscle["back"] ?? 0) + (byMuscle["lats"] ?? 0);
  const quads = byMuscle["quads"] ?? 0;
  const hamstrings = byMuscle["hamstrings"] ?? 0;
  const biceps = byMuscle["biceps"] ?? 0;
  const triceps = byMuscle["triceps"] ?? 0;
  const shoulders = byMuscle["shoulders"] ?? 0;

  if (chest > 0 && back === 0) flags.push("No direct back work — push/pull imbalance risk.");
  if (chest > 0 && back > 0 && chest / back > 2) flags.push(`Push volume (chest ~${chest} sets/wk) is more than 2× pull volume (back ~${back} sets/wk).`);
  if (quads > 0 && hamstrings === 0) flags.push("Quad work without direct hamstring work — posterior chain may be neglected.");
  if (biceps > 0 && biceps > triceps * 2) flags.push("Biceps volume significantly exceeds triceps — elbow imbalance risk.");
  if (triceps > 0 && triceps > biceps * 2) flags.push("Triceps volume significantly exceeds biceps — elbow imbalance risk.");
  if (shoulders === 0 && chest > 0) flags.push("No direct shoulder work alongside chest training.");

  return flags;
}
