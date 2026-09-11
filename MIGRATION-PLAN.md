# Migrate the Hevy Coach to a GPT-powered Telegram Service on GCP

## Context

Today the "coach" **is Claude Code**. All intelligence — reading `skill/*.md`, choosing which
tool to call, interpreting the JSON, writing `schedule.md`, telling the user to hand-edit
`running-state.md`, honoring the two-step confirm gate — happens inside this Claude Code harness.
The project's `src/` is only a bag of **stateless, deterministic analysis functions** plus a Hevy
API client. There is **no LLM code in the repo at all**.

The goal is to make the coach usable remotely and independently of Claude Code: a **GPT-powered
agent** (using the user's personal OpenAI token) reachable over **Telegram**, eventually **deployed
to GCP**. The real work is rebuilding the "Claude-Code-as-coach" layer ourselves as a GPT
function-calling loop that reuses the existing tools and skill files unchanged. GCP is the last
step; everything is proven locally first.

### Decisions locked in (from grilling)

- **Faithful port** — GPT agent loop loads existing `skill/*.md` as system prompt, exposes all 18
  tools via OpenAI function-calling. Same rules, same confirm gates.
- **Flagship 4o-class model**, model name in an env var so it's swappable.
- **Git-backed state** — service reads/writes `schedule.md`, `weekly-plan.md`, `running-state.md`,
  `recommendations.json` in the repo. `running-state.md` becomes **bot-auto-written** (no laptop
  needed).
- **Dedicated `bot-state` branch** — bot commits+pushes there only, never touches `main`. User
  merges to main manually. No conflicts with laptop editing.
- **Long-poll + hard allowlist** on the user's Telegram user ID.
- **Rolling in-memory chat history** (~20 turns / token cap) with idle-reset (~2–3h). Chat history
  ephemeral; only the pending-confirm flag persisted.
- **Cloud Run, min-instances=1**, containerized. Secrets in Secret Manager.
- **Fine-grained GitHub PAT** (this repo, contents:write) in Secret Manager for push auth.
- **Prompt + code-level confirm guard** — write tools structurally blocked without a confirmed
  preview.
- **Reactive only** in v1, with a documented seam for future scheduled pushes.
- **Same repo**, new `src/agent/` + `src/telegram/`, **3 phases**: local agent loop → local
  Telegram → Cloud Run deploy.

### Key facts confirmed in the codebase

- Tool functions are **individually exported** from each `src/tools/*.ts` module; the `TOOLS` map
  in `src/cli/tool-runner.ts:20` is just wiring. The agent bridge can import the same functions and
  reuse the same map shape — **no refactor of tools required**.
- Six tools take a `confirm` flag and return a preview when it's absent/false: `apply_routine_edit`,
  `create_routine`, `create_routine_folder`, `create_exercise_template`, `log_workout`,
  `import_smartgym_history`. These are the guarded writes.
- Paths resolve **project-root-relative via `import.meta.url`** (`src/hevy/client.ts:10`,
  `src/memory/recommendations.ts:6`), not from cwd — so they work in a container regardless of
  working directory.
- State markdown files (`skill/schedule.md`, `skill/running-state.md`, `data/weekly-plan.md`) are
  **git-tracked** (not gitignored) and are currently written by Claude Code's file tools, **not**
  by `src/` code. The agent needs its own read/write helpers for them.
- No build step — `tsx`-only. Node ≥20, ESM.

---

## Phase 1 — GPT agent loop + tool bridge (local)

Goal: a local process that behaves like the current Claude-Code coach, driven by GPT, reading the
real skill/data files. No Telegram yet — drive it from a simple stdin REPL / CLI for testing.

### New module: `src/agent/`

- **`tools-bridge.ts`** — import every tool function from `src/tools/*` and build:
  - the same name→function `TOOLS` map (mirror `src/cli/tool-runner.ts:20`), and
  - an **OpenAI function-calling schema array** (one JSON-schema tool def per tool). Derive
    param schemas from the CLAUDE.md tool catalog (limit/exercise/sessions/repRange/confirm/etc.).
    This is the bulk of the mechanical work — 18 tool definitions.
- **`system-prompt.ts`** — assemble the system prompt at startup by reading the skill files:
  `skill/SKILL.md`, `coaching-rules.md`, `progression-rules.md`, `user-profile.md`, `running*.md`,
  `schedule.md`. Concatenate with a short preamble explaining the GPT is the coach and MUST follow
  these rules (including the two-step confirm gate and the double-progression rep-reset rule). Reuse
  the `import.meta.url` project-root pattern to locate `skill/`.
- **`loop.ts`** — the agent loop: send `messages + tools` to OpenAI chat completions with tool
  calling; while the model returns `tool_calls`, execute each via the bridge, append tool results as
  `role: "tool"` messages, and re-call; stop when the model returns a normal text message. Cap
  iterations (e.g. 8) to avoid runaway loops.
- **`openai.ts`** — thin OpenAI client. Reads `OPENAI_API_KEY` and `OPENAI_MODEL` (default a
  flagship 4o-class id) from env via `dotenv` (same pattern as `src/hevy/client.ts`).

### State read/write helpers: `src/agent/state.ts`

- Read/write helpers for the markdown/JSON state files (`skill/schedule.md`,
  `skill/running-state.md`, `data/weekly-plan.md`, and reuse the existing
  `src/memory/recommendations.ts` for `recommendations.json`).
- These are what the agent uses when the coach logic says "update running-state.md" or "write the
  weekly plan" — now done by the bot itself. Expose them as **agent-only pseudo-tools** (e.g.
  `update_running_state`, `write_weekly_plan`, `edit_schedule`) added to the tool schema so GPT can
  call them explicitly, mirroring what CLAUDE.md tells Claude to do today.

