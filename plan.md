# Hevy Workout Coach — Plan & Progress

> Living progress tracker. See `spec.md` for *what* we're building and *why*.
> Update the checkboxes and the log as work lands. Commit each milestone separately
> (`feat:` / `fix:` / `chore:` / `test:`).

## Status legend
`[ ]` todo · `[~]` in progress · `[x]` done

---

## M0 — Scaffold  `chore:`
- [ ] `git init`
- [ ] `package.json` (ESM `type:module`; deps: typescript, tsx, vitest, dotenv; scripts: `tool`, `test`, `typecheck`)
- [ ] `tsconfig.json` (NodeNext, strict)
- [ ] `.gitignore` (`.env`, `node_modules`, `data/cache/*`)
- [ ] `.env.example` (`HEVY_API_KEY=`)
- [ ] `data/cache/.gitkeep`, `data/recommendations.json` (`[]`)

## M1 — Data layer + "How did my last workout go?" end-to-end  `feat:`
### Hevy client
- [ ] `src/hevy/types.ts`
- [ ] `src/hevy/client.ts` (api-key header, TTL file cache, `refresh`, paginate)
- [ ] `src/hevy/workouts.ts` (recent, byId, count, since)
- [ ] `src/hevy/routines.ts`
- [ ] `src/hevy/exercises.ts` (templates cache + fuzzy name→id resolver)
### Analysis (pure, deterministic)
- [ ] `src/analysis/estimated-1rm.ts` (Epley; best working set)
- [ ] `src/analysis/volume.ts` (total, working-set, hard-set count)
- [ ] `src/analysis/progression.ts` (weight/rep progression; double progression)
- [ ] `src/analysis/trend.ts` (performance trend across exposures)
- [ ] `src/analysis/plateau.ts` (multi-exposure, spacing-aware)
- [ ] `src/analysis/recommendations.ts` (metrics → recommendation enum + target + reason)
### Tools + runner + memory
- [ ] `src/tools/get-recent-workouts.ts`
- [ ] `src/tools/get-exercise-history.ts`
- [ ] `src/tools/analyze-workout.ts`
- [ ] `src/tools/analyze-exercise.ts`
- [ ] `src/cli/tool-runner.ts` (dispatch, validate, JSON out, `--refresh`)
- [ ] `src/memory/recommendations.ts` (read/write `data/recommendations.json`)

## M1 — Skill instruction files  `feat:`
- [ ] `CLAUDE.md` (5-step loop, tool catalog + invocation, scope discipline, follow-up context)
- [ ] `skill/SKILL.md`
- [ ] `skill/coaching-rules.md`
- [ ] `skill/progression-rules.md`
- [ ] `skill/user-profile.md` (template w/ placeholders)

## M1 — Tests  `test:`
- [ ] fixtures: steady-progression, double-progression, weight-increase, one-bad-workout, plateau,
      return-after-break, deload, new-exercise, exercise-replacement, irregular-frequency
- [ ] analysis assertions (trend + recommendation facts)
- [ ] one-bad-workout ≠ plateau/regression; post-increase rep-drop = MAINTAIN
- [ ] tool-runner emits valid JSON (no live API)
- [ ] `npm test` green

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
  Decisions: Bash-run CLI, TTL cache + `--refresh`, full M1 scope. Plan approved. Starting M0.
