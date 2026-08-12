# Plan — Hevy write capability (Claude can create & edit routines)

## Context

Today the coach is **strictly read-only**: `src/hevy/client.ts` exposes only `hevyGet`/`hevyGetAll`,
and every tool is a `GET`. The user asked to let Claude *make changes* to their Hevy data.

Writes are categorically different from everything built so far. Reads are safe and cached; **writes
hit the user's real Hevy account, are outward-facing, and are effectively irreversible** (the API has
no undo and syncs to their phone). The plan treats safety — confirmation, preview, cache
invalidation — as first-class.

### Decisions (confirmed with user)
- **Scope: routines only.** Claude can create and edit *routines* (templates: exercises + target
  sets). It must **not** write to workout history. Workout logging (`POST /v1/workouts`), routine
  folders, and custom exercise templates are **out of scope** for this pass.
  - Rationale: routines are low-stakes templates (easy to fix); workout history feeds every
    progression/plateau calc, so we don't let Claude mutate it.
- **Gate: two-step preview→apply, code-enforced.** A `preview` tool returns a diff and writes
  nothing; an `apply` tool writes only when called with `confirm: true`. Not prose-trust.

### Confirmed via API probing (endpoints exist; auth-gated)
- `POST /v1/routines` — create routine (body wraps under `{ routine: {...} }`)
- `PUT  /v1/routines/{routineId}` — update routine

---

## Safety-first write path (applies to every milestone)

```
Claude proposes a routine change
   → preview_* tool returns a DIFF + exact payload (NO write)
   → Claude shows the user the diff and asks for explicit confirmation
   → apply_* tool writes ONLY when called with { confirm: true }
   → cache for /routines is invalidated so the next read reflects the change
```

Status legend: `[ ]` todo · `[~]` in progress · `[x]` done

The milestones are ordered so each is independently shippable and testable. **W1** and **W2** have no
network side effects (pure code + tests), so they can land safely first. **W3** introduces the actual
write plumbing but keeps it gated. **W4** wires it into the chat interface. Commit each milestone
separately (`feat:` / `test:` / `chore:`).

---

## W1 — Pure builder + diff engine (no API, no writes)  `feat:`

The deterministic core so Claude never hand-assembles payloads. Entirely offline → safe to build and
test first.

- [ ] `src/hevy/types.ts` — add write payload types (distinct from GET response types):
  - [ ] `RoutineSetInput` (type, weight_kg, reps, distance_meters?, duration_seconds?)
  - [ ] `RoutineExerciseInput` (exercise_template_id, superset_id?, notes?, rest_seconds?, sets[])
  - [ ] `RoutineInput` (title, notes?, exercises[])
  - [ ] `RoutineEdit` union: `add_exercise`, `remove_exercise`, `add_set`, `remove_set`, `change_target`
  - [ ] `RoutineDiff` shape (added/removed/modified exercises & sets)
- [ ] `src/analysis/routine-edit.ts`:
  - [ ] `routineToInput(routine: HevyRoutine): RoutineInput` (strip server fields → editable payload)
  - [ ] `applyRoutineEdit(current, edit, resolveId?) → { payload: RoutineInput, diff: RoutineDiff }`
        (pure; exercise-name→id resolution injected as a param so it stays testable offline)
  - [ ] `summarizeRoutineDiff(diff): string[]` — short human-readable confirmation lines
