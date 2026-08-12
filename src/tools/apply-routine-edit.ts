import { getAllRoutines } from "../hevy/routines.js";
import { hevyPut } from "../hevy/client.js";
import { applyRoutineEdit, summarizeRoutineDiff } from "../analysis/routine-edit.js";
import type { RoutineEdit, RoutineInput } from "../hevy/types.js";

export async function applyRoutineEditTool(args: {
  routineId: string;
  edit: RoutineEdit;
  confirm: boolean;
  refresh?: boolean;
}): Promise<{ applied: boolean; summary: string[] } | { error: string }> {
  if (!args.confirm) return { error: "confirmation_required" };

  const routines = await getAllRoutines({ refresh: args.refresh });
  const routine = routines.find((r) => r.id === args.routineId);
  if (!routine) throw new Error(`Routine not found: "${args.routineId}"`);

  const { payload, diff } = applyRoutineEdit(routine, args.edit);

  await hevyPut(`/routines/${args.routineId}`, { routine: payload } as { routine: RoutineInput });

  return {
    applied: true,
    summary: summarizeRoutineDiff(diff),
  };
}
