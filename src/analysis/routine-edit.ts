import type {
  HevyRoutine,
  HevyRoutineSet,
  RoutineInput,
  RoutineExerciseInput,
  RoutineSetInput,
  RoutineEdit,
  RoutineDiff,
  ExerciseDiff,
} from "../hevy/types.js";

// ---------------------------------------------------------------------------
// routineToInput — strip server-only fields to produce a writable payload
// ---------------------------------------------------------------------------

export function routineToInput(routine: HevyRoutine): RoutineInput {
  return {
    title: routine.title,
    notes: routine.notes,
    exercises: routine.exercises.map(routineExerciseToInput),
  };
}

function routineExerciseToInput(ex: HevyRoutine["exercises"][number]): RoutineExerciseInput {
  return {
    exercise_template_id: ex.exercise_template_id,
    superset_id: ex.superset_id,
    notes: ex.notes,
    sets: ex.sets.map(routineSetToInput),
  };
}

function routineSetToInput(s: HevyRoutineSet): RoutineSetInput {
  return {
    type: s.type,
    weight_kg: s.weight_kg,
    reps: s.reps,
    distance_meters: s.distance_meters,
    duration_seconds: s.duration_seconds,
  };
}

// ---------------------------------------------------------------------------
// Exercise matching — case-insensitive, fuzzy substring
// ---------------------------------------------------------------------------

function findExerciseIndex(
  exercises: HevyRoutine["exercises"],
  query: string
): number {
  const q = query.toLowerCase().trim();

  // Exact title match
  let idx = exercises.findIndex((e) => e.title.toLowerCase() === q);
  if (idx !== -1) return idx;

  // Contains match
  idx = exercises.findIndex((e) => e.title.toLowerCase().includes(q));
  if (idx !== -1) return idx;

  // Word-overlap fallback
  const queryWords = q.split(/\s+/).filter(Boolean);
  let bestIdx = -1;
  let bestScore = 0;
  for (let i = 0; i < exercises.length; i++) {
    const titleWords = exercises[i]!.title.toLowerCase().split(/\s+/);
    const score = queryWords.filter((w) => titleWords.includes(w)).length;
    if (score > bestScore) { bestScore = score; bestIdx = i; }
  }
  if (bestIdx !== -1 && bestScore > 0) return bestIdx;

  return -1;
}

// ---------------------------------------------------------------------------
// applyRoutineEdit — apply one edit operation to a routine, return payload + diff
// ---------------------------------------------------------------------------

