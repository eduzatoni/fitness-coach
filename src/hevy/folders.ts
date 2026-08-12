import { hevyGetAll, hevyPost } from "./client.js";
import type { HevyRoutineFolder, RoutineFolderInput } from "./types.js";

export async function getAllRoutineFolders(
  options: { refresh?: boolean } = {}
): Promise<HevyRoutineFolder[]> {
  return hevyGetAll<HevyRoutineFolder>("/routine_folders", "routine_folders", 10, options);
}

export async function createRoutineFolder(
  input: RoutineFolderInput
): Promise<HevyRoutineFolder> {
  const data = await hevyPost<{ routine_folder: HevyRoutineFolder }>(
    "/routine_folders",
    { routine_folder: input }
  );
  return data.routine_folder;
}
