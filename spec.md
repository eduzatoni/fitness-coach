# Hevy Workout Coach — Specification

> The canonical description of *what* this project is and how it must behave.
> `plan.md` tracks *progress*; this file tracks *intent*. Update this if requirements change.

## 1. One-line summary

A Claude Skill–style project where **chat with Claude is the only interface**. The user asks natural
training questions; Claude retrieves their real [Hevy](https://hevy.com) workout history, runs
**deterministic TypeScript analysis**, and answers like a coach who already knows their history.

## 2. Core principle

```
Me → Claude → Workout Coach Skill → Analysis tools → Hevy API
```

- Claude is the interface. No frontend, no dashboard, no CLI the user operates during normal use.
- Claude decides which tools to call based on the question.
- **Claude must not do progression arithmetic itself.** All numbers (volume, e1RM, trends, plateau,
  double progression) are computed in TypeScript and handed to Claude as structured JSON. Claude
  interprets and phrases; the engine classifies.
- Claude must never ask the user to fetch data it can retrieve from Hevy.
- Prefer actual history over assumptions. Never "you should probably increase bench" without looking
  at recent bench history when it's retrievable.

## 3. Questions the user must be able to ask

How did my workout today go? · Am I progressing on bench? · Should I increase the weight next time? ·
What weight next session? · Am I training chest too much? · Which exercises are plateauing? · Should I
replace any exercises? · How has training changed over 3 months? · Should I change my routine? · What
should I focus on this week? · Compare my last 5 push workouts · When did I last train legs? · Am I
progressing overall? · Should I add another training day?

## 4. Architecture / invocation

- **Tool invocation:** Bash-run CLI. Claude runs
  `npx tsx src/cli/tool-runner.ts <tool> '<json-args>'` (optional `--refresh`), which prints concise
  structured JSON to stdout. (Chosen over an MCP server for simplicity.)
- **Caching:** file cache in `data/cache/` with a short TTL (default 30 min); `--refresh` forces a live
  pull. Keeps chats fast and resilient, fewer API calls.
- Runtime: Node 24 (global `fetch`), TypeScript run via `tsx` (no build step for chat usage), `vitest`.

## 5. Hevy API (confirmed by direct probing)

- Base URL: `https://api.hevyapp.com/v1`
- Auth header: **`api-key: <key>`** (stored in `.env` as `HEVY_API_KEY`, git-ignored; never hard-coded).
- Endpoints (all returned `401 InvalidApiKey` without a key → confirmed to exist):
  - `GET /workouts?page&pageSize` (pageSize max 10), `GET /workouts/count`, `GET /workouts/{id}`
  - `GET /workouts/events?page&pageSize&since`
  - `GET /routines?page&pageSize`
  - `GET /exercise_templates?page&pageSize` (pageSize max 100)
  - `GET /routine_folders`
- Workout shape:
  ```
  { id, title, description, start_time, end_time, updated_at, created_at,
    exercises: [ { index, title, notes, exercise_template_id, superset_id,
      sets: [ { index, type: "normal"|"warmup"|"dropset"|"failure",
                weight_kg, reps, distance_meters, duration_seconds, rpe } ] } ] }
  ```
- exercise_templates carry `primary_muscle_group` / `secondary_muscle_groups` (used for muscle-group
  distribution in routine analysis).

## 6. Tools (each returns concise JSON, not raw dumps)

| Tool | Input | Output (shape) |
|---|---|---|
| `get_recent_workouts` | `{ limit }` | `{ workouts: [...] }` trimmed |
| `get_exercise_history` | `{ exercise, sessions }` | `{ exercise, sessions: [...] }` |
| `analyze_workout` | `{ id? }` (latest if omitted) | per-exercise compare vs previous session + progression flags + recommendation |
| `analyze_exercise` | `{ exercise }` | trend, current/prev working weight, repTrend, e1RM trend, plateauSessions, recommendation{action,target,reason} |
| `get_routines` | `{}` | trimmed routines |
| `analyze_routine` | `{ id? }` | days, distribution, weekly sets, movement patterns, muscle-group dist, overlap, order, flagged issues |
| `get_training_summary` | `{ months? }` | frequency, volume-by-muscle, plateaus, changes over time |

## 7. Analysis engine (deterministic, pure)

Functions for: total volume, working-set volume, rep progression, weight progression, estimated 1RM
(Epley `w*(1+reps/30)`), session frequency, days between sessions, best set, hard-set count,
performance trend. Warmup sets excluded from working metrics.

### Progression model — double progression
Target e.g. `3×8–12`. Example: `80kg 10/10/9` → **maintain**; then `80kg 12/12/12` → **increase**;
then `82.5kg 9/8/8` → **maintain**. A rep drop right after a weight increase is **not** regression.

### Recommendation categories (machine-readable, engine assigns first)
`INCREASE_WEIGHT`, `INCREASE_REPS`, `MAINTAIN`, `MONITOR`, `REDUCE_WEIGHT`, `ADD_SET`, `REMOVE_SET`,
`CONSIDER_REPLACEMENT`, `CONSIDER_ROUTINE_CHANGE`, `INSUFFICIENT_DATA`.

### Plateau detection
Only across several *properly spaced* exposures with flat load + reps + e1RM. One or two bad sessions
is **not** a plateau. Account for days-between and frequency.

## 8. Context-aware coaching
Don't view exercises in isolation. Before recommending more chest work, check existing chest volume.
If triceps performance falls, check whether bench / OHP / triceps-isolation volume rose at the same
time and reason about accumulated workload.

## 9. Recommendation memory
`data/recommendations.json` stores important recommendations `{ date, exercise, action, currentWeight,
target, reason }` so Claude can later check whether past advice worked ("I told you 2 weeks ago to hold
82.5kg; you've since gone 9/8/8 → 11/10/9, so that was right").

## 10. Skill files
- `CLAUDE.md` (root): read the four `skill/*.md` before recommendations; 5-step loop (understand →
  determine data needed → call tool via Bash → analyze JSON → answer conversationally); scope
  discipline (no 12-month analysis for "when did I last train legs?"); tool catalog + invocation
  pattern; preserve follow-up context.
- `skill/SKILL.md`: purpose, responsibilities, prefer-history principle, one-session-vs-trend.
- `skill/coaching-rules.md`: natural coach tone; context-aware coaching.
- `skill/progression-rules.md`: double-progression examples, plateau def, recommendation categories.
- `skill/user-profile.md`: stable context only (goals, frequency, experience, style, equipment,
  preferences, constraints) — no auto-changing metrics.

## 11. Coaching style
Natural: "I'd keep the same weight next time — you're still gaining reps at 82.5kg." Never expose
internals: not "the recommendation engine classified this as MAINTAIN." Structured classifications are
internal only.

## 12. Scope discipline
Retrieve only what's needed. "When did I last train legs?" → don't run a full 12-month analysis.
"Should I change my whole program?" → broader retrieval is appropriate.

## 13. Follow-up context
Questions are conversational, not standalone. "How's my bench?" → "What about incline?" → "Should I
replace it?" must all resolve against the running context.

## 14. Testing
Deterministic tests on the **analysis engine only** (never Claude wording). Fixtures for: steady
progression, double progression, weight increase, one bad workout, plateau, return after break, deload,
new exercise, exercise replacement, irregular frequency. Assert facts like
`{ trend: "progressing", recommendation: "MAINTAIN" }`.

## 15. Milestones
- **M1:** "How did my last workout go?" end-to-end (fetch + per-exercise comparison + progression),
  then contextual "What should I increase next time?" with no extra user data. Tests green.
- **M2:** "How is my bench progressing?" + contextual "Should I increase the weight?"
- **M3:** Routine-level questions (routine health, too much chest, what's neglected, what's plateauing).

## 16. Final rule
It must not feel like software the user operates. It feels like: talk to Claude → Claude already knows
how to inspect training → retrieves Hevy data → coaches. Integration, caching, analysis are hidden
implementation details.
