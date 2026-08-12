import { getAllRoutines } from "../hevy/routines.js";
import { applyRoutineEdit, summarizeRoutineDiff } from "../analysis/routine-edit.js";
import type { RoutineEdit } from "../hevy/types.js";

export async function previewRoutineEditTool(args: {
  routineId: string;
  edit: RoutineEdit;
  refresh?: boolean;
}): Promise<{ summary: string[]; diff: object; payload: object }> {
  const routines = await getAllRoutines({ refresh: args.refresh });
  const routine = routines.find((r) => r.id === args.routineId);
  if (!routine) throw new Error(`Routine not found: "${args.routineId}"`);

  const { payload, diff } = applyRoutineEdit(routine, args.edit);
  return {
    summary: summarizeRoutineDiff(diff),
    diff,
    payload,
  };
}
