import { hevyPost } from "../hevy/client.js";
import type { RoutineInput, HevyRoutine } from "../hevy/types.js";

export async function createRoutineTool(args: {
  routine: RoutineInput;
  confirm?: boolean;
}): Promise<{ preview: RoutineInput } | { created: true; id: string; title: string }> {
  if (!args.confirm) {
    return { preview: args.routine };
  }

  const result = await hevyPost<{ routine: HevyRoutine }>("/routines", { routine: args.routine });
  return { created: true, id: result.routine.id, title: result.routine.title };
}
