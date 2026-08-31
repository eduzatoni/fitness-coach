import { hevyPost, invalidateCache } from "../hevy/client.js";
import { resolveExerciseName } from "../hevy/exercises.js";
import type { WorkoutInput, WorkoutExerciseInput, HevyWorkout } from "../hevy/types.js";

export async function logWorkoutTool(args: {
  workout: WorkoutInput & {
    exercises: Array<WorkoutExerciseInput & { exercise_name?: string }>;
  };
  confirm?: boolean;
  refresh?: boolean;
}): Promise<
  | { preview: WorkoutInput }
  | { logged: true; id: string; title: string }
> {
  // Resolve any exercise_name fields to template IDs
  const resolvedExercises: WorkoutExerciseInput[] = [];
  for (const ex of args.workout.exercises) {
    if (ex.exercise_name && !ex.exercise_template_id) {
      const resolved = await resolveExerciseName(ex.exercise_name, { refresh: args.refresh });
      if (!resolved) {
        throw new Error(
          `Could not find a Hevy exercise template matching "${ex.exercise_name}". ` +
            `Try a different name or provide the exercise_template_id directly.`
        );
      }
      const { exercise_name: _name, ...rest } = ex;
      resolvedExercises.push({ ...rest, exercise_template_id: resolved.id });
    } else {
      const { exercise_name: _name, ...rest } = ex;
      resolvedExercises.push(rest as WorkoutExerciseInput);
    }
  }

  const workout: WorkoutInput = { ...args.workout, exercises: resolvedExercises };

  if (!args.confirm) {
    return { preview: workout };
  }

  const result = await hevyPost<{ workout: HevyWorkout }>("/workouts", { workout });
  invalidateCache("/workouts");
  return { logged: true, id: result.workout.id, title: result.workout.title };
}