export function applyRoutineEdit(
  routine: HevyRoutine,
  edit: RoutineEdit
): { payload: RoutineInput; diff: RoutineDiff } {
  // Deep-clone via JSON round-trip so we never mutate the input
  const exercises: RoutineExerciseInput[] = routine.exercises.map(routineExerciseToInput);
  const diffExercises: ExerciseDiff[] = [];

  switch (edit.type) {
    case "add_set": {
      const idx = findExerciseIndex(routine.exercises, edit.exercise_title);
      if (idx === -1) throw new Error(`Exercise not found: "${edit.exercise_title}"`);
      const before = exercises[idx]!.sets.length;
      exercises[idx]!.sets.push(edit.set);
      diffExercises.push({
        exercise_template_id: routine.exercises[idx]!.exercise_template_id,
        title: routine.exercises[idx]!.title,
        change: "modified",
        setsBefore: before,
        setsAfter: before + 1,
        notes: `Added 1 set`,
      });
      break;
    }

    case "remove_set": {
      const idx = findExerciseIndex(routine.exercises, edit.exercise_title);
      if (idx === -1) throw new Error(`Exercise not found: "${edit.exercise_title}"`);
      const sets = exercises[idx]!.sets;
      if (sets.length <= 1) {
        throw new Error(`Cannot remove set: "${edit.exercise_title}" has only 1 set left.`);
      }
      const removeIdx = edit.set_index !== undefined ? edit.set_index : sets.length - 1;
      sets.splice(removeIdx, 1);
      diffExercises.push({
        exercise_template_id: routine.exercises[idx]!.exercise_template_id,
        title: routine.exercises[idx]!.title,
        change: "modified",
        setsBefore: sets.length + 1,
        setsAfter: sets.length,
        notes: `Removed 1 set`,
      });
      break;
    }

    case "change_target": {
      const idx = findExerciseIndex(routine.exercises, edit.exercise_title);
      if (idx === -1) throw new Error(`Exercise not found: "${edit.exercise_title}"`);
      const before = exercises[idx]!.sets.length;
      for (const s of exercises[idx]!.sets) {
        if (s.type !== "warmup") {
          if (edit.weight_kg !== undefined) s.weight_kg = edit.weight_kg;
          if (edit.reps !== undefined) s.reps = edit.reps;
        }
      }
      if (edit.rest_seconds !== undefined) exercises[idx]!.rest_seconds = edit.rest_seconds;
      const notes: string[] = [];
      if (edit.weight_kg !== undefined) notes.push(`weight → ${edit.weight_kg}kg`);
      if (edit.reps !== undefined) notes.push(`reps → ${edit.reps}`);
      if (edit.rest_seconds !== undefined) notes.push(`rest → ${edit.rest_seconds}s`);
      diffExercises.push({
        exercise_template_id: routine.exercises[idx]!.exercise_template_id,
        title: routine.exercises[idx]!.title,
        change: "modified",
        setsBefore: before,
        setsAfter: before,
        notes: notes.join(", "),
      });
      break;
    }

    case "add_exercise": {
      const newEx: RoutineExerciseInput = {
        exercise_template_id: edit.exercise_template_id,
        superset_id: null,
        notes: null,
        rest_seconds: edit.rest_seconds ?? null,
        sets: edit.sets ?? [{ type: "normal", weight_kg: null, reps: null }],
      };

      let insertAt = exercises.length;
      if (edit.after_exercise) {
        const afterIdx = findExerciseIndex(routine.exercises, edit.after_exercise);
        if (afterIdx !== -1) insertAt = afterIdx + 1;
      }
      exercises.splice(insertAt, 0, newEx);

      diffExercises.push({
        exercise_template_id: edit.exercise_template_id,
        title: edit.exercise_title,
        change: "added",
        setsBefore: 0,
        setsAfter: newEx.sets.length,
        rest_seconds: edit.rest_seconds ?? null,
      });
      break;
    }

    case "remove_exercise": {
      const idx = findExerciseIndex(routine.exercises, edit.exercise_title);
      if (idx === -1) throw new Error(`Exercise not found: "${edit.exercise_title}"`);
      const removed = exercises.splice(idx, 1)[0]!;
      diffExercises.push({
        exercise_template_id: routine.exercises[idx]!.exercise_template_id,
        title: routine.exercises[idx]!.title,
        change: "removed",
        setsBefore: removed.sets.length,
        setsAfter: 0,
      });
      break;
    }
  }

  return {
    payload: { title: routine.title, notes: routine.notes, exercises },
    diff: { routineTitle: routine.title, exercises: diffExercises },
  };
}

// ---------------------------------------------------------------------------
// summarizeRoutineDiff — human-readable lines for Claude to show the user
// ---------------------------------------------------------------------------

export function summarizeRoutineDiff(diff: RoutineDiff): string[] {
  const lines: string[] = [];
  for (const ex of diff.exercises) {
    switch (ex.change) {
      case "added": {
        const restStr = ex.rest_seconds ? `, ${ex.rest_seconds}s rest` : "";
        lines.push(`Add "${ex.title}" (${ex.setsAfter} set${ex.setsAfter !== 1 ? "s" : ""}${restStr})`);
        break;
      }
      case "removed":
        lines.push(`Remove "${ex.title}"`);
        break;
      case "modified": {
        const setChange =
          ex.setsAfter > ex.setsBefore ? `${ex.setsBefore} → ${ex.setsAfter} sets` :
          ex.setsAfter < ex.setsBefore ? `${ex.setsBefore} → ${ex.setsAfter} sets` :
          `${ex.setsAfter} sets`;
        const detail = ex.notes ? ` (${setChange}; ${ex.notes})` : ` (${setChange})`;
        lines.push(`"${ex.title}"${detail}`);
        break;
      }
    }
  }
  return lines;
}
