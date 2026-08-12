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
