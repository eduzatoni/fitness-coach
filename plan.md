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
- [ ] harden `analyze_exercise` + `get_exercise_history` for "how is my bench progressing" +
      contextual "should I increase"

## M3 — Routine analysis  `feat:`
- [ ] `src/tools/get-routines.ts`
- [ ] `src/tools/analyze-routine.ts`
- [ ] `src/tools/get-training-summary.ts`
- [ ] muscle-group distribution via exercise_templates; flag meaningful issues only

---

## Verification checklist
- [ ] `npm install && npm test` green (no network; fixtures)
- [ ] user adds real key to `.env`; `npm run tool get_recent_workouts '{"limit":1}'` returns latest workout
- [ ] in-chat: "How did my last workout go?" → conversational per-exercise answer
- [ ] in-chat follow-up: "What should I increase next time?" resolves with no extra user data

---

## Progress log
- 2026-08-12 — Spec confirmed, Hevy API probed (base `/v1`, `api-key` header, endpoints exist).
  Decisions: Bash-run CLI, TTL cache + `--refresh`, full M1 scope. Plan approved.
- 2026-08-12 — M0 committed (chore: scaffold). M1 committed (feat: Hevy client, analysis engine,
  tools, skill files, 33 tests green). Ready for live smoke test with real API key.
