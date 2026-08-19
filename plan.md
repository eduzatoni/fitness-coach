# Hevy Workout Coach — Plan & Progress

> Living progress tracker. See `spec.md` for *what* we're building and *why*.
> Update the checkboxes and the log as work lands. Commit each milestone separately
> (`feat:` / `fix:` / `chore:` / `test:`).

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done

---

## M0 — Scaffold  `chore:`
- [x] `git init`
- [x] `package.json` (ESM `type:module`; deps: typescript, tsx, vitest 3.x, dotenv; scripts: `tool`, `test`, `typecheck`)
- [x] `tsconfig.json` (NodeNext, strict)
- [x] `.gitignore` (`.env`, `node_modules`, `data/cache/*`)
- [x] `.env.example` (`HEVY_API_KEY=`)
- [x] `data/cache/.gitkeep`, `data/recommendations.json` (`[]`)

## M1 — Data layer + "How did my last workout go?" end-to-end  `feat:`
### Hevy client
- [x] `src/hevy/types.ts`
- [x] `src/hevy/client.ts` (api-key header, TTL file cache, `refresh`, paginate)
- [x] `src/hevy/workouts.ts` (recent, byId, count, since)
- [x] `src/hevy/routines.ts`
- [x] `src/hevy/exercises.ts` (templates cache + fuzzy name→id resolver)
### Analysis (pure, deterministic)
- [x] `src/analysis/estimated-1rm.ts` (Epley; best working set)
- [x] `src/analysis/volume.ts` (total, working-set, hard-set count)
- [x] `src/analysis/progression.ts` (weight/rep progression; double progression)
- [x] `src/analysis/trend.ts` (performance trend across exposures)
- [x] `src/analysis/plateau.ts` (multi-exposure, spacing-aware)
- [x] `src/analysis/recommendations.ts` (metrics → recommendation enum + target + reason)
### Tools + runner + memory
- [x] `src/tools/get-recent-workouts.ts`
- [x] `src/tools/get-exercise-history.ts`
- [x] `src/tools/analyze-workout.ts`
- [x] `src/tools/analyze-exercise.ts`
- [x] `src/cli/tool-runner.ts` (dispatch, validate, JSON out, `--refresh`)
- [x] `src/memory/recommendations.ts` (read/write `data/recommendations.json`)

## M1 — Skill instruction files  `feat:`
- [x] `CLAUDE.md` (5-step loop, tool catalog + invocation, scope discipline, follow-up context)
- [x] `skill/SKILL.md`
- [x] `skill/coaching-rules.md`
- [x] `skill/progression-rules.md`
- [x] `skill/user-profile.md` (template w/ placeholders)

## M1 — Tests  `test:`
- [x] fixtures: steady-progression, double-progression, weight-increase, one-bad-workout, plateau,
      return-after-break, deload, new-exercise, exercise-replacement, irregular-frequency
- [x] analysis assertions (trend + recommendation facts)
- [x] one-bad-workout ≠ plateau/regression; post-increase rep-drop = MAINTAIN
- [x] tool-runner emits valid JSON (no live API)
- [x] `npm test` green (33 tests)

## M2 — Exercise progression Q&A  `feat:`
- [x] harden `analyze_exercise` + `get_exercise_history` for "how is my bench progressing" +
      contextual "should I increase" (recentSessions[], 5× fetch multiplier, fuzzy resolver)

## M3 — Routine analysis  `feat:`
- [x] `src/tools/get-routines.ts`
- [x] `src/tools/analyze-routine.ts` (muscle-group volume, movement patterns, flagged issues)
- [x] `src/tools/get-training-summary.ts` (period summary, plateaus, frequency, weekly volume)
- [x] `src/analysis/muscle-groups.ts` (inferMovementPattern, aggregateMuscleVolume, flagVolumeImbalances)
- [x] `src/tools/get-recommendations.ts` (expose stored recommendations to Claude)

## Post-review fixes  `fix:`
- [x] `getWorkoutsSince`: string date comparison → proper `new Date()` comparison
- [x] `inferMovementPattern`: remove dead inner branch
- [x] `isPostBumpAdjustment`: add `repMax` guard
- [x] `detectPlateau`: check weight + reps + e1RM (not e1RM alone)
- [x] Deduplicate `matchesExercise` + session loop → `collectExerciseSessions()` in workouts.ts
- [x] Deduplicate muscle keyword map in `get-training-summary` → use `inferMovementPattern`
- [x] Merge split imports in `analyze-workout.ts`
- [x] Add return-after-break recommendation fixture

