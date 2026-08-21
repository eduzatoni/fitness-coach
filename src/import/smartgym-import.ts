// Maps parsed SmartGym sessions to Hevy workout payloads and manages the
// resume ledger for the bulk import.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { WorkoutInput, WorkoutSetInput, WorkoutExerciseInput } from "../hevy/types.js";
import type { ParsedSmartgymSession } from "./smartgym-parse.js";
import { lookupMapping } from "./smartgym-exercise-map.js";

export interface SmartgymImportOptions {
  /** Hour of day (local-naive, emitted as UTC) for the synthetic start time. Default 18. */
  startHour?: number;
  /** Session length in minutes for the synthetic end time. Default 60. */
  defaultDurationMin?: number;
}

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const LEDGER_DIR = join(projectRoot, "data", "import");
const LEDGER_FILE = join(LEDGER_DIR, "smartgym-ledger.json");

/**
 * Build a Hevy workout payload from a parsed session. Exercises resolve through
 * the curated map (exact lookup, never fuzzy). Bare-name exercises (no set data)
 * are skipped. Any raw name absent from the map is collected in `unmapped`.
 */
export function sessionToWorkoutInput(
  session: ParsedSmartgymSession,
  opts: SmartgymImportOptions
): { workout: WorkoutInput; unmapped: string[] } {
  const startHour = opts.startHour ?? 18;
  const durationMin = opts.defaultDurationMin ?? 60;

  const startMs = Date.parse(`${session.date}T00:00:00.000Z`) + startHour * 3600_000;
  const start = new Date(startMs);
  const end = new Date(startMs + durationMin * 60_000);

  const unmapped: string[] = [];
  const exercises: WorkoutExerciseInput[] = [];

  for (const ex of session.exercises) {
    if (ex.set === null) continue; // bare name → skip

    const entry = lookupMapping(ex.rawName);
    if (!entry) {
      if (!unmapped.includes(ex.rawName)) unmapped.push(ex.rawName);
      continue;
    }

    const count = Math.max(1, ex.set.sets);
    const isDuration =
      entry.kind !== "lift" || (ex.set.durationSeconds !== null && ex.set.reps === null);

    const template: WorkoutSetInput = isDuration
      ? { type: "normal", duration_seconds: ex.set.durationSeconds ?? 0 }
      : {
          type: "normal",
          weight_kg: ex.set.weightKg ?? 0,
          reps: ex.set.reps ?? 0,
        };

    const sets: WorkoutSetInput[] = Array.from({ length: count }, () => ({ ...template }));
    exercises.push({ exercise_template_id: entry.hevyTemplateId, sets });
  }

  const workout: WorkoutInput = {
    title: session.routineName || "Workout",
    description: session.goal,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    exercises,
  };

  return { workout, unmapped };
}

/** Stable, order-independent identity for a session (for idempotent re-runs). */
export function sessionKey(session: ParsedSmartgymSession): string {
  const names = session.exercises.map((e) => e.rawName).sort();
  const raw = `${session.date}|${session.routineName}|${JSON.stringify(names)}`;
  return createHash("sha1").update(raw).digest("hex");
}

export interface LedgerEntry {
  hash: string;
  date: string;
  routineName: string;
  hevyId: string;
  loggedAt: string;
}

/** Read the append-only ledger of successfully imported sessions. */
export function readLedger(): LedgerEntry[] {
  if (!existsSync(LEDGER_FILE)) return [];
  const text = readFileSync(LEDGER_FILE, "utf8").trim();
  if (!text) return [];
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LedgerEntry);
}

/** Append one entry to the ledger (JSON-lines). Only written after a confirmed POST. */
export function appendLedger(entry: LedgerEntry): void {
  if (!existsSync(LEDGER_DIR)) mkdirSync(LEDGER_DIR, { recursive: true });
  appendFileSync(LEDGER_FILE, JSON.stringify(entry) + "\n");
}
