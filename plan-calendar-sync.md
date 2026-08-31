# M9 — Apple Calendar Sync

> Sync fitness events from the coaching system to a dedicated "Fitness" Apple Calendar using
> AppleScript/osascript. No OAuth, no new runtime deps, macOS-native. Three sources auto-sync:
> logged workouts (immediately after `log_workout confirm:true`), dated events in schedule.md
> (after the coach edits it), and planned sessions in weekly-plan.md (after the plan is written).

## Files to create / modify

| File | Action |
|---|---|
| `src/tools/sync-calendar.ts` | **New** — core sync tool (~160 lines) | 
| `src/tools/log-workout.ts` | Modify — call `syncWorkoutToCalendar` after confirmed write |
| `src/cli/tool-runner.ts` | Modify — register `sync_calendar` |
| `CLAUDE.md` | Modify — tool catalog entry + auto-sync instructions |

---

## `src/tools/sync-calendar.ts` — key design

### Imports & constants

```typescript
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const PROJECT_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const SCHEDULE_PATH = join(PROJECT_ROOT, "skill", "schedule.md");
const WEEKLY_PLAN_PATH = join(PROJECT_ROOT, "data", "weekly-plan.md");
const CALENDAR_NAME = "Fitness";
```

Pattern for PROJECT_ROOT: same as `src/tools/import-smartgym-history.ts:23`.

### Types

```typescript
interface CalendarEvent { title: string; start: Date; end: Date; }
```

### Duration lookup

```typescript
const DURATIONS: Record<string, number> = { football: 90, run: 45, running: 45, tennis: 60 };
// default: 60 min
// resolve: Object.entries(DURATIONS).find(([k]) => label.toLowerCase().includes(k))?.[1] ?? 60
```

### Helper functions

**`formatAppleScriptDate(d: Date): string`**
Use `Intl.DateTimeFormat("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric",
hour:"numeric", minute:"2-digit", second:"2-digit", hour12:true, timeZone: local })`.
Output: `Sunday, August 23, 2026 at 10:00:00 AM` — used verbatim as AppleScript date literal.

**`escapeTitle(s: string): string`** — replace `"` with `\\"`.

**`ensureCalendarExists(): void`**
```applescript
tell application "Calendar"
  if not (exists calendar "Fitness") then
    make new calendar with properties {name:"Fitness"}
  end if
end tell
```

**`createEvent(e: CalendarEvent): "created" | "skipped"`**
Duplicate guard + create in one script:
```applescript
tell application "Calendar"
  tell calendar "Fitness"
    set dayStart to date "<midnight of event day>"
    set dayEnd   to date "<midnight of next day>"
    set existing to (every event whose summary is "<title>" and start date ≥ dayStart and start date < dayEnd)
    if (count of existing) = 0 then
      make new event with properties {summary:"<title>", start date:date "<start>", end date:date "<end>"}
    end if
  end tell
end tell
```
Pass script via stdin: `execSync("osascript", { input: script, encoding: "utf8" })` — avoids shell
quoting issues with embedded characters in titles.

### `parseScheduleEvents(content: string): CalendarEvent[]`

Regex for dated event lines:
```
/^-\s+(\d{4}-\d{2}-\d{2})\s+\(\w+\)\s+(\d{2}:\d{2}):\s+(.+?)(?:\s+—\s+.+)?$/gm
```
Groups: date (`YYYY-MM-DD`), time (`HH:MM`), description (stop before first ` — ` load note).
Build `start` with `new Date(year, month-1, day, hours, minutes)` (local time — no UTC shift).
Filter: skip events where `start < today midnight`.

### `parseWeeklyPlanEvents(content: string): CalendarEvent[]`

1. Extract year from header: `/^#\s+Weekly Plan.*?(\d{4})/m`
2. Day blocks: `/^###\s+\w+\s+(\w+\s+\d+)\s+—\s+(.+)$/gm` → month+day, activities summary
3. Inline times within each block body: `/^\s*-\s+\*\*(\d{2}:\d{2})\*\*\s+(.+)$/gm` → time + label
4. Fallback (no inline time — inspect activities summary):
   - Contains `Run`/`Running` → start `07:30`, duration 45min
   - Contains `Push`/`Pull`/`Legs`/`Gym`/`Upper`/`Lower`/`Full Body` → start `17:00`, duration 60min
   - `REST` or football (covered by schedule.md) → skip
5. Filter: skip events before today.

### Main export

```typescript
export async function syncCalendarTool(args: {
  source: "schedule" | "weekly_plan" | "workout";
  workout?: { title: string; start_time: string; end_time: string };
  confirm?: boolean;
}): Promise<{ preview: CalendarEvent[] } | { synced: true; count: number; created: number; skipped: number }>
```

Confirm-gate pattern — same as `src/tools/log-workout.ts` and `src/tools/create-exercise-template.ts`.
No `confirm` → return `{ preview: events }`. `confirm: true` → `ensureCalendarExists()`, iterate
`createEvent()`, return counts.

### Named export for log-workout integration

```typescript
export function syncWorkoutToCalendar(title: string, start_time: string, end_time: string): void
```
`start`/`end` from `new Date(start_time/end_time)` (UTC ISO strings from Hevy — `Intl.DateTimeFormat`
renders in local timezone for AppleScript). Wraps in try/catch — calendar failure must never surface.

---

## `src/tools/log-workout.ts` — change

After the `hevyPost` succeeds on the confirm path, add:

```typescript
import { syncWorkoutToCalendar } from "./sync-calendar.js";
// ...
const result = await hevyPost<{ workout: HevyWorkout }>("/workouts", { workout });
try { syncWorkoutToCalendar(workout.title, workout.start_time, workout.end_time); } catch {}
return { logged: true, id: result.workout.id, title: result.workout.title };
```

---

## `src/cli/tool-runner.ts` — change

```typescript
import { syncCalendarTool } from "../tools/sync-calendar.js";
// in TOOLS:
sync_calendar: (a) => syncCalendarTool(a as Parameters<typeof syncCalendarTool>[0]),
```

---

## `CLAUDE.md` — changes

**A. Tool Catalog** — add `### sync_calendar` after `log_workout`:

```
{ "source": "schedule" }
{ "source": "weekly_plan" }
{ "source": "workout", "workout": { "title": "...", "start_time": "...", "end_time": "..." }, "confirm": true }

Syncs fitness events to the "Fitness" Apple Calendar. Omit confirm → preview. confirm: true → writes.
Duplicate guard: skips events that already exist on the same day with the same title.
```

**B. "Planning a week" section** — add after step 5 (writing weekly-plan.md):
> After writing `data/weekly-plan.md`, call `sync_calendar '{"source":"weekly_plan","confirm":true}'`.

**C. "Maintaining the schedule" section** — add after the file-edit instruction:
> After adding or removing a dated event in `skill/schedule.md`, call `sync_calendar '{"source":"schedule","confirm":true}'`.

---

## Tasks

- [ ] `src/tools/sync-calendar.ts` — create new file
- [ ] `src/tools/log-workout.ts` — add post-confirm sync call
- [ ] `src/cli/tool-runner.ts` — register `sync_calendar`
- [ ] `CLAUDE.md` — tool catalog + auto-sync instructions

---

## Verification

1. `npx tsx src/cli/tool-runner.ts sync_calendar '{"source":"schedule"}'` → preview with upcoming events from schedule.md
2. Add `"confirm":true` → events appear in Calendar.app under "Fitness"
3. Run again → all `skipped` (duplicate guard works)
4. Log a workout with `confirm:true` → calendar event auto-created silently
5. `npx tsc --noEmit` → no type errors
