import { getRecentWorkouts, getWorkoutById } from "../hevy/workouts.js";
import { resolveExerciseById } from "../hevy/exercises.js";
import { workingSets } from "../analysis/estimated-1rm.js";
import { sessionMetrics, compareSessionPair } from "../analysis/progression.js";
import { recommendExercise } from "../analysis/recommendations.js";
import { inferMovementPattern } from "../analysis/muscle-groups.js";
import { totalVolume } from "../analysis/volume.js";

interface ExerciseSummary {
  title: string;
  sets: Array<{ weight_kg: number | null; reps: number | null; type: string }>;
  workingSets: number;
  topWeight: number | null;
  best1RM: number | null;
  totalVolume: number;
  vsLastSession: {
    weightChange: "increased" | "decreased" | "same" | "no_previous";
    repChange: "more" | "fewer" | "same" | "no_previous";
    e1RMChange: "improved" | "declined" | "same" | "no_previous";
  };
  recommendation: {
    action: string;
    target: string;
    reason: string;
  };
}

interface AnalyzeWorkoutResult {
  id: string;
  title: string;
  date: string;
  durationMinutes: number;
  exercises: ExerciseSummary[];
  overallNotes: string[];
}

export async function analyzeWorkoutTool(args: {
  id?: string;
  refresh?: boolean;
}): Promise<AnalyzeWorkoutResult> {
  const opts = { refresh: args.refresh };

  // Get target workout
  let workout;
  if (args.id) {
    workout = await getWorkoutById(args.id, opts);
  } else {
    const recent = await getRecentWorkouts(1, opts);
    if (recent.length === 0) throw new Error("No workouts found.");
    workout = recent[0]!;
  }

  // Get previous workouts for comparison (fetch enough to find last occurrence of each exercise)
  const prevWorkouts = await getRecentWorkouts(20, opts);
  const prevExcludingCurrent = prevWorkouts.filter((w) => w.id !== workout.id);

  const start = new Date(workout.start_time);
  const end = new Date(workout.end_time);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  const exercises: ExerciseSummary[] = [];
  const overallNotes: string[] = [];

  for (const ex of workout.exercises) {
    const ws = workingSets(ex.sets);
    const currMetrics = sessionMetrics(workout.start_time.slice(0, 10), ws);

    // Find last session that included this exercise
    let vsLast: ExerciseSummary["vsLastSession"] = {
      weightChange: "no_previous",
      repChange: "no_previous",
      e1RMChange: "no_previous",
    };
    let recommendation = { action: "INSUFFICIENT_DATA", target: "—", reason: "No prior data." };

    const prevSessions = [];
    for (const pw of prevExcludingCurrent) {
      const prevEx = pw.exercises.find(
        (e) => e.exercise_template_id === ex.exercise_template_id
      );
      if (prevEx) {
        const prevWs = workingSets(prevEx.sets);
        prevSessions.push(sessionMetrics(pw.start_time.slice(0, 10), prevWs));
      }
    }
    // prevSessions is newest-first; reverse for analysis (oldest first)
    prevSessions.reverse();

    if (prevSessions.length > 0) {
      const prevMetrics = prevSessions[prevSessions.length - 1]!;
      const pair = compareSessionPair(prevMetrics, currMetrics);

      vsLast = {
        weightChange: pair.weightIncreased ? "increased" : pair.weightDecreased ? "decreased" : "same",
        repChange: pair.repProgressPositive ? "more" : pair.repProgressNegative ? "fewer" : "same",
        e1RMChange: pair.e1RMImproved ? "improved" : pair.e1RMDeclined ? "declined" : "same",
      };

      const allSessions = [...prevSessions, currMetrics];
      const template = await resolveExerciseById(ex.exercise_template_id, opts);
      const primaryMuscle = template?.primary_muscle_group ?? "";
      const movementPattern = template ? inferMovementPattern(template.title, primaryMuscle) : undefined;
      const rec = recommendExercise(allSessions, undefined, { movementPattern, primaryMuscle, equipment: template?.equipment_category });
      recommendation = rec.recommendation;

      if (rec.plateaued) {
        overallNotes.push(`${ex.title} has been plateauing — consider a change.`);
      }
    }

    exercises.push({
      title: ex.title,
      sets: ex.sets.map((s) => ({ weight_kg: s.weight_kg, reps: s.reps, type: s.type })),
      workingSets: ws.length,
      topWeight: currMetrics.topWeight,
      best1RM: currMetrics.best1RM !== null ? Math.round(currMetrics.best1RM * 10) / 10 : null,
      totalVolume: Math.round(totalVolume(ws)),
      vsLastSession: vsLast,
      recommendation,
    });
  }

  return {
    id: workout.id,
    title: workout.title,
    date: workout.start_time.slice(0, 10),
    durationMinutes,
    exercises,
    overallNotes,
  };
}
