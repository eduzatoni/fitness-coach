import { getRecentWorkouts } from "../hevy/workouts.js";
import { workingSets } from "../analysis/estimated-1rm.js";
import { sessionMetrics } from "../analysis/progression.js";
import { detectPlateau } from "../analysis/plateau.js";
import { recommendExercise } from "../analysis/recommendations.js";
import { totalVolume } from "../analysis/volume.js";
import { inferMovementPattern } from "../analysis/muscle-groups.js";

interface ExerciseSummary {
  title: string;
  sessionCount: number;
  lastSeen: string;
  trend: string;
  plateaued: boolean;
  recommendation: string;
}

interface WeeklyVolume {
  weekStart: string;
  totalVolume: number;
  workoutCount: number;
  musclesHit: string[];
}

export async function getTrainingSummaryTool(args: {
  months?: number;
  refresh?: boolean;
}): Promise<{
  periodDays: number;
  totalWorkouts: number;
  workoutsPerWeek: number;
  firstWorkoutDate: string | null;
  lastWorkoutDate: string | null;
  daysSinceLastWorkout: number | null;
  topExercises: ExerciseSummary[];
  plateauedExercises: string[];
  weeklyVolume: WeeklyVolume[];
  muscleGroupFrequency: Record<string, number>;
  flags: string[];
}> {
  const months = args.months ?? 3;
  const periodDays = months * 30;
  const opts = { refresh: args.refresh };

  // Fetch enough workouts to cover the period (assume max 7 workouts/week)
  const limit = Math.min(Math.ceil(periodDays / 7) * 7, 100);
  const workouts = await getRecentWorkouts(limit, opts);

  if (workouts.length === 0) {
    return {
      periodDays,
      totalWorkouts: 0,
      workoutsPerWeek: 0,
      firstWorkoutDate: null,
      lastWorkoutDate: null,
      daysSinceLastWorkout: null,
      topExercises: [],
      plateauedExercises: [],
      weeklyVolume: [],
      muscleGroupFrequency: {},
      flags: ["No workouts found."],
    };
  }

  // Filter to period (workouts are newest-first)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  const inPeriod = workouts.filter((w) => new Date(w.start_time) >= cutoffDate);

  const totalCount = inPeriod.length;
  const firstDate = inPeriod.length > 0 ? inPeriod[inPeriod.length - 1]!.start_time.slice(0, 10) : null;
  const lastDate = inPeriod.length > 0 ? inPeriod[0]!.start_time.slice(0, 10) : null;

  const daysSinceLast = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const workoutsPerWeek = totalCount > 0 ? Math.round((totalCount / periodDays) * 7 * 10) / 10 : 0;

  // Build per-exercise session history
  const exerciseMap = new Map<string, { sessions: ReturnType<typeof sessionMetrics>[]; lastSeen: string }>();

  for (const workout of [...inPeriod].reverse()) {
    for (const ex of workout.exercises) {
      const ws = workingSets(ex.sets);
      const metrics = sessionMetrics(workout.start_time.slice(0, 10), ws);
      const entry = exerciseMap.get(ex.title) ?? { sessions: [], lastSeen: "" };
      entry.sessions.push(metrics);
      entry.lastSeen = workout.start_time.slice(0, 10);
      exerciseMap.set(ex.title, entry);
    }
  }

  // Top exercises by session frequency
  const topExercises: ExerciseSummary[] = Array.from(exerciseMap.entries())
    .sort((a, b) => b[1].sessions.length - a[1].sessions.length)
    .slice(0, 10)
    .map(([title, { sessions, lastSeen }]) => {
      const plateau = detectPlateau(sessions);
      const rec = recommendExercise(sessions);
      return {
        title,
        sessionCount: sessions.length,
        lastSeen,
        trend: sessions.length >= 3
          ? (rec.trend ?? "insufficient_data")
          : "insufficient_data",
        plateaued: plateau.isPlateaued,
        recommendation: rec.recommendation.action,
      };
    });

  const plateauedExercises = topExercises
    .filter((e) => e.plateaued)
    .map((e) => e.title);

  // Weekly volume buckets (most recent first from workouts)
  const weeklyMap = new Map<string, { volume: number; count: number; muscles: Set<string> }>();
  for (const workout of inPeriod) {
    const d = new Date(workout.start_time);
    // ISO week start (Monday)
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
    const weekKey = d.toISOString().slice(0, 10);

    const entry = weeklyMap.get(weekKey) ?? { volume: 0, count: 0, muscles: new Set() };
    entry.count += 1;
    for (const ex of workout.exercises) {
      const ws = workingSets(ex.sets);
      entry.volume += totalVolume(ws);
    }
    weeklyMap.set(weekKey, entry);
  }

  const weeklyVolume: WeeklyVolume[] = Array.from(weeklyMap.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12)
    .map(([weekStart, { volume, count, muscles }]) => ({
      weekStart,
      totalVolume: Math.round(volume),
      workoutCount: count,
      musclesHit: Array.from(muscles),
    }));

  // Muscle group frequency (how many workouts hit each major muscle)
  // Uses inferMovementPattern to avoid duplicating keyword heuristics
  const movementToMuscle: Record<string, string> = {
    horizontal_push: "chest",
    vertical_push: "shoulders",
    horizontal_pull: "back",
    vertical_pull: "back",
    squat: "quads",
    hinge: "hamstrings",
    cardio: "cardio",
  };
  const muscleGroupFrequency: Record<string, number> = {};
  for (const workout of inPeriod) {
    const musclesThisWorkout = new Set<string>();
    for (const ex of workout.exercises) {
      const pattern = inferMovementPattern(ex.title, "unknown");
      const muscle = movementToMuscle[pattern];
      if (muscle) musclesThisWorkout.add(muscle);
      // Isolation — map by title keywords for specificity
      const t = ex.title.toLowerCase();
      if (t.includes("curl") && !t.includes("leg")) musclesThisWorkout.add("biceps");
      if (t.includes("tricep") || t.includes("pushdown") || (t.includes("extension") && !t.includes("back"))) musclesThisWorkout.add("triceps");
      if (t.includes("calf") || t.includes("calves")) musclesThisWorkout.add("calves");
      if (t.includes("squat") || t.includes("leg press") || t.includes("lunge")) musclesThisWorkout.add("quads");
      if (t.includes("deadlift") || t.includes("rdl") || t.includes("hip thrust") || (t.includes("curl") && t.includes("leg"))) musclesThisWorkout.add("hamstrings");
      // Football / soccer → high leg load (quadriceps + hamstrings)
      if (t.includes("football") || t.includes("soccer")) {
        musclesThisWorkout.add("quads");
        musclesThisWorkout.add("hamstrings");
      }
    }
    for (const muscle of musclesThisWorkout) {
      muscleGroupFrequency[muscle] = (muscleGroupFrequency[muscle] ?? 0) + 1;
    }
  }

  // Flags
  const flags: string[] = [];
  if (daysSinceLast !== null && daysSinceLast > 10) {
    flags.push(`No workout in the last ${daysSinceLast} days.`);
  }
  if (workoutsPerWeek < 2 && totalCount > 0) {
    flags.push(`Training frequency is low (~${workoutsPerWeek}×/week over this period).`);
  }
  if (plateauedExercises.length > 0) {
    flags.push(`${plateauedExercises.length} exercise(s) appear to be plateauing: ${plateauedExercises.join(", ")}.`);
  }
  const muscleFreqEntries = Object.entries(muscleGroupFrequency);
  const neglected = muscleFreqEntries.filter(([, freq]) => freq <= 2 && totalCount >= 8).map(([m]) => m);
  if (neglected.length > 0) {
    flags.push(`Low frequency for: ${neglected.join(", ")} (≤2 sessions in the period).`);
  }

  return {
    periodDays,
    totalWorkouts: totalCount,
    workoutsPerWeek,
    firstWorkoutDate: firstDate,
    lastWorkoutDate: lastDate,
    daysSinceLastWorkout: daysSinceLast,
    topExercises,
    plateauedExercises,
    weeklyVolume,
    muscleGroupFrequency,
    flags,
  };
}