## M4 — Import routines from thefitness.wiki  `feat:`

> Point the coach at a thefitness.wiki routine URL → scrape exercises + set/rep scheme →
> resolve each name to a Hevy template → return a **draft `RoutineInput`** (writes nothing).
> The existing confirm-gated `create_routine` does the actual write.
>
> Decisions: (1) on-wiki URLs only, off-site rejected with a clear message; (2) auto-pick closest
> exercise match via `resolveExerciseName`, but report every raw→canonical resolution so it can be
> eyeballed before create; (3) progression logic (AMRAP, deload, +2.5 lb) → routine `notes`.
> Verified: native `fetch` + browser UA returns 200 (plain fetch 403); no HTML lib — parse by regex.

### Fetch + parse (new `src/wiki/`)
- [x] `src/wiki/fetch.ts` — `assertWikiUrl` (host guard, off-site → clear error) + `fetchWikiHtml`
      (browser `User-Agent`, throw on `!ok`); uncached
- [x] `src/wiki/parse.ts` — pure `parseWikiRoutine(html, url?)`: extract `<li>`s, decode entities,
      scheme regex `^(\d+)×(\d+(?:-\d+)?)(\+?)\s+(name)$` (× and plain `x`, `+`=AMRAP, range→lower
      bound); title from `<h1>`/`<title>`; matched `<li>`=exercise, adjacent non-matching=notes

### Tool + registration
- [x] `src/tools/import-wiki-routine.ts` — `importWikiRoutineTool({url, refresh?})`: fetch → parse →
      `resolveExerciseName` per exercise → build draft `RoutineInput` (sets `weight_kg:null`, reps;
      AMRAP → exercise `notes`, `type:normal`; progression → routine `notes`); returns
      `{ draft, resolution[], unmatched[], progressionNotes[], sourceUrl }`; **writes nothing**
- [x] `src/cli/tool-runner.ts` — register `import_wiki_routine` in `TOOLS` map

### Tests + docs
- [x] `tests/wiki-parse.test.ts` — pure parser vs inline HTML (× decode, `+`→amrap, plain `x`,
      `&#8217;`→`'`, notes exclude nav, `8-12`→reps 8, empty HTML → no throw); optional real fixture
- [x] `CLAUDE.md` Write tool catalog + `skill/SKILL.md` + `skill/progression-rules.md` short entries

### Known limitations (v1)
- Multi-day (Day A/B) merges into one draft; prose routines yield 0 exercises (no throw);
  reversed order / spelled-out AMRAP fall into notes; bodyweight/time-based lifts may resolve
  oddly — the `resolution` array is what lets the coach catch and correct before create.

## M5 — Whole-training activity log (football + running)  `feat:`

