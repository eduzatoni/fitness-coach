// Bulk-import SmartGym text-export history into Hevy.
//
// Two-phase, mirroring the project's other write tools:
//   - preview (confirm falsy): parse, map, report counts + any unmapped names, ZERO writes.
//     Refuses nothing, but the confirm phase will refuse if unmapped names exist.
//   - confirm (confirm:true): POST each not-yet-imported session, throttled, appending to a
//     resume ledger after each success so re-runs are idempotent and crashes resume cleanly.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { hevyPost } from "../hevy/client.js";
import type { WorkoutInput } from "../hevy/types.js";
import { parseSmartgymHistory } from "../import/smartgym-parse.js";
import {
  sessionToWorkoutInput,
  sessionKey,
  readLedger,
  appendLedger,
  type SmartgymImportOptions,
} from "../import/smartgym-import.js";

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));
const DEFAULT_FILE = join(projectRoot, "bkp", "text-3F5EA096B869-1.txt");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface ImportSmartgymArgs {
  filePath?: string;
  confirm?: boolean;
  limit?: number;
  fromDate?: string; // inclusive yyyy-mm-dd
  toDate?: string; // inclusive yyyy-mm-dd
  throttleMs?: number;
  options?: SmartgymImportOptions;
}

export async function importSmartgymHistoryTool(args: ImportSmartgymArgs): Promise<
  | {
      preview: {
        totalSessions: number;
        toImport: number;
        alreadyImported: number;
        unmapped: string[];
        sampleWorkouts: WorkoutInput[];
      };
    }
  | {
      imported: {
        logged: number;
        skipped: number;
        failed: Array<{ date: string; routineName: string; error: string }>;
      };
    }
> {
  const filePath = args.filePath ?? DEFAULT_FILE;
  const opts = args.options ?? {};
  const throttleMs = args.throttleMs ?? 1500;

  const text = readFileSync(filePath, "utf8");
  let sessions = parseSmartgymHistory(text);

  // Date filters (inclusive) and limit, applied in chronological order.
  sessions.sort((a, b) => a.date.localeCompare(b.date));
  if (args.fromDate) sessions = sessions.filter((s) => s.date >= args.fromDate!);
  if (args.toDate) sessions = sessions.filter((s) => s.date <= args.toDate!);
  if (typeof args.limit === "number") sessions = sessions.slice(0, args.limit);

  const ledger = readLedger();
  const doneHashes = new Set(ledger.map((e) => e.hash));

  // ---- Preview ----
  if (!args.confirm) {
    const unmapped = new Set<string>();
    const sampleWorkouts: WorkoutInput[] = [];
    let toImport = 0;
    let alreadyImported = 0;

    for (const session of sessions) {
      const { workout, unmapped: u } = sessionToWorkoutInput(session, opts);
      u.forEach((n) => unmapped.add(n));
      if (doneHashes.has(sessionKey(session))) {
        alreadyImported++;
      } else {
        toImport++;
        if (sampleWorkouts.length < 3) sampleWorkouts.push(workout);
      }
    }

    return {
      preview: {
        totalSessions: sessions.length,
        toImport,
        alreadyImported,
        unmapped: [...unmapped].sort(),
        sampleWorkouts,
      },
    };
  }

  // ---- Confirm: write ----
  const failed: Array<{ date: string; routineName: string; error: string }> = [];
  let logged = 0;
  let skipped = 0;
  let first = true;

  for (const session of sessions) {
    const hash = sessionKey(session);
    if (doneHashes.has(hash)) {
      skipped++;
      continue;
    }

    const { workout } = sessionToWorkoutInput(session, opts);
    if (workout.exercises.length === 0) {
      // Nothing importable (all bare-name) — skip without a ledger entry.
      skipped++;
      continue;
    }

    if (!first) await sleep(throttleMs);
    first = false;

    try {
      // POST /workouts returns { workout: [ { id, ... } ] } — workout is an array.
      const result = await hevyPost<{ workout: Array<{ id: string }> }>("/workouts", { workout });
      const hevyId = result.workout?.[0]?.id ?? "";
      appendLedger({
        hash,
        date: session.date,
        routineName: session.routineName,
        hevyId,
        loggedAt: new Date().toISOString(),
      });
      logged++;
    } catch (err) {
      failed.push({
        date: session.date,
        routineName: session.routineName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { imported: { logged, skipped, failed } };
}
