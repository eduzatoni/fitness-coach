import { fetchWikiHtml } from "../wiki/fetch.js";
import { parseWikiRoutine } from "../wiki/parse.js";
import { resolveExerciseName } from "../hevy/exercises.js";
import type { RoutineInput, RoutineExerciseInput, RoutineSetInput } from "../hevy/types.js";

export interface WikiResolutionEntry {
  rawName: string;
  matched: { id: string; title: string } | null;
  sets: number;
  reps: number;
  isAmrap: boolean;
}

export async function importWikiRoutineTool(args: {
  url: string;
  refresh?: boolean;
}): Promise<{
  draft: RoutineInput;
  resolution: WikiResolutionEntry[];
  unmatched: string[];
  progressionNotes: string[];
  sourceUrl: string;
}> {
  const html = await fetchWikiHtml(args.url);
  const parsed = parseWikiRoutine(html, args.url);

  const resolution: WikiResolutionEntry[] = [];
  const exercises: RoutineExerciseInput[] = [];
  const unmatched: string[] = [];

  for (const ex of parsed.exercises) {
    const matched = await resolveExerciseName(ex.rawName, { refresh: args.refresh });

    resolution.push({
      rawName: ex.rawName,
      matched,
      sets: ex.sets,
      reps: ex.reps,
      isAmrap: ex.isAmrap,
    });

    if (!matched) {
      unmatched.push(ex.rawName);
      continue;
    }

    const sets: RoutineSetInput[] = Array.from({ length: ex.sets }, () => ({
      type: "normal" as const,
      weight_kg: null,
      reps: ex.reps,
    }));

    exercises.push({
      exercise_template_id: matched.id,
      notes: ex.isAmrap ? `Last set AMRAP (${ex.reps}+)` : null,
      sets,
    });
  }

  const notesText = parsed.notes.join("\n") || null;

  const draft: RoutineInput = {
    title: parsed.title,
    notes: notesText,
    exercises,
  };

  return {
    draft,
    resolution,
    unmatched,
    progressionNotes: parsed.notes,
    sourceUrl: args.url,
  };
}
