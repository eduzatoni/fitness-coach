import { hevyGetAll } from "./client.js";
import type { HevyExerciseTemplate } from "./types.js";

let templateCache: HevyExerciseTemplate[] | null = null;

export async function getAllExerciseTemplates(
  options: { refresh?: boolean } = {}
): Promise<HevyExerciseTemplate[]> {
  if (templateCache && !options.refresh) return templateCache;
  const templates = await hevyGetAll<HevyExerciseTemplate>(
    "/exercise_templates",
    "exercise_templates",
    100,
    options
  );
  templateCache = templates;
  return templates;
}

/** Resolve an exercise name (fuzzy, case-insensitive) to its template id. */
export async function resolveExerciseName(
  name: string,
  options: { refresh?: boolean } = {}
): Promise<{ id: string; title: string } | null> {
  const templates = await getAllExerciseTemplates(options);
  const normalized = name.toLowerCase().trim();

  // Exact match first
  const exact = templates.find((t) => t.title.toLowerCase() === normalized);
  if (exact) return { id: exact.id, title: exact.title };

  // Starts-with match
  const starts = templates.find((t) => t.title.toLowerCase().startsWith(normalized));
  if (starts) return { id: starts.id, title: starts.title };

  // Contains match
  const contains = templates.find((t) => t.title.toLowerCase().includes(normalized));
  if (contains) return { id: contains.id, title: contains.title };

  // Word-overlap: score by how many words from the query appear in the title
  const queryWords = normalized.split(/\s+/);
  let best: HevyExerciseTemplate | null = null;
  let bestScore = 0;
  for (const t of templates) {
    const titleWords = t.title.toLowerCase().split(/\s+/);
    const score = queryWords.filter((w) => titleWords.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  if (best && bestScore > 0) return { id: best.id, title: best.title };

  return null;
}