> The coach only sees Hevy gym sessions today; football and running (which tax the legs and cause
> fatigue) are invisible, so it can't answer "played football today — train legs tomorrow?".
> Add a coach-maintained markdown log of **non-gym** activity so scheduling/recovery advice covers
> the whole week. **Gym stays in Hevy — never logged here.**
>
> Decisions: (1) log = `data/training-log.md`, newest-first, committed to git; (2) Claude edits the
> markdown **directly** from screenshots/messages — no CLI tool, no JSON; (3) coach **infers**
> leg/fatigue load (user doesn't tag); (4) TYPE ∈ Football | Running | Other (no Gym).
> **Zero source-code changes — instruction + markdown only.**

### Step 1 — seed the log file
- [x] Create `data/training-log.md`: title + "how this works" legend + load-reference table +
      `## Log` section, seeded with ~4 example lines (football match, easy 5k, long run, hike/cycle)
- [x] Line format `- YYYY-MM-DD | TYPE | duration | details | load: legs=<L> fatigue=<L>`;
      legend states plainly **gym is not logged here — it comes from Hevy**

### Step 2 — teach the coach to maintain it (`CLAUDE.md`)
- [x] Add `## Logging activity` (after `## Making changes to routines`, before `## Coaching tone`):
      only non-gym activity; extract {date,type,duration,details} → infer load → resolve date (ask if
      ambiguous) → duplicate-guard → append newest-first → confirm in one coach sentence; direct file
      edit, not a tool; backfill inserts at correct date position

### Step 3 — scope the read-list (`CLAUDE.md` lines 7-12)
- [x] Keep 4 `skill/` files unconditional; add `data/training-log.md` **conditionally** — read it for
      scheduling / recovery / "should I train X, skip, switch" questions, NOT single-exercise Qs; tie
      to existing "Scope discipline"

### Step 4 — scheduling advice rules (`skill/coaching-rules.md`)
- [x] Add `### Whole-training scheduling` inside `## Context-aware coaching` (after Muscle-group
      thinking): gym recency from Hevy + sport load from log; per-activity load inference; ~24h heavy-
      leg spacing after match/hard run; flag only leg/whole-body conflicts + back-to-back high-leg
      days; one-line answers for train-legs-tomorrow / skip / switch

### Step 5 — plan vs. actuals split (`skill/user-profile.md`)
- [x] Add `## Weekly activity schedule` after `## Training frequency` (football days, running cadence,
      gym split, fixed constraints) with `?` placeholders — profile = plan, log = actuals

### Step 6 — responsibility discoverability (`skill/SKILL.md`)
- [x] Add whole-training-tracking bullet to `## Responsibilities` + "training log" line under
      "Can change"

### Verification (behavioral — no unit tests)
- [ ] "Played 90-min football today" → appends Football line, confirms in one sentence
- [ ] Strava run screenshot → reads distance/date, classifies easy/hard, appends, confirms
- [ ] Gym session mentioned → NOT logged (uses Hevy instead)
- [ ] Ambiguous date → asks "was this today?" rather than guessing
- [ ] Re-send same activity → "already logged", no duplicate
- [ ] "Should I train legs tomorrow?" after a match → reads log + Hevy leg recency → spacing advice
- [ ] "How's my bench?" → does NOT read the log (scope check)
- [ ] `git status` shows `data/training-log.md` tracked (not ignored)

---

## M6 — Log sport workouts to Hevy + auto-apply next-session targets  `feat:`

> Two features that make the project a true whole-training guide:
> (A) Football and running log directly to Hevy via `POST /v1/workouts` — replacing the M5
>     markdown workaround. `get_recent_workouts` / `get_training_summary` see them automatically.
>     Football needs a one-time custom template (`distance_duration`, full_body + legs).
>     Running uses the existing template `AC1BB830`.
> (B) After analysis the coach immediately previews the `change_target` edits and asks to confirm
>     in one go — no more "do it manually" todos.
>
> Decisions: (A) Football type = `distance_duration` (duration + km); (B) apply immediately after
> analysis (preview on the spot, no pending-targets store).
> **M5 `data/training-log.md` and its CLAUDE.md sections are removed** — superseded by Feature A.

### Feature A — Sport workout logging

- [x] `src/hevy/types.ts` — add `WorkoutSetInput`, `WorkoutExerciseInput`, `WorkoutInput`,
      `ExerciseTemplateInput` types (mirrors `RoutineInput` pattern; sets carry `duration_seconds`
      + `distance_meters`)
- [x] `src/tools/create-exercise-template.ts` — `createExerciseTemplateTool({exercise, confirm?})`:
      no confirm → `{ preview }`; confirm → `hevyPost("/exercise_templates", …)` → `{ created, id, title }`
- [x] `src/tools/log-workout.ts` — `logWorkoutTool({workout, confirm?})`:
      no confirm → `{ preview }`; confirm → `hevyPost("/workouts", …)` → `{ logged, id, title }`;
      accept exercise names via `resolveExerciseName()` so coach can pass "Running" not a raw ID
- [x] `src/cli/tool-runner.ts` — register `create_exercise_template` + `log_workout`
- [x] `src/analysis/muscle-groups.ts` — add `cardio: "cardio"` to `movementToMuscle`; add Football/
      Soccer title keyword → map to quadriceps + hamstrings so `get_training_summary` reports leg load
- [x] `CLAUDE.md` — remove `## Logging activity` + conditional log read-list; add `log_workout` +
      `create_exercise_template` to tool catalog; update scheduling rules reference (Hevy tools, not log)
- [x] `skill/coaching-rules.md` — update `### Whole-training scheduling` to read from Hevy tools
- [x] Remove `data/training-log.md` (M5 workaround, superseded)

### Feature B — Auto-apply next-session targets

- [x] `CLAUDE.md` — add subsection in routine-writing section: when analysis yields per-exercise
      targets for a named routine, immediately call `get_routines` → batch `preview_routine_edit`
      for each target → show combined summary ("Face Pull 38kg was 35kg, Bicep Curl 11kg was 10kg —
      apply all?") → on yes, `apply_routine_edit` for each in sequence
- [x] `skill/coaching-rules.md` — add rule under `## Making changes`: don't wait for the user to
      ask; show batch preview immediately when analysis produces a target list

### Tests
- [x] `tests/muscle-groups.test.ts` — add assertion that Football title maps to leg muscles in
      the `get_training_summary` keyword path

### Verification
- [ ] `create_exercise_template` preview (no confirm) → shows Football template shape
- [ ] `create_exercise_template` with `confirm:true` → Football appears in Hevy exercise library
- [ ] `log_workout` Football match (past date, distance + duration) → preview, then confirm →
      appears in `get_recent_workouts`
- [ ] `log_workout` Running (template "Running", distance + duration) → same flow
- [ ] `get_training_summary` after logging football → quadriceps/hamstrings in muscle frequency
- [ ] Analysis of an exercise → coach immediately shows "I'd update Routine X: Face Pull → 38kg.
      Apply?" → confirm → `get_routines` shows updated target
- [ ] `npm test` green (including new muscle-groups assertion)

---

## Verification checklist
- [x] `npm install && npm test` green (103 tests, no network)
- [ ] user adds real key to `.env`; `npm run tool get_recent_workouts '{"limit":1}'` returns latest workout
- [ ] in-chat: "How did my last workout go?" → conversational per-exercise answer
- [ ] in-chat follow-up: "What should I increase next time?" resolves with no extra user data
- [ ] M4: `npm run tool import_wiki_routine '{"url":"https://thefitness.wiki/routines/r-fitness-basic-beginner-routine/"}'`
      → 6 resolved exercises, progression notes, valid draft, nothing written
- [ ] M4: off-site URL (e.g. reddit.com) → clear "only thefitness.wiki" error

---

## Progress log
- 2026-08-12 — Spec confirmed, Hevy API probed (base `/v1`, `api-key` header, endpoints exist).
  Decisions: Bash-run CLI, TTL cache + `--refresh`, full M1 scope. Plan approved.
- 2026-08-12 — M0 committed (chore: scaffold). M1 committed (feat: Hevy client, analysis engine,
  tools, skill files, 33 tests green). Ready for live smoke test with real API key.
- 2026-08-12 — M2 committed (feat: exercise Q&A hardening, fuzzy resolver, 43 tests).
- 2026-08-12 — M3 committed (feat: routine analysis, training summary, muscle-groups, 58 tests).
- 2026-08-12 — Post-review fixes committed (fix: date comparison bug, plateau spec §7 compliance,
  isPostBumpAdjustment repMax guard, deduplication, get_recommendations tool, 59 tests green).
- 2026-08-19 — M5 committed (feat: whole-training activity log). New: `data/training-log.md`
  (Football/Running/Other only; gym stays in Hevy). Updated: CLAUDE.md (scoped read-list + logging
  flow), skill/coaching-rules.md (whole-training scheduling rules + load table), skill/user-profile.md
  (weekly activity schedule section), skill/SKILL.md (whole-training responsibilities). Zero code
  changes — instruction + markdown only.
  (browser-UA fetch + host guard), `src/wiki/parse.ts` (pure regex parser, entity decode, AMRAP,
  rep ranges), `src/tools/import-wiki-routine.ts` (draft RoutineInput, writes nothing), registered
  in tool-runner, 16 new parser tests, docs in CLAUDE.md + skill/. 103 tests green, typecheck clean.
  tool that writes nothing. Decisions locked: on-wiki only, auto-match-but-report, progression→notes.
- 2026-08-19 — M6 committed (feat: sport workout logging + auto-apply targets). Feature A: new
  types (WorkoutInput, ExerciseTemplateInput), create_exercise_template + log_workout tools with
  confirm gate, log_workout resolves exercise names via resolveExerciseName, football keyword →
  quads/hamstrings in get_training_summary, cardio added to movementToMuscle, data/training-log.md
  removed (superseded). Feature B: batch change_target flow in CLAUDE.md + coaching-rules.md.
  105 tests green, typecheck clean.
