import { getAllRoutines } from "../hevy/routines.js";
import { getAllExerciseTemplates } from "../hevy/exercises.js";
import { inferMovementPattern, aggregateMuscleVolume, flagVolumeImbalances } from "../analysis/muscle-groups.js";

export async function analyzeRoutineTool(args: {
  id?: string;
  refresh?: boolean;
}): Promise<{
  id: string;
  title: string;
  exerciseCount: number;
  estimatedDurationMinutes: number | null;
  muscleGroupVolume: Array<{ muscleGroup: string; weeklySetEstimate: number; exercises: string[] }>;
  movementPatterns: Record<string, number>;
  totalWorkingSets: number;
  flaggedIssues: string[];
  exercises: Array<{
    title: string;
    sets: number;
    primaryMuscle: string;
    movementPattern: string;
  }>;
}> {
  const opts = { refresh: args.refresh };
  const [routines, templates] = await Promise.all([
    getAllRoutines(opts),
    getAllExerciseTemplates(opts),
  ]);

  const templateById = new Map(templates.map((t) => [t.id, t]));

  let routine = routines[0];
  if (args.id) {
    routine = routines.find((r) => r.id === args.id);
    if (!routine) throw new Error(`Routine not found: ${args.id}`);
  }
  if (!routine) throw new Error("No routines found.");

  const enriched = routine.exercises.map((ex) => {
    const template = templateById.get(ex.exercise_template_id) ?? null;
    const primaryMuscle = template?.primary_muscle_group ?? "unknown";
    const movementPattern = inferMovementPattern(ex.title, primaryMuscle);
    return {
      title: ex.title,
      sets: ex.sets.length,
      primaryMuscle,
      movementPattern,
      template,
    };
  });

  const totalWorkingSets = enriched.reduce((sum, e) => sum + e.sets, 0);

  // Estimate duration: ~3 min per working set on average
  const estimatedDurationMinutes = totalWorkingSets * 3;

  const muscleGroupVolume = aggregateMuscleVolume(enriched);
  const flaggedIssues = flagVolumeImbalances(muscleGroupVolume);

  // Count movement patterns
  const movementPatterns: Record<string, number> = {};
  for (const ex of enriched) {
    movementPatterns[ex.movementPattern] = (movementPatterns[ex.movementPattern] ?? 0) + 1;
  }

  // Flag exercise order issues: isolation before compound
  const firstIsolationIndex = enriched.findIndex((e) => e.movementPattern === "isolation");
  const lastCompoundIndex = enriched.map((e, i) => ({ e, i }))
    .filter(({ e }) => e.movementPattern !== "isolation" && e.movementPattern !== "unknown" && e.movementPattern !== "core")
    .pop()?.i ?? -1;

  if (firstIsolationIndex !== -1 && lastCompoundIndex !== -1 && firstIsolationIndex < lastCompoundIndex) {
    flaggedIssues.push("Some isolation exercises appear before compound lifts — consider moving compounds first.");
  }

  // Flag very high total volume
  if (totalWorkingSets > 25) {
    flaggedIssues.push(`High total working sets (${totalWorkingSets}) — session may be too long or too fatiguing.`);
  }

  return {
    id: routine.id,
    title: routine.title,
    exerciseCount: enriched.length,
    estimatedDurationMinutes,
    muscleGroupVolume,
    movementPatterns,
    totalWorkingSets,
    flaggedIssues,
    exercises: enriched.map(({ title, sets, primaryMuscle, movementPattern }) => ({
      title,
      sets,
      primaryMuscle,
      movementPattern,
    })),
  };
}
