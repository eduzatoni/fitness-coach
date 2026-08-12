import { getAllRoutines } from "../hevy/routines.js";

export async function getRoutinesTool(args: { refresh?: boolean } = {}): Promise<{
  routines: Array<{
    id: string;
    title: string;
    exerciseCount: number;
    exercises: Array<{ title: string; sets: number }>;
  }>;
}> {
  const routines = await getAllRoutines({ refresh: args.refresh });
  return {
    routines: routines.map((r) => ({
      id: r.id,
      title: r.title,
      exerciseCount: r.exercises.length,
      exercises: r.exercises.map((e) => ({
        title: e.title,
        sets: e.sets.length,
      })),
    })),
  };
}
