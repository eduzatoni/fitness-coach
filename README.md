# Hevy Workout Coach

A personal strength-training (and running) coach that you talk to through Claude Code. Claude
reads your real [Hevy](https://hevy.com) workout history, runs deterministic TypeScript analysis
over it, and answers like a coach who has watched every session.

There is no frontend: **the chat is the interface**. Claude picks which tools to call, interprets
the JSON they return, and replies in plain language.

```
You → Claude Code → skill/*.md (coaching rules) → src/ tools (analysis) → Hevy API
```

## What it can do

- **Answer training questions from real data** — "How's my bench going?", "Which lifts are
  plateauing?", "When did I last train legs?", "Am I training chest too much?"
- **Progression advice** — double progression (e.g. 3×8–12), plateau detection across properly
  spaced sessions, estimated 1RM trends. Weight increases reset reps to the bottom of the range, and
  dumbbell increases snap to the weights your gym actually has.
- **Edit Hevy routines** — add/remove sets and exercises, change targets, create routines and
  folders, import programs from [thefitness.wiki](https://thefitness.wiki). Every write goes through
  a preview → confirm step.
- **Log non-gym sessions** — football, tennis and runs (including warm-up / main / cool-down and
  stride intervals), with backfilling.
- **Running coaching** — a staged progression ladder followed by a pace-development phase, with
  symptom checks and scheduling around other sports.
- **Weekly planning** — combines fixed availability and one-off events in `skill/schedule.md` with
  recent load from Hevy, and writes the plan to `data/weekly-plan.md`.
- **Recommendation memory** — past advice is stored so the coach can check later whether it worked.

All the arithmetic (volume, e1RM, trends, plateaus, progression) happens in TypeScript. Claude only
interprets and phrases the results.

## Setup

Requires Node.js 20+ and a Hevy Pro account (for API access).

```bash
npm install
cp .env.example .env   # then set HEVY_API_KEY (Hevy app → Settings → API)
```

Then open the project in Claude Code and start asking questions. `CLAUDE.md` tells Claude which
skill files to read and which tools to use.

## Running tools directly

Claude calls the tools via Bash, but you can run them yourself too:

```bash
npx tsx src/cli/tool-runner.ts <tool_name> '<json_args>'
# or
npm run tool -- <tool_name> '<json_args>'
```

Add `--refresh` to bypass the cache (`data/cache/`, 30 min TTL) and pull live from Hevy.

```bash
npx tsx src/cli/tool-runner.ts analyze_exercise '{"exercise": "Bench Press", "sessions": 10}'
npx tsx src/cli/tool-runner.ts get_recent_workouts '{"limit": 5}' --refresh
```

### Tools

| Kind | Tools |
|---|---|
| Read / analysis | `get_recent_workouts`, `get_exercise_history`, `analyze_workout`, `analyze_exercise`, `get_routines`, `analyze_routine`, `get_training_summary`, `get_recommendations`, `get_routine_folders` |
| Routine writes | `preview_routine_edit`, `apply_routine_edit`, `create_routine`, `create_routine_folder` |
| Logging / templates | `log_workout`, `create_exercise_template` |
| Import | `import_wiki_routine` (draft only), `import_smartgym_history` (bulk import of a SmartGym text export) |

Tools that write to Hevy only do so when passed `"confirm": true`; without it they return a
preview. See `CLAUDE.md` for the full argument reference.

## Project layout

```
CLAUDE.md          Instructions Claude follows: process, tool catalog, write rules, tone
skill/             Coaching knowledge loaded by Claude
  SKILL.md           Role and responsibilities
  coaching-rules.md  Behaviour, context-aware coaching, session spacing
  progression-rules.md  Double progression, plateau definition
  user-profile.md    Goals, experience, equipment, constraints
  running*.md        Running protocol, current state, pace phase
  schedule.md        Weekly availability and dated events (the only file Claude edits)
src/
  cli/tool-runner.ts Entry point: dispatches tool name + JSON args, prints JSON
  tools/             One file per tool
  analysis/          Pure analysis engine (trend, plateau, e1RM, volume, progression, …)
  hevy/              Hevy API client and resource wrappers
  wiki/              thefitness.wiki scraper/parser
  import/            SmartGym history parser and importer
  memory/            Recommendation storage
data/              Cache, weekly plan, stored recommendations
memory/            Coaching memory notes
tests/             Vitest unit tests
docs/, *.md        Specs and plans (spec.md, plan.md, MIGRATION-PLAN.md, …)
```

## Development

```bash
npm test           # vitest
npm run typecheck  # tsc --noEmit
```

## Further reading

- `spec.md` — what the project is and how it must behave
- `plan.md` — build progress
- `plan-writes.md` — routine write support
- `MIGRATION-PLAN.md` — plan to run the coach as a GPT-powered Telegram bot on GCP
- `plan-calendar-sync.md` — Apple Calendar sync spec
