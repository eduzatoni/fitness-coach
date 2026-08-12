import { getAllRoutineFolders, createRoutineFolder } from "../hevy/folders.js";

export async function createRoutineFolderTool(args: {
  title: string;
  confirm?: boolean;
}): Promise<
  | { created: { id: number; title: string } }
  | { error: "confirmation_required"; summary: string }
> {
  const summary = `Create routine folder: "${args.title}"`;

  if (!args.confirm) {
    return { error: "confirmation_required", summary };
  }

  const folder = await createRoutineFolder({ title: args.title });
  return { created: { id: folder.id, title: folder.title } };
}

export async function getRoutineFoldersTool(
  args: { refresh?: boolean } = {}
): Promise<{ folders: Array<{ id: number; title: string }> }> {
  const folders = await getAllRoutineFolders({ refresh: args.refresh });
  return {
    folders: folders.map((f) => ({ id: f.id, title: f.title })),
  };
}
