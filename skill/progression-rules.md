# Progression Rules

## Evidence base

Rules are grounded in peer-reviewed and widely-adopted sources:

- **ACSM Position Stand (2009)** — *Progression Models in Resistance Training for Healthy Adults* —
  load increment band (2–10%), rep ranges by goal.
- **NSCA** — *Essentials of Strength Training and Conditioning* — 2-for-2 progression rule.
- **StrongLifts 5×5** — concrete per-category increments (5 lb upper / 10 lb lower).
- **Renaissance Periodization** — volume landmarks (MV/MEV/MAV/MRV), deload ~10% guidance.
- **Epley (1985)** — e1RM formula; reliable only for reps ≤ ~12.

## Double progression — the primary model

Work within a target rep range (e.g. 3×8–12). Add reps over sessions until all sets hit the top of
the range **twice in a row** (2-for-2 rule), then add weight.

### 2-for-2 rule (NSCA)

A single strong session isn't enough to justify adding load — it might be a good day. The athlete
must hit the top of the range on **all sets for two consecutive sessions** at the same weight before
weight is increased. A single top session returns `MAINTAIN` with a note to confirm next session.

### Worked example (3×8–12, upper compound → +2.5 kg)

| Session | Weight | Reps       | Action                         |
|---------|--------|------------|-------------------------------|
| 1       | 80 kg  | 8/8/8      | `INCREASE_REPS` (climbing)     |
| 2       | 80 kg  | 10/9/9     | `INCREASE_REPS`                |
| 3       | 80 kg  | 11/10/10   | `INCREASE_REPS`                |
| 4       | 80 kg  | 12/12/12   | `MAINTAIN` — topped once, confirm next |
| 5       | 80 kg  | 12/12/12   | `INCREASE_WEIGHT` → 82.5 kg   |
| 6       | 82.5 kg| 9/8/8      | `MAINTAIN` (post-bump, normal) |
| 7       | 82.5 kg| 10/9/9     | `INCREASE_REPS`                |
| 8       | 82.5 kg| 12/12/11   | `INCREASE_REPS`                |
| 9       | 82.5 kg| 12/12/12   | `MAINTAIN` — topped once, confirm |
| 10      | 82.5 kg| 12/12/12   | `INCREASE_WEIGHT` → 85 kg      |

A rep drop right after a weight increase is **expected and normal**. Do not classify it as
regression or a bad session (`isPostBumpAdjustment` is detected; action stays `MAINTAIN`).

## Load increments by movement class (ACSM 2–10% band)

| Movement class | Nominal increment | Plate step | Examples |
|---|---|---|---|
| Large compound | +5 kg | 2.5 kg | Squat, deadlift, leg press, hip thrust, RDL |
| Upper compound | +2.5 kg | 2.5 kg | Bench, OHP, row, lat pulldown, pull-up |
| Isolation | +2.5 kg (clamped) | 0.5 kg | Curl, extension, lateral raise, fly, calf raise |

Increment is clamped to 2–10% of the current working weight. If rounding would return the same
weight (e.g. very light loads), one plate step is added to guarantee forward progress. The increment
class is inferred from the exercise's `MovementPattern` (derived from title + primary muscle group).

## Rep range by exercise role

| Role | Range | Notes |
|---|---|---|
| All compounds (squat/hinge/push/pull) + isolation | **8–12** | Best-supported hypertrophy range for goal "build strength and muscle" |
| Core / abdominals / calves | **12–20** | High-rep-biased muscles respond better to higher volume |
| Strength (opt-in) | **3–5** | Pass `goal: "strength"` or explicit `repRange` to the tool |

The `analyze_exercise` tool auto-assigns the range based on the exercise's movement pattern and
primary muscle group. An explicit `repRange` or `goal` argument always overrides.

## Plateau detection and escalation

A plateau requires **multiple properly-spaced sessions** with flat metrics — not one or two bad days.

Conditions for a plateau classification (`detectPlateau`):
- At least **4 sessions separated by ≥3 days each** in the window.
- e1RM, weight, and total reps all flat within **2%** across those sessions.

### Deload-first ladder (RP / StrongLifts)

1. **First plateau** → `REDUCE_WEIGHT` by ~10% and re-progress. Do not jump to exercise replacement.
2. **Plateau persists after a deload** → `CONSIDER_REPLACEMENT` (rep-range change or exercise variation).

### Not a plateau

- One bad session: reps dropped once.
- Two sessions at the same weight (could still be building into the weight).
- A rep drop right after a weight increase.
- Sessions too close together (back-to-back days, deload week).
- A return from a break (first session back is always below baseline — handled separately).

## Recommendation actions

The analysis engine assigns one of these. Use them to reason; explain results naturally.

| Action | Engine condition | Meaning |
|---|---|---|
| `INCREASE_WEIGHT` | Hit top of range × 2 consecutive sessions (2-for-2) | Ready to go up — target is the computed next load |
| `INCREASE_REPS` | Reps climbing within range, not plateaued | Hold weight; add reps before increasing load |
| `MAINTAIN` | Topped range once (awaiting confirmation), or recently increased weight | Stay the course |
| `MONITOR` | Reps dipped below range, weight same, not plateaued | One bad session — watch next session before acting |
| `REDUCE_WEIGHT` | Plateau (deload), regressing e1RM, >40% within-session rep drop-off, or return from >21-day layoff | Target is the computed reduced load |
| `ADD_SET` | (reserved — not yet emitted) | Volume insufficient for goal |
| `REMOVE_SET` | (reserved — not yet emitted) | Accumulated fatigue, trim volume |
| `CONSIDER_REPLACEMENT` | Plateau persists after a prior deload | Try a rep-range change or exercise variation |
| `CONSIDER_ROUTINE_CHANGE` | (reserved) | Structural routine issue |
| `INSUFFICIENT_DATA` | Fewer than 2 sessions | Not enough history |

## REDUCE_WEIGHT triggers

Weight reduction is recommended when **any** of these conditions hold:

1. **Plateau (first time)** — flat e1RM + weight + reps across ≥4 spaced sessions → deload ~10%.
2. **Regressing e1RM** — downward trend across sessions, **only when reps ≤ ~12** (Epley is
   unreliable above ~12 reps; at higher rep ranges, reps/volume trend is used instead).
3. **Within-session rep drop-off >40%** — e.g. sets of 12, 10, 6 = 50% drop → fatigue signature;
   the load exceeds what can be maintained across sets.
4. **Return from layoff (>21 days)** — start ~10% lower to reintroduce load safely.

## e1RM (Epley formula)

```
e1RM = weight × (1 + reps / 30)
```

Used for trend analysis (one e1RM number per session, best set). Warmup sets excluded.

**Reliability caveat:** Epley diverges meaningfully from Brzycki and real measured 1RMs above ~12 reps.
The engine only uses e1RM to trigger `REDUCE_WEIGHT` or judge trend when `maxRepsInSession ≤ 12`. For
higher-rep work (core, calves, endurance sets), the engine judges progress by reps and volume instead.

## Imported routine progression schemes

When a routine is imported from thefitness.wiki, the page's progression rules (AMRAP, deload
percentages, weekly increments) are stored in the routine's `notes` field. Read those notes back when
advising on that routine. For example, the r/Fitness Basic Beginner Routine specifies +2.5 lb upper /
+5 lb lower each session, with a 10% deload on failure — apply those rules rather than the default
double-progression model.
