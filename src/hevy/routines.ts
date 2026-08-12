import { hevyGetAll } from "./client.js";
import type { HevyRoutine } from "./types.js";

export async function getAllRoutines(
  options: { refresh?: boolean } = {}
): Promise<HevyRoutine[]> {
  return hevyGetAll<HevyRoutine>("/routines", "routines", 10, options);
}
