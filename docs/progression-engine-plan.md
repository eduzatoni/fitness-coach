# Evidence-based exercise-progression engine — implementation plan

> Status: **proposed, awaiting review.** No code has been changed yet.

## Context

The coach's progression logic decides, per exercise, what to do next session (add weight, add reps,
hold, deload, swap). The current engine in `src/analysis/recommendations.ts` is ad-hoc and has real
gaps — now more visible with ~4 years of imported history to reason over:

- Fires `INCREASE_WEIGHT` after a **single** top-of-range session (fluke-prone).
- `INCREASE_WEIGHT` / `REDUCE_WEIGHT` **never compute a target load** — `target` just echoes the
  current weight.
- On plateau it jumps **straight to `CONSIDER_REPLACEMENT`**, skipping a deload.
- `INCREASE_REPS`, `REDUCE_WEIGHT`, `ADD_SET`, `REMOVE_SET` are defined but **never fire**.
- Rep range is hardcoded `[8, 12]`; the exercise's role is never consulted.
- e1RM (Epley) is used at all rep counts, where it's only reliable ≲12 reps.

**Goal:** replace the decision tree with deterministic, literature-backed rules.

**Confirmed decisions:**
- Adopt the **2-for-2 rule** (two consecutive top-range sessions before adding weight).
- **Deload first** (~10%) on plateau; only suggest swapping the exercise if it stalls *again*.
- Rep range chosen **per-exercise by role**, from the research — not a flat default.

## Evidence base (encoded as rules, cited in the skill doc)

| Rule | Source |
|---|---|
| **2-for-2**: top of range on all sets for 2 consecutive sessions → add load | NSCA, *Essentials of Strength Training & Conditioning* |
| **Load increments** 2–10%: large compound +5 kg, upper compound +2.5 kg, isolation +1–2.5 kg | ACSM Position Stand (2009), *Progression Models in Resistance Training* |
| **Plateau → deload ~10%**, re-progress; escalate to rep-range change / variation only if it stalls again | StrongLifts; Renaissance Periodization volume landmarks |
| **REDUCE_WEIGHT** on: regressing e1RM (reps ≤12), within-session rep drop-off >40%, or return from >21-day layoff | ACSM; RP; practical reintroduction guidance |
| **e1RM (Epley)** reliable only for reps ≤ ~12; above that judge by reps/volume | 1RM literature (Epley/Brzycki diverge >10 reps) |
| **Rep range by goal**: strength 3–5, hypertrophy 8–12, endurance 15–20 | ACSM / NSCA |

## Rep range chosen per-exercise by role

Reuse the existing `inferMovementPattern(title, primaryMuscle)` in `src/analysis/muscle-groups.ts`,
plus the primary muscle, to assign a rep range:

- **Compounds & isolation** (squat, hinge, pushes, pulls, curls/extensions/raises/flies) →
  **hypertrophy [8, 12]** — the best-supported general range for the profile goal "build strength and
  muscle".
- **Core / abdominals / calves** (high-rep responders) → **[12, 20]**.
- **Strength [3, 5]** is opt-in via an explicit `repRange` or `goal` argument — we don't assume the
  user is running a strength block unless told.

Implemented as `repRangeForExercise(movementPattern, primaryMuscle): [number, number]`. An explicit
`repRange`/`goal` arg to `analyze_exercise` always overrides.

> **Open for review:** if you'd rather your main barbell lifts (squat/bench/deadlift/OHP) default to
> strength **[3, 5]** rather than [8, 12], say so — it's a one-line change to the role map.

## New file: `src/analysis/load-increment.ts` (pure, unit-tested)

```ts
import type { MovementPattern } from "./muscle-groups.js";
export type IncrementClass = "large_compound" | "upper_compound" | "isolation";
export type TrainingGoal = "strength" | "hypertrophy" | "endurance";

export const INCREMENT_KG:  Record<IncrementClass, number> = { large_compound: 5, upper_compound: 2.5, isolation: 2.5 };
export const PLATE_STEP_KG:  Record<IncrementClass, number> = { large_compound: 2.5, upper_compound: 2.5, isolation: 0.5 };
export const MIN_INCREMENT_PCT = 0.02, MAX_INCREMENT_PCT = 0.10;
export const DELOAD_PCT = 0.10, LAYOFF_START_PCT = 0.10;
export const REP_RANGE_FOR: Record<TrainingGoal, [number, number]> = { strength: [3,5], hypertrophy: [8,12], endurance: [15,20] };

export function movementClassFor(p: MovementPattern | undefined): IncrementClass;
export function repRangeForExercise(p: MovementPattern | undefined, primaryMuscle?: string): [number, number];
export function incrementFor(cls: IncrementClass, currentKg: number): number;     // nominal, clamped to 2–10%
export function nextWeight(currentKg: number, cls: IncrementClass): number;        // round(current+increment); guarantees forward progress
export function reduceWeight(currentKg: number, cls: IncrementClass, pct?: number): number;
export function roundToStep(v: number, step: number): number;
```

- `movementClassFor`: squat/hinge → large_compound; pushes/pulls → upper_compound; isolation →
  isolation; carry/core/cardio/unknown → upper_compound (safe default).
- `incrementFor`: nominal from `INCREMENT_KG`, clamped to 2–10% of current load.
- `nextWeight`: `roundToStep(current + increment, PLATE_STEP_KG[cls])`, with a guard that a genuinely
  earned increase never rounds back to the current weight.

## Extend `src/analysis/progression.ts` (pure helpers)

