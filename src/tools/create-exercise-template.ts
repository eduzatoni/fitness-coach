import { getApiKey } from "../hevy/client.js";
import type { ExerciseTemplateInput, HevyExerciseTemplate } from "../hevy/types.js";

const BASE_URL = "https://api.hevyapp.com/v1";

export async function createExerciseTemplateTool(args: {
  exercise: ExerciseTemplateInput;
  confirm?: boolean;
}): Promise<{ preview: ExerciseTemplateInput } | { created: true; id: string; title: string }> {
  if (!args.confirm) {
    return { preview: args.exercise };
  }

  // The POST /exercise_templates endpoint returns a bare UUID string, not JSON.
  const res = await fetch(`${BASE_URL}/exercise_templates`, {
    method: "POST",
    headers: { "api-key": getApiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({ exercise: args.exercise }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hevy API error ${res.status} for POST /exercise_templates: ${text}`);
  }

  const id = (await res.text()).trim();
  return { created: true, id, title: args.exercise.title };
}
