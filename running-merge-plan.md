# Plan: Merge running-coach skill into Hevy coaching project

## Context

A standalone running-coach skill exists at `/Users/ezatoni/.claude/skills/running-coach/SKILL.md`
with detailed protocol for injury-safe run/walk interval progression. It has its own data files
(`~/running-coach/state.json`, `~/running-coach/log.json`) that are now superseded — run history
lives in Hevy (logged via `log_workout`), and the state files are from June when the athlete was
at stage 5 (10min intervals). Reality today: **stage 7, 20-min continuous**.

The goal is to fold all the running-coach knowledge into this project so one coach handles
everything — gym, running, football, scheduling — with no separate skill to invoke.

**Decisions:**
- Running progression state (stage, consecutive successes) → `skill/running-state.md`, managed
  here, not in `~/running-coach/state.json` (those files become archive-only).
- Injury history (shin splints, ankle reconstruction, knee problems, tissue adaptation) → `skill/user-profile.md`.
- Running protocol (progression ladder, scheduling, symptom checks, review) → new `skill/running.md`.
- `~/running-coach/` files: left on disk as archive, not read or written by this project.

---

## What the running-coach skill brings that this project lacks

| Knowledge area | Running-coach has | Hevy project has |
|---|---|---|
| Injury history | Full (shin, ankle recon, knee) | Nothing |
| Daily walk baseline | Documented (20 min every non-run day) | Nothing |
| Progression ladder | 10 stages, explicit stage tracking | Nothing |
| Tissue vs. CV adaptation | Core philosophy | Nothing |
| Target pace guidance | Starting range, evolves over time | Nothing |
| Weekly scheduling templates | Default + football/hike exceptions | General load rules only |
| Symptom check protocol | After every run review | Nothing |
| Workout review protocol | Detailed (pacing splits, HR, effort, context) | General |
| Proactive next-session planning | After every log | Nothing |

---

## Files

### New: `skill/running.md` — running protocol (the core new file)

**Sections:**

1. **Core philosophy** — tissue adaptation > CV adaptation; duration before pace; never increase
   intensity and volume simultaneously; consistency over speed; injury-free is the only goal.
   Musculoskeletal system (bones, tendons, shins, feet, ankles) adapts slower than cardiovascular —
   this always takes priority.

2. **Target pace** — current working range: 10:15–10:45/km (conversational pace). This is a
   **starting point due to shin-splint recovery history**, not a permanent lock. As tissue adapts
   and running becomes consistent, pace will naturally improve. Only suggest increasing pace after
   reaching 30min continuous comfortably over multiple sessions — never earlier. Low HR at current
   target pace = aerobic adaptation, not a reason to go faster yet.

3. **Progression ladder** — 10 stages from 1min_run → 30min_continuous. The ladder is a
   **rehabilitation and base-building tool**, not a lifetime constraint. Once 30min continuous is
   achieved comfortably (≥2 successes, no symptoms), the focus shifts from duration to pace.
   Progress only after ≥2 consecutive successes at the current stage. Success = stable pace,
   stable effort, no pain during or next morning. Symptom → repeat or regress, never force.

   ```
   0 — 1min_run        5 — 10min_intervals
   1 — 2min_run        6 — 15min_continuous
   2 — 3min_run        7 — 20min_continuous  ← current
   3 — 5min_run        8 — 25min_continuous
   4 — 8min_run        9 — 30min_continuous  ← then pace focus begins
   ```

4. **Weekly scheduling** — default: Tue/Thu runs. This is a guideline, not a fixed template —
   it flexes around football, gym legs, hikes, travel, and life. Min 1 rest day between any two
   high-load sessions (run/football/hike). After every logged activity, suggest what comes next
   (next run day, rest, what to watch for). Daily walk (non-travel, non-run days) = low but
   non-zero baseline — factor into cumulative load assessments.

   Football exceptions: shift nearest run 1+ day later. Long hike (≥2h): same as football.
   Gym leg day before a run: flag but don't cancel; conservative effort, watch shins/calves.

5. **Proactive next-session planning** — after any logged run or relevant activity, the coach
   should proactively suggest: next run date, stage/duration, what to watch for, and any load
   flags for the coming days. Don't wait to be asked.

6. **Run review protocol** — when athlete shares a run:
   - Pacing consistency: even splits > fast-slow average, even if overall pace looks fine
   - Effort vs. pace (does it match?)
   - Context: what else happened that week (football, gym legs, hike)?
   - Compare to prior sessions from Hevy (not just the latest)

7. **How to read running data from Hevy** — runs have 3 sets: `warmup`, `normal` (main fast
   interval), `dropset` (cool down). Use the `normal` set's pace and distance for progression
   tracking. Total distance includes warm-up and cool-down.