```ts
export function consecutiveTopRangeSessions(sessions: SessionMetrics[], repRange?: [number, number]): number; // trailing hit_top at SAME topWeight
export function repDropoffRatio(sets: WorkingSet[]): number;    // (first-last)/first; 0 if <2 sets
export function daysSinceLast(sessions: SessionMetrics[]): number | null;
```

## Rewrite `recommendExercise` (`src/analysis/recommendations.ts`)

New signature (3rd param optional → existing callers/tests still compile):

```ts
export interface RecommendationContext { movementPattern?: MovementPattern; primaryMuscle?: string; goal?: TrainingGoal; }
export interface ExerciseRecommendation { action; recommendation; trend; plateaued; targetWeightKg?: number; }
export function recommendExercise(sessions, repRange = [8,12], ctx: RecommendationContext = {}): ExerciseRecommendation
```

Constants: `CONFIRM_SESSIONS = 2`, `REP_DROPOFF_THRESHOLD = 0.40`, `LAYOFF_DAYS = 21`,
`E1RM_RELIABLE_MAX_REPS = 12`.

**Decision order** (safety/reduce branches before increase branches, so a fatigued or regressing
context can't trigger an increase):

1. **Post-bump adjustment** (unchanged) → `MAINTAIN` at current weight.
2. **Layoff** (`gap > 21 days`) → `REDUCE_WEIGHT` to ~10% lower; "first session back — start lighter".
3. **Within-session drop-off** (`dropoff > 40%`, weight same, ≥2 sets) → `REDUCE_WEIGHT`.
4. **Regressing e1RM** (trend regressing, reps ≤12, not plateaued) → `REDUCE_WEIGHT`.
5. **INCREASE_WEIGHT (2-for-2)** (hit_top, weight same, `topStreak ≥ 2`) → target = `nextWeight(...)`.
6. **Topped once** (hit_top, weight same, `topStreak < 2`) → `MAINTAIN`, "repeat to confirm (2-for-2)".
7. **INCREASE_REPS** (progressing, weight same, reps climbing, not plateaued) → hold weight, add reps.
8. **Plateau → deload-first**: first plateau → `REDUCE_WEIGHT` (~10%), re-progress; if a recent deload
   already happened and it re-flattened → `CONSIDER_REPLACEMENT`.
9. **Below-range / reps negative** fallback → `MONITOR`.
10. **Progressing / stable** fallback → `MAINTAIN`.

`target` stays a **string** (backward-compatible); INCREASE/REDUCE now put the **computed new weight**
in it (fixes the current bug where it echoed the current weight). `targetWeightKg` added for
internal/testing use.

## Thread context in `src/tools/analyze-exercise.ts`

- Derive `movementPattern = inferMovementPattern(resolved.title, resolved.primary_muscle_group ?? "")`.
- If no explicit `repRange` arg: `repRange = repRangeForExercise(movementPattern, primaryMuscle)`.
- Call `recommendExercise(sessionList, repRange, { movementPattern, primaryMuscle, goal })`.
- Return shape unchanged.

## Skill doc sync — `skill/progression-rules.md`

Encode the new rules so Claude's narration matches the engine: 2-for-2 rule; increment-by-class table
(clamped 2–10%, plate rounding); plateau = deload-first then escalate; `REDUCE_WEIGHT` triggers;
`INCREASE_REPS` now fires; e1RM reliable only ≤12 reps; rep-range-by-role. Fix the worked-example rows
(rep-building rows → `INCREASE_REPS`; "increase" rows require two consecutive top sessions). Add source
citations.

## Backward compatibility

- `recommendExercise` 3rd param defaults `{}` → existing call sites compile.
- `Recommendation.target` remains a string; only its *value* improves.
- Tests to update in `tests/recommendations.test.ts`: single-top-session → now `MAINTAIN` (add a 2nd
  top session for the `INCREASE_WEIGHT` case, assert `target` = computed kg); first plateau → now
  `REDUCE_WEIGHT` (add a post-deload-reflatten fixture to keep a `CONSIDER_REPLACEMENT` case);
  return-after-break → now `REDUCE_WEIGHT`; steady-rep-progression → may now be `INCREASE_REPS`.

## Build order

1. `src/analysis/load-increment.ts` + `tests/load-increment.test.ts`.
2. Progression helpers + cases in `tests/progression.test.ts`.
3. Rewrite `recommendExercise` decision tree + constants + context param.
4. Thread context through `src/tools/analyze-exercise.ts`.
5. Update/extend `tests/recommendations.test.ts` (one case per action).
6. Sync `skill/progression-rules.md` with citations.
7. `npm run typecheck && npm run test`.

## Verification

- **Unit:** load-increment math (squat 100→105, bench 80→82.5, curl 12→12.5, clamp + forward-progress
  guard, deload 100→90); helpers (`consecutiveTopRangeSessions` resets on weight change,
  `repDropoffRatio([12,10,6]) = 0.5`, `daysSinceLast`); recommendations — INCREASE_WEIGHT only after 2
  top sessions with correct target; INCREASE_REPS; REDUCE_WEIGHT on regress/drop-off/layoff;
  plateau→deload then→replacement; e1RM-unreliable guard.
- **End-to-end:** `npx tsx src/cli/tool-runner.ts analyze_exercise '{"exercise":"Bench Press"}'` on
  several real lifts from the imported history — confirm `recommendation.target` shows a concrete next
  weight and the action matches the lift's recent pattern.
- `npm run typecheck` clean.