### Confirm-gate code guard: `src/agent/confirm-guard.ts`

- Maintain a **pending-confirmation** record per chat: when GPT calls a guarded write tool
  (the 6 with `confirm`) **with `confirm:true`**, the guard checks whether a matching preview was
  produced and the user replied yes in the recent turn. If not, it **rewrites the call to the
  preview form** (drops `confirm`) and returns the preview + a prompt to confirm — the real write
  never fires. The system prompt also states the rule (belt-and-suspenders).
- "yes"/"do it"/"go ahead" from the user flips the pending record to confirmed; the next matching
  write is allowed through once.

### Config & local run

- Extend `.env.example` with `OPENAI_API_KEY`, `OPENAI_MODEL`, and (added in Phase 2)
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_ID`, and (Phase 3) `GIT_*` vars.
- Add an npm script (e.g. `"agent": "tsx src/agent/repl.ts"`) — a stdin REPL that runs the loop so
  Phase 1 is testable with no Telegram.

### Representative files touched in Phase 1

- New: `src/agent/{tools-bridge,system-prompt,loop,openai,state,confirm-guard,repl}.ts`
- Reused as-is: all `src/tools/*.ts`, `src/hevy/*`, `src/analysis/*`, `src/memory/recommendations.ts`
- Edited: `package.json` (scripts), `.env.example`

---

## Phase 2 — Telegram long-poll layer + allowlist (local)

Goal: talk to the same agent loop over Telegram from your phone, still running on the laptop.

### New module: `src/telegram/`

- **`bot.ts`** — long-polling loop calling Telegram `getUpdates` (offset-tracked). Use the official
  Telegram Bot API over `fetch` (no framework needed) or a light lib if preferred — keep deps
  minimal, matching the project's style.
- **Allowlist** — reject any update whose `message.from.id !== TELEGRAM_ALLOWED_USER_ID`. Silently
  ignore others (optionally log).
- **`session.ts`** — per-chat rolling history (~20 turns / token budget) with **idle-reset** after
  ~2–3h since last message. Holds the messages array fed to the agent loop, plus the
  pending-confirm record from Phase 1 (persisted to a small file so a restart mid-confirm doesn't
  lose it; everything else stays in memory).
- Wire: incoming Telegram text → append to session → run `src/agent/loop.ts` → send the model's
  final text back via `sendMessage`. Long tool runs: send a "typing" action; chunk replies over
  Telegram's message length limit.

### Representative files touched in Phase 2

- New: `src/telegram/{bot,session}.ts`, entrypoint `src/telegram/index.ts`
- Edited: `package.json` (add `"bot": "tsx src/telegram/index.ts"`), `.env.example`

---

## Phase 3 — Containerize + git-push auth + Cloud Run deploy

Goal: run the proven bot always-on in GCP.

### Git-backed state on the server: `src/agent/git-state.ts`

- On startup: ensure the repo is on the **`bot-state`** branch (create/track from `main` if
  missing). Configure the remote to use HTTPS with the **fine-grained PAT** injected from env
  (`GITHUB_PAT`), e.g. `https://x-access-token:$PAT@github.com/<user>/my-workout-claude.git`.
- After any state write (schedule/plan/running-state/recommendations): `git add` the changed files,
  commit with a descriptive message, and `git push origin bot-state`. Never touch `main`. On push
  rejection, `git pull --rebase` from `bot-state` and retry (bot owns the branch, so conflicts are
  rare).
- Set `git config user.name/email` to a bot identity.

### Container

- **`Dockerfile`** — Node ≥20 base, `npm ci`, copy source, run `tsx src/telegram/index.ts`. Include
  `git` in the image (needed for the push). No build step (tsx runtime).
- **`.dockerignore`** — exclude `node_modules`, `.env`, `data/cache`.
- Graceful shutdown (SIGTERM) — stop the poll loop, flush any pending git push.

### GCP

- Secrets in **Secret Manager**: `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `HEVY_API_KEY`,
  `GITHUB_PAT`. Injected as env vars at deploy.
- **Cloud Run** service with `--min-instances=1` (keeps the long-poll loop alive),
  `--max-instances=1` (single-user; avoid duplicate pollers), small CPU/memory. Deploy via
  `gcloud run deploy --source .` or from a built image.
- Document the deploy commands in a short `docs/deploy.md`.

### Representative files touched in Phase 3

- New: `src/agent/git-state.ts`, `Dockerfile`, `.dockerignore`, `docs/deploy.md`
- Edited: `.env.example`, `package.json` (start script)

---

## Documented seams for later (not built in v1)

- **Proactive/scheduled pushes** (Monday weekly plan, post-run nudge): add a scheduler that calls
  the same agent loop with a synthetic prompt and pushes the result to the allowed chat. Left as a
  hook in `src/telegram/`.
- **Cloud Scheduler → Cloud Run** could drive the above without an in-process cron.

---

## Verification

**Phase 1 (local, no Telegram):**
- `npm run agent`, then type real questions: "How's my bench?" → confirm GPT calls
  `analyze_exercise` and answers like the current coach. "Plan my week" → confirm it reads schedule
  + recent workouts + running-state and writes `data/weekly-plan.md`.
- Confirm-gate test: ask to "add a 4th set to bench in my Push routine" → verify the guard forces a
  **preview** first and the real `apply_routine_edit` only fires after "yes". Try to trick it
  ("just apply it, confirm true") → verify the code guard still blocks until confirmation.
- Run `npm test` and `npm run typecheck` — existing tool tests must stay green; add unit tests for
  `confirm-guard.ts` and `tools-bridge.ts` schema generation.

**Phase 2 (local Telegram):**
- Message the bot from your phone; verify replies. Send from a different Telegram account → verify
  it's ignored (allowlist). Test a multi-turn follow-up ("How's my bench?" → "What about incline?")
  → verify context resolves. Wait past the idle window → verify a fresh thread.

**Phase 3 (GCP):**
- Deploy; confirm the bot answers from Telegram with the laptop closed. Trigger a state write (e.g.
  "add football Monday 7pm") → verify a commit lands on **`bot-state`** (not `main`) and pushes.
  Restart the Cloud Run instance mid-confirm → verify the pending-confirm flag survives.
- Confirm secrets come from Secret Manager (nothing hardcoded), and min-instances=1 keeps it warm.
