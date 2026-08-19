import { hevyPost } from "../hevy/client.js";
import type { ExerciseTemplateInput, HevyExerciseTemplate } from "../hevy/types.js";

export async function createExerciseTemplateTool(args: {
  exercise: ExerciseTemplateInput;
  confirm?: boolean;
}): Promise<{ preview: ExerciseTemplateInput } | { created: true; id: string; title: string }> {
  if (!args.confirm) {
    return { preview: args.exercise };
  }

  const result = await hevyPost<{ exercise_template: HevyExerciseTemplate }>(
    "/exercise_templates",
    { exercise: args.exercise }
  );
  return { created: true, id: result.exercise_template.id, title: result.exercise_template.title };
}
