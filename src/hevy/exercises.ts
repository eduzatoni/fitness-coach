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

/** Resolve an exercise name (fuzzy, case-insensitive) to its template id and canonical title. */
export async function resolveExerciseName(
  name: string,
  options: { refresh?: boolean } = {}
): Promise<{ id: string; title: string } | null> {
  const templates = await getAllExerciseTemplates(options);
  const normalized = name.toLowerCase().trim();

  const match = findBestTemplateMatch(templates, normalized);
  if (match) return { id: match.id, title: match.title };

  return null;
}

/**
 * Given a list of templates and a normalized query string, find the best match.
 * Exported for testing.
 */
export function findBestTemplateMatch(
  templates: HevyExerciseTemplate[],
  normalized: string
): HevyExerciseTemplate | null {
  if (!normalized) return null;

  // 1. Exact match
  const exact = templates.find((t) => t.title.toLowerCase() === normalized);
  if (exact) return exact;

  // 2. Starts-with match
  const starts = templates.find((t) => t.title.toLowerCase().startsWith(normalized));
  if (starts) return starts;

  // 3. Contains match
  const contains = templates.find((t) => t.title.toLowerCase().includes(normalized));
  if (contains) return contains;

  // 4. Word-overlap scoring
  const queryWords = normalized.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return null;

  let best: HevyExerciseTemplate | null = null;
  let bestScore = 0;

  for (const t of templates) {
    const titleWords = t.title.toLowerCase().split(/\s+/);
    const matched = queryWords.filter((w) => titleWords.includes(w)).length;
    if (matched === 0) continue;

    // Score = fraction of query words matched, tie-broken by fraction of title words matched
    // (higher title precision = fewer extra words = better fit)
    const recallScore = matched / queryWords.length;
    const precisionScore = matched / titleWords.length;
    const combinedScore = recallScore + precisionScore * 0.1; // recall dominates

    if (combinedScore > bestScore) {
      bestScore = combinedScore;
      best = t;
    }
  }

  // Require at least half the query words to match
  if (best && bestScore >= 0.5) return best;

  return null;
}
