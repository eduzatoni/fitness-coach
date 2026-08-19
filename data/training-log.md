# Training Log

Non-gym physical activity — football, running, and anything else that loads the legs or creates
fatigue that the gym alone can't see. **Gym sessions are NOT logged here** — they live in Hevy
and the coach reads them from the API.

## How this file works

- **Newest entry first.** Add new lines directly under `## Log`.
- **One line per activity.** Format:
  `- YYYY-MM-DD | TYPE | duration | details | load: legs=<L> fatigue=<L>`
- **TYPE** is one of: `Football`, `Running`, `Other` (cycling, hiking, etc.).
- **load** is the coach's *inferred* leg and systemic-fatigue impact — never tagged by the user.
  Levels: `low`, `moderate`, `high`. Omit a dimension if negligible (e.g. `load: fatigue=low`).
- This is the record of what **actually happened.** Recurring plans (e.g. "football Tue + Thu")
  live in `skill/user-profile.md`, not here.

## Load reference (coach's inference guide)

| Activity                          | legs       | fatigue        |
|-----------------------------------|------------|----------------|
| Football match (~90 min)          | high       | high           |
| Football training (~60 min)       | moderate   | moderate       |
| Easy run (≤6 km, conversational)  | low        | low            |
| Moderate run (6–10 km, steady)    | moderate   | moderate       |
| Long run (≥10 km) or intervals    | high       | high           |
| Cycling / hiking (indirect)       | moderate   | depends        |

## Log

- 2026-08-19 | Running | 35 min | 6 km easy | load: legs=low fatigue=low
- 2026-08-17 | Football | 90 min | 11-a-side match, full game | load: legs=high fatigue=high
- 2026-08-15 | Running | 65 min | 11 km long run, steady | load: legs=high fatigue=high
- 2026-08-13 | Other | 90 min | hiking, moderate terrain | load: legs=moderate fatigue=moderate