8. **Symptom check** — ask after every run review:
   - Shin pain during or after?
   - Pain on top of the foot?
   - Ankle discomfort?
   - Knee discomfort?
   - How did shins feel the morning after?
   Symptoms override all performance metrics. Any present → stop progression.

9. **Progression assessment** — after reviewing a run, check `skill/running-state.md`.
   ≥2 successes + no symptoms → recommend next stage and tell user to update the state file.
   1 success → one more needed. Symptoms → regress, update state.

10. **Daily walks** — not logged in Hevy (too low impact to be worth it). When doing scheduling
    or load assessment, ask the user whether they walked that day so it can be factored in.
    On travel days, assume no walk (lower baseline).

### New: `skill/running-state.md` — mutable progression state

Replaces `~/running-coach/state.json`. Small, human-editable file:

```markdown
# Running State

## Current stage
- Stage index: 7
- Stage name: 20min_continuous
- Consecutive successes at this stage: 3
- Last run date: 2026-08-20

## Next stage
- Stage index: 8
- Stage name: 25min_continuous

## Notes
- Eligible for progression to stage 8 — next run should attempt 25min continuous
```

The coach reads this before giving running advice. After a session review, the coach tells the
user **exactly what lines to update** (successes count, last run date, notes). The user confirms
and updates the file manually — the coach doesn't auto-write skill files.

### Edit: `skill/user-profile.md` — fill in athlete context

**Goals:** Build strength and muscle (primary gym goal). Improve cardiovascular fitness and running
endurance. Stay fit, active, and injury-free across gym + running + football. Sustainability and
long-term health over performance metrics.

**Injuries or constraints:**
- Shin splints (history) — tissue adaptation always takes priority over CV fitness
- Ankle ligament reconstruction (history) — monitor ankle discomfort after runs
- Knee problems (history) — watch for knee discomfort, especially after football or downhill
- Never rush running progression — musculoskeletal system adapts slower than cardiovascular

**Training frequency / weekly schedule:**
- Daily 20-minute morning walk on non-run, non-travel days — contributes to leg load baseline
- Football: non-fixed, occasional — treat each instance as a load event
- Running: Tue/Thu as default baseline; flexible around everything else
- Gym: Push/Pull/Legs, 3–4×/week, flexible days

**Location:** Switzerland

**Experience:** Intermediate gym (multi-year), returning runner (rebuilding from injury base)

### Edit: `skill/coaching-rules.md` — scheduling additions

Add to `### Whole-training scheduling`:
- Gym leg day before a run → flag but don't cancel; conservative effort, watch shins/calves
- Long hike (≥2h) → same spacing rule as football (avoid running the next day)
- Daily walk → non-zero leg load baseline; ask about walks when assessing cumulative load

### Edit: `CLAUDE.md` — scoped read-list additions

Add to the read-list (conditionally):
- `skill/running.md` — for any running question (review, plan, progression, scheduling)
- `skill/running-state.md` — for progression assessment or planning next run session

Add instruction: when giving running advice after a session, **tell the user explicitly what to
update in `skill/running-state.md`** (which lines, what values).

---

## What gets dropped / not merged

- `~/running-coach/log.json` → archived; Hevy is now the run log
- `~/running-coach/state.json` → archived; superseded by `skill/running-state.md`
- The step-by-step 7-step workflow → replaced by this project's CLAUDE.md process
- The log entry JSON schema → not needed; Hevy stores runs via `log_workout`

---

## Current confirmed state (from Hevy logs + user confirmation)

- Stage 7 (20min_continuous), confirmed by user
- 5 runs logged since returning (Jun–Aug 2026), all successful, all at target pace
- Consecutive successes: 2+ → **eligible for stage 8 (25min_continuous)**
- No symptoms reported across any session

---

## Verification

1. "How's my running?" → coach reads `skill/running.md` + Hevy recent runs → data-grounded
   answer referencing stage, pace trend, eligibility for progression.
2. "Should I progress?" → reads `skill/running-state.md` → confirms successes, no symptoms →
   recommends stage 8, tells user what to update in state file.
3. "I have football Wednesday, plan my week" → reads `skill/running.md` scheduling section +
   `skill/user-profile.md` → gives flexible day-by-day suggestion with reasoning.
4. After a run → coach prompts symptom check, assesses success, tells user exactly what to
   update in `skill/running-state.md`.
5. "How's my bench?" → does NOT read running files (scope check).

---

## Implementation steps (when ready)

- [ ] Create `skill/running.md`
- [ ] Create `skill/running-state.md` (seeded at stage 7, successes 3, last run 2026-08-20)
- [ ] Edit `skill/user-profile.md` — goals, injury history, schedule, location, experience
- [ ] Edit `skill/coaching-rules.md` — gym-legs-before-run, hike, daily-walk notes
- [ ] Edit `CLAUDE.md` — scoped read-list + post-session state-update instruction
- [ ] Add M7 to `plan.md`
