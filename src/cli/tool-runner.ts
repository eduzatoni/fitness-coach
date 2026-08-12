#!/usr/bin/env node
import "dotenv/config";
import { getRecentWorkoutsTool } from "../tools/get-recent-workouts.js";
import { getExerciseHistoryTool } from "../tools/get-exercise-history.js";
import { analyzeWorkoutTool } from "../tools/analyze-workout.js";
import { analyzeExerciseTool } from "../tools/analyze-exercise.js";
import { getRoutinesTool } from "../tools/get-routines.js";

const TOOLS: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_recent_workouts: (a) => getRecentWorkoutsTool(a as Parameters<typeof getRecentWorkoutsTool>[0]),
  get_exercise_history: (a) => getExerciseHistoryTool(a as Parameters<typeof getExerciseHistoryTool>[0]),
  analyze_workout: (a) => analyzeWorkoutTool(a as Parameters<typeof analyzeWorkoutTool>[0]),
  analyze_exercise: (a) => analyzeExerciseTool(a as Parameters<typeof analyzeExerciseTool>[0]),
  get_routines: (a) => getRoutinesTool(a as Parameters<typeof getRoutinesTool>[0]),
};

async function main() {
  const args = process.argv.slice(2);
  const refresh = args.includes("--refresh");
  const filteredArgs = args.filter((a) => a !== "--refresh");

  const toolName = filteredArgs[0];
  const rawJson = filteredArgs[1] ?? "{}";

  if (!toolName) {
    console.error(JSON.stringify({ error: "Usage: tool-runner <tool_name> '<json_args>' [--refresh]" }));
    console.error("Available tools:", Object.keys(TOOLS).join(", "));
    process.exit(1);
  }

  const tool = TOOLS[toolName];
  if (!tool) {
    console.error(JSON.stringify({ error: `Unknown tool: ${toolName}`, available: Object.keys(TOOLS) }));
    process.exit(1);
  }

  let parsedArgs: Record<string, unknown>;
  try {
    parsedArgs = JSON.parse(rawJson) as Record<string, unknown>;
  } catch {
    console.error(JSON.stringify({ error: `Invalid JSON args: ${rawJson}` }));
    process.exit(1);
  }

  if (refresh) parsedArgs["refresh"] = true;

  try {
    const result = await tool(parsedArgs);
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ error: message }));
    process.exit(1);
  }
}

main();
