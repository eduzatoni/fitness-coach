// Raw Hevy API types (matches the /v1 REST API exactly)

export type SetType = "normal" | "warmup" | "dropset" | "failure";

export interface HevySet {
  index: number;
  type: SetType;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
}

export interface HevyExercise {
  index: number;
  title: string;
  notes: string | null;
  exercise_template_id: string;
  superset_id: string | null;
  sets: HevySet[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  description: string | null;
  start_time: string; // ISO 8601
  end_time: string;   // ISO 8601
  updated_at: string;
  created_at: string;
  exercises: HevyExercise[];
}

export interface HevyExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  is_custom: boolean;
}

export interface HevyRoutineSet {
  index: number;
  type: SetType;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
}

export interface HevyRoutineExercise {
  index: number;
  title: string;
  notes: string | null;
  exercise_template_id: string;
  superset_id: string | null;
  sets: HevyRoutineSet[];
}

export interface HevyRoutine {
  id: string;
  title: string;
  notes: string | null;
  updated_at: string;
  created_at: string;
  exercises: HevyRoutineExercise[];
}

export interface HevyRoutineFolder {
  id: number;
  title: string;
  updated_at: string;
  created_at: string;
}

/** Request body for creating a routine folder. */
export interface RoutineFolderInput {
  title: string;
}

export interface PaginatedResponse<T> {
  page: number;
  page_count: number;
  workouts?: T[];
  routines?: T[];
  exercise_templates?: T[];
  routine_folders?: T[];
}

// Recommendation action categories (deterministic engine → Claude)
export type RecommendationAction =
  | "INCREASE_WEIGHT"
  | "INCREASE_REPS"
  | "MAINTAIN"
  | "MONITOR"
  | "REDUCE_WEIGHT"
  | "ADD_SET"
  | "REMOVE_SET"
  | "CONSIDER_REPLACEMENT"
  | "CONSIDER_ROUTINE_CHANGE"
  | "INSUFFICIENT_DATA";

export type PerformanceTrend = "progressing" | "stable" | "regressing" | "insufficient_data";

export interface Recommendation {
  action: RecommendationAction;
  target: string;
  reason: string;
}

// Normalized working set (warmups excluded)
export interface WorkingSet {
  weight_kg: number;
  reps: number;
  type: SetType;
}

// ---------------------------------------------------------------------------
// Write payload types (create/update request bodies — distinct from GET shapes)
// ---------------------------------------------------------------------------

/** A set as sent in a create/update routine request body. */
export interface RoutineSetInput {
  type: SetType;
  weight_kg: number | null;
  reps: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
}

/** An exercise as sent in a create/update routine request body. */
export interface RoutineExerciseInput {
  exercise_template_id: string;
  superset_id?: string | null;
  notes?: string | null;
  rest_seconds?: number | null;
  sets: RoutineSetInput[];
}

/** The top-level body for creating or updating a routine. */
export interface RoutineInput {
  title: string;
  notes?: string | null;
  exercises: RoutineExerciseInput[];
}

// ---------------------------------------------------------------------------
// Routine edit operations (discriminated union — one operation per call)
// ---------------------------------------------------------------------------

export interface AddExerciseEdit {
  type: "add_exercise";
  /** Resolved template id of the exercise to add. */
  exercise_template_id: string;
  /** Human-readable title for diff output. */
  exercise_title: string;
  /** Sets to add with the exercise. Defaults to one empty set if omitted. */
  sets?: RoutineSetInput[];
  /** Insert after this exercise title (case-insensitive). Appends at end if omitted. */
  after_exercise?: string;
}

export interface RemoveExerciseEdit {
  type: "remove_exercise";
  /** Title of exercise to remove (case-insensitive, fuzzy). */
  exercise_title: string;
}

export interface AddSetEdit {
  type: "add_set";
  /** Title of exercise to add a set to (case-insensitive, fuzzy). */
  exercise_title: string;
  set: RoutineSetInput;
}

export interface RemoveSetEdit {
  type: "remove_set";
  /** Title of exercise to remove a set from. */
  exercise_title: string;
  /** 0-based index of the set to remove. Removes the last set if omitted. */
  set_index?: number;
}

export interface ChangeTargetEdit {
  type: "change_target";
  /** Title of exercise to update (case-insensitive, fuzzy). */
  exercise_title: string;
  /** If provided, update weight_kg on all working sets. */
  weight_kg?: number | null;
  /** If provided, update reps on all working sets. */
  reps?: number | null;
}

export type RoutineEdit =
  | AddExerciseEdit
  | RemoveExerciseEdit
  | AddSetEdit
  | RemoveSetEdit
  | ChangeTargetEdit;

// ---------------------------------------------------------------------------
// Routine diff (describes what changed between old and new routine)
// ---------------------------------------------------------------------------

export interface ExerciseDiff {
  exercise_template_id: string;
  title: string;
  change: "added" | "removed" | "modified";
  setsBefore: number;
  setsAfter: number;
  notes?: string;
}

export interface RoutineDiff {
  routineTitle: string;
  exercises: ExerciseDiff[];
}