- [ ] `tests/routine-edit.test.ts`:
  - [ ] add set / remove set → payload + diff correct
  - [ ] change target reps/weight for an exercise
  - [ ] add exercise / remove exercise
  - [ ] `summarizeRoutineDiff` produces readable lines
  - [ ] editing a missing exercise/set errors clearly (doesn't silently no-op)
- [ ] `npm run typecheck` clean, `npm test` green

**Ship gate:** builder produces correct payloads + diffs from fixtures, zero network.

---

## W2 — Client write plumbing + cache invalidation (gated, still no tools)  `feat:`

Adds the low-level write path and cache invalidation. No tool exposes it yet, so Claude still can't
trigger a write.

- [ ] `src/hevy/client.ts`:
  - [ ] refactor `getApiKey()` + error formatting out of `hevyGet` into shared helpers
  - [ ] store source `path` inside each cache file (alongside `ts`/`data`) so cache is invalidatable by path
  - [ ] `invalidateCache(pathPrefix)` — delete matching `data/cache/*.json` entries
  - [ ] `hevyWrite<T>(method, path, body)` — POST/PUT, `api-key` + `content-type`, never cached,
        throws with status+body on non-2xx, invalidates cache on success
- [ ] `src/hevy/routines.ts`:
  - [ ] `createRoutine(input)` → `hevyWrite("POST", "/routines", { routine: input })` + invalidate `/routines`
  - [ ] `updateRoutine(id, input)` → `hevyWrite("PUT", "/routines/{id}", { routine: input })` + invalidate `/routines`
- [ ] `tests/write-client.test.ts`:
  - [ ] `hevyWrite` sends the right method/path/headers/body (mock `fetch`)
  - [ ] non-2xx throws with status + body
  - [ ] cache invalidation removes matching entries after a successful write
- [ ] existing read tests still green (cache-file shape change didn't break reads)
- [ ] `npm run typecheck` clean, `npm test` green

**Ship gate:** write helper + invalidation verified against a mocked `fetch`; no live calls in tests.

---

## W3 — Confirm-gated tools (the safety boundary)  `feat:`

Wire the builder + client into tools that enforce the `confirm: true` gate. This is where a write can
first happen — behind the gate.

- [ ] `src/tools/preview-routine-edit.ts` — `{ routineId, edit }`: fetch routine, run
      `applyRoutineEdit`, return `{ summary, diff, payload }`. **Never writes.**
- [ ] `src/tools/apply-routine-edit.ts` — `{ routineId, edit, confirm }`: recompute payload; call
      `updateRoutine` **only if `confirm === true`**; otherwise return
      `{ error: "confirmation_required", summary }`.
- [ ] `src/tools/create-routine.ts` — `{ routine, confirm }`: same gate; `confirm !== true` → preview.
- [ ] wire all three into `src/cli/tool-runner.ts` dispatch table
- [ ] `tests/write-gate.test.ts` (**safety-critical**):
  - [ ] `apply_routine_edit` with no/false `confirm` → returns `confirmation_required`, write fn NOT called
  - [ ] `apply_routine_edit` with `confirm: true` → write fn called exactly once with expected payload
  - [ ] `create_routine` same two cases
  - [ ] `preview_routine_edit` never calls the write fn under any input
        (inject/mock `updateRoutine`/`createRoutine` so no live network)
- [ ] `npm run typecheck` clean, `npm test` green

**Ship gate:** the confirm gate is proven by test — nothing writes without `confirm: true`.

---

## W4 — Chat interface + instructions  `feat:`

Teach Claude the flow and expose it conversationally.

- [ ] `CLAUDE.md` — new "Making changes to routines" section:
  - [ ] Claude can edit/create *routines* only; **cannot** modify workout history
  - [ ] mandatory flow: preview → show diff → explicit yes → apply with `confirm: true`
  - [ ] never pass `confirm: true` in the same turn the user first asks — surface the diff first
  - [ ] document the three tools + input/output shapes
  - [ ] state plainly: writes hit real Hevy data and can't be undone from here
- [ ] `skill/coaching-rules.md` — "make that change" / "do it" = confirmation → apply; else preview only
- [ ] update root `plan.md` progress log + verification checklist to reference write capability

**Ship gate:** manual chat walkthrough (see Verification) behaves as designed.

---

## Files touched (across milestones)
- Modify: `src/hevy/client.ts` (W2), `src/hevy/types.ts` (W1), `src/hevy/routines.ts` (W2),
  `src/cli/tool-runner.ts` (W3), `CLAUDE.md` (W4), `skill/coaching-rules.md` (W4), `plan.md` (W4)
- New: `src/analysis/routine-edit.ts` (W1), `src/tools/preview-routine-edit.ts` (W3),
  `src/tools/apply-routine-edit.ts` (W3), `src/tools/create-routine.ts` (W3)
- New tests: `tests/routine-edit.test.ts` (W1), `tests/write-client.test.ts` (W2),
  `tests/write-gate.test.ts` (W3)

## Verification (manual, user-driven — after W4)
1. `npm test` green (builder + write-client + confirm-gate tests pass, no network).
2. Chat: "Add a 4th set to bench in my Push routine." → Claude calls `preview_routine_edit`, shows
   the diff, asks to confirm. Nothing changes in Hevy yet.
3. "yes" → Claude calls `apply_routine_edit` with `confirm: true` → routine updated; re-reading it
   (cache invalidated) shows the new set.
4. **Live smoke (opt-in, throwaway):** create a test routine via `create_routine` `confirm:true`,
   verify it appears in the Hevy app, delete it. Not part of CI.

## Out of scope (revisit only if asked)
- Workout logging (`POST /v1/workouts`) — deliberately excluded to protect real history.
- `routine_folders`, custom `exercise_templates` creation.
