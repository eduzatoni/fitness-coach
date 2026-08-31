import { getAllRoutines } from "../hevy/routines.js";
import { hevyPut, invalidateCache } from "../hevy/client.js";
import { applyRoutineEdit, summarizeRoutineDiff } from "../analysis/routine-edit.js";
import type { RoutineEdit, RoutineInput } from "../hevy/types.js";

export async function applyRoutineEditTool(args: {
  routineId: string;
  edit: RoutineEdit;
  confirm: boolean;
  refresh?: boolean;
}): Promise<{ applied: boolean; summary: string[] } | { error: string }> {
  if (!args.confirm) return { error: "confirmation_required" };

  // A write is read-modify-write: always read fresh so we never build the new
  // payload on top of a stale cache and clobber a prior edit.
  const routines = await getAllRoutines({ refresh: true });
  const routine = routines.find((r) => r.id === args.routineId);
  if (!routine) throw new Error(`Routine not found: "${args.routineId}"`);

  const { payload, diff } = applyRoutineEdit(routine, args.edit);

  await hevyPut(`/routines/${args.routineId}`, { routine: payload } as { routine: RoutineInput });

  // The cached routine list is now stale — drop it so the next read (another
  // edit or a display) reflects what we just wrote.
  invalidateCache("/routines");

  return {
    applied: true,
    summary: summarizeRoutineDiff(diff),
  };
}
