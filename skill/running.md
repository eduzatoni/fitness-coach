# Running Coaching Protocol

## Core philosophy

Tissue adaptation takes priority over cardiovascular fitness — always. The musculoskeletal system
(bones, tendons, shins, feet, ankles) adapts slower than the cardiovascular system. This is the
governing constraint in every running decision.

Rules that follow from this:
- Duration before pace — build time on feet before worrying about speed
- Never increase intensity and volume simultaneously
- Consistency over heroic sessions
- Injury-free progression is the only goal — one setback undoes weeks of work

---

## Target pace

**Current working range: 10:15–10:45/km (conversational pace)**

This is a **starting point due to shin-splint recovery history**, not a permanent lock. As tissue
adapts and running becomes consistent and symptom-free, pace will improve naturally. Don't chase
it — let it come.

- Low HR at target pace = aerobic adaptation happening. Good sign. Not a reason to go faster.
- Only suggest increasing pace after **30min continuous is achieved comfortably** across multiple
  sessions — never before. The ladder must be complete first.
- If pace is naturally drifting faster (same effort, faster splits) — that's adaptation. Note it,
  don't fight it, but don't prescribe faster targets until stage 9 is consolidated.

---

## Progression ladder

The ladder is a **rehabilitation and base-building tool**, not a lifetime constraint. It gets the
athlete to 30min continuous running injury-free. Once that's achieved comfortably, the focus shifts
from duration to pace.

```
Stage 0 — 1min_run (intervals)
Stage 1 — 2min_run (intervals)
Stage 2 — 3min_run (intervals)
Stage 3 — 5min_run (intervals)
Stage 4 — 8min_run (intervals)
Stage 5 — 10min_intervals
Stage 6 — 15min_continuous
Stage 7 — 20min_continuous   ← current
Stage 8 — 25min_continuous
Stage 9 — 30min_continuous   ← then pace focus begins
```

**Progression rules:**
- Advance only after **≥2 consecutive successes** at the current stage
- Success = stable pace within target range + stable effort + no pain during or next morning
- Any symptom reported → repeat current stage or regress one step. Never force.
- At stage 9 with ≥2 successes and no symptoms → shift focus: same duration, gradually improve pace

**Current state:** see `skill/running-state.md`

---

## Weekly scheduling

Default baseline: **Tuesday / Thursday** runs. This is a guideline — it flexes around football,
gym legs, hikes, travel, and life. Never treat it as fixed.

**Minimum spacing:** 1 rest day between any two high-load sessions (run / football / hike).

**Football exception:** shift the nearest run 1+ day later. If football is Wednesday, Thu is too
soon — move to Friday.

**Long hike (≥2h):** same spacing rule as a football match. Avoid running the next day.

**Gym leg day before a run:** flag it but don't cancel. Recommend conservative effort and watch for
shin/calf tightness during and after. If symptoms → stop early.

**Daily walk baseline:** a 20-min walk on non-run, non-travel days contributes low but non-zero
leg load. No day is truly zero-load. Factor this in when assessing cumulative fatigue — especially
on weeks with football + gym legs + walking.

**Travel:** assume no walk on travel days (lower baseline).

---

## Proactive next-session planning

After any logged run or relevant activity (football, gym legs, hike), **proactively suggest** the
next session without waiting to be asked:
- Next run date (based on current schedule + spacing rules)
- Stage/duration for that run
- What to watch for (shins, ankle, effort)
- Any load flags for the coming days

One or two sentences is enough. Don't wait for "what should I do next?" — say it.

---

## Run review protocol

When the athlete shares a completed run, review in this order:

1. **Pacing consistency** — even splits matter more than average pace. Good: 10:28/10:24/10:20.
   Poor: 9:20/11:10/10:45 — even if the average looks fine.
2. **Effort vs. pace** — does the effort level match the pace? Unexpectedly high effort at target
   pace can signal fatigue or early symptom.
3. **Context** — what else happened that week? Football, gym legs, hike, poor sleep, travel?
   Always compare the run to what surrounded it.
4. **Comparison to prior sessions** — pull recent runs from Hevy. Is pace stable? Distance
   increasing? Don't evaluate a session in isolation.

After the review, **always do the symptom check** (see below) and **always state what's next**
(stage assessment + next run suggestion).

---

## How to read running data from Hevy

Runs are logged with **3 sets per exercise** (Running template):
- `warmup` — warm-up interval: distance + duration
- `normal` — **main fast interval**: distance + duration → **this is the performance set**
- `dropset` — cool-down interval: distance + duration

For progression tracking, use the **`normal` set's pace** (duration_seconds ÷ distance_meters),
not the total session pace. Total distance includes warm-up and cool-down and will inflate the
numbers.

To compute pace from a `normal` set:
- pace (min/km) = (duration_seconds / 60) / (distance_meters / 1000)

---

## Symptom check

Ask after **every run review** — even when everything seems fine:

- Shin pain during or after the run?
- Pain on top of the foot?
- Ankle discomfort?
- Knee discomfort?
- How did the shins feel the morning after?

**Symptoms override all performance metrics.** Any symptom present → do not progress, repeat
current stage or regress. No exceptions.

---

## Progression assessment

After reviewing a run, check `skill/running-state.md` for current stage and consecutive successes.

| State | Action |
|---|---|
| ≥2 successes, no symptoms | Recommend next stage. Tell user exactly what to update in `skill/running-state.md`. |
| 1 success, no symptoms | One more needed. Repeat current stage. |
| Any symptom | Do not progress. Repeat or regress. Update state accordingly. |

When recommending progression, be explicit: "Update `skill/running-state.md`: change stage to 8
(25min_continuous), reset consecutive successes to 0, update last run date."

---

## Daily walks

Not logged in Hevy — too low-impact to be worth the overhead.

When doing scheduling or cumulative load assessment, **ask the user** whether they walked that day:
"Did you get your walk in today?" Factor the answer into load calculations. On travel days, assume
no walk (lower baseline load).
