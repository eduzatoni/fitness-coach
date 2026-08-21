// Parser for SmartGym text-export HISTORY sections.
//
// The export is plain text with three sections (ROUTINES, HISTORY, MEASURES). We
// parse only HISTORY: a flat sequence of session blocks, each shaped like
//
//   12 December 2022        <- date line "D Month YYYY"
//   Almost There 1          <- routine name (free text)
//   Monday, Thursday        <- schedule line (ignored)
//   Goal:
//   Hypertrophy             <- goal value
//   Exercises:
//   <exercise name>
//   <set line>              <- optional; bare name = no set data
//   ...
//
// Set data is aggregated (one line per exercise, "3 sets, 10 reps, 40kg, ...").

export interface ParsedSmartgymSet {
  sets: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  restSeconds: number | null;
}

export interface ParsedSmartgymExercise {
  rawName: string;
  /** null for a bare name with no set line (stretches/cardio placeholders). */
  set: ParsedSmartgymSet | null;
}

export interface ParsedSmartgymSession {
  dateText: string;
  date: string; // ISO yyyy-mm-dd
  routineName: string;
  goal: string | null;
  exercises: ParsedSmartgymExercise[];
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const DATE_RE = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/;

// One set line, all optional fields. A set line MUST start with "N sets,".
//   "3 sets, 10 reps, 40kg, 60 sec (rest)"
//   "4 sets, 8 reps, 90 sec (rest)"
//   "3 sets, 40 sec (duration), 30 sec (rest)"
//   "3 sets, 11 reps, 2.5kg, 60 sec (rest)"
//   "4 sets, 30 sec (duration), 10kg, 0 sec (rest)"
const SET_RE =
  /^(\d+)\s+sets?,\s+(?:(\d+)\s+reps,\s+)?(?:(\d+)\s+sec \(duration\),\s+)?(?:(\d+(?:\.\d+)?)kg,\s+)?(\d+)\s+sec \(rest\)$/;

export function parseDateLine(line: string): { dateText: string; date: string } | null {
  const m = DATE_RE.exec(line.trim());
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTHS[(m[2] ?? "").toLowerCase()];
  const year = Number(m[3]);
  if (!month) return null;
  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { dateText: line.trim(), date };
}

export function parseSetLine(line: string): ParsedSmartgymSet | null {
  const m = SET_RE.exec(line.trim());
  if (!m) return null;
  const [, sets, reps, duration, weight, rest] = m;
  return {
    sets: Number(sets),
    reps: reps !== undefined ? Number(reps) : null,
    weightKg: weight !== undefined ? Number(weight) : null,
    durationSeconds: duration !== undefined ? Number(duration) : null,
    restSeconds: rest !== undefined ? Number(rest) : null,
  };
}

export function parseSmartgymHistory(fileText: string): ParsedSmartgymSession[] {
  const lines = fileText.split("\n");
  const start = lines.findIndex((l) => l.trim() === "HISTORY");
  const end = lines.findIndex((l) => l.trim() === "MEASURES");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Could not locate HISTORY…MEASURES section in SmartGym export.");
  }
  const block = lines.slice(start + 1, end);

  const sessions: ParsedSmartgymSession[] = [];
  let current: ParsedSmartgymSession | null = null;

  // Within a session we move through: header (routine/schedule) → goal → exercises.
  type Mode = "header" | "seekGoalValue" | "exercises";
  let mode: Mode = "header";
  let pendingName: string | null = null;

  const flushPendingBare = () => {
    if (pendingName !== null && current) {
      current.exercises.push({ rawName: pendingName, set: null });
      pendingName = null;
    }
  };

  const startSession = (dateText: string, date: string) => {
    flushPendingBare();
    if (current) sessions.push(current);
    current = { dateText, date, routineName: "", goal: null, exercises: [] };
    mode = "header";
    pendingName = null;
  };

  for (const raw of block) {
    const s = raw.trim();

    const dateHit = parseDateLine(s);
    if (dateHit) {
      startSession(dateHit.dateText, dateHit.date);
      continue;
    }
    if (!current) continue; // skip anything before the first date
    const cur: ParsedSmartgymSession = current;

    if (s === "") continue;

    // The Exercises: divider can appear from any pre-exercises mode.
    if (s === "Exercises:") {
      mode = "exercises";
      pendingName = null;
      continue;
    }

    if (mode === "header") {
      if (s === "Goal:") {
        mode = "seekGoalValue";
        continue;
      }
      // First non-empty line after the date is the routine name; the schedule
      // line (e.g. "Monday, Thursday") follows and is ignored.
      if (cur.routineName === "") cur.routineName = s;
      continue;
    }

    if (mode === "seekGoalValue") {
      cur.goal = s;
      mode = "header"; // stay in header until "Exercises:" appears
      continue;
    }

    if (mode === "exercises") {
      const set = parseSetLine(s);
      if (set) {
        if (pendingName !== null) {
          cur.exercises.push({ rawName: pendingName, set });
          pendingName = null;
        }
        continue;
      }
      // Non-set line inside exercises: it's an exercise name. If a previous name
      // is still pending (had no set line), flush it as bare first.
      flushPendingBare();
      pendingName = s;
    }
  }

  flushPendingBare();
  if (current) sessions.push(current);
  return sessions;
}
