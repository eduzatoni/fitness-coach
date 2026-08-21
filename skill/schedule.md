# Schedule

> This file is the source of truth for the user's real-life availability and dated training events.
> The coach reads it before planning a week and maintains it on the user's verbal instruction —
> e.g. "add football Monday at 7pm" → coach writes it here. The coach also prunes past-dated events
> as it goes. The user does not need to edit this file manually.

## Fixed recurring constraints

- **Work hours:** ~9:00–17:00, sometimes later. If work runs past ~17:30 the evening gym window is
  gone — treat that day as morning-only or rest/reschedule.
- **German class:** Tuesday + Thursday, 18:20–20:30. No evening gym on those days. A gym session
  only fits if done in the morning or before ~17:30.
- **Running:** Tuesday + Thursday ~07:30. Fixed commitment with one exception: if football happened
  on Wednesday, skip Thursday run and move it to Friday ~07:30 instead.
- **Wednesday football:** recurring optional session — show up sometimes, not committed. Treat as a high legs/fatigue load when planning; don't assume it happens unless confirmed.
- **Weekends:** generally open — no fixed blocks, but football happens on weekends when scheduled.
- **Gym access:** commercial gym, no restrictions on hours.

<!-- Add other fixed blocks here as they come up — e.g. regular evening commitments, travel patterns -->

## Dated events (one-offs)

<!-- The coach adds/updates/removes entries here on your instruction.
     Format: - YYYY-MM-DD (Day) [HH:MM]: Description — load note
     Example: - 2026-08-24 (Mon) 19:00: Football match ~90min — high legs/fatigue -->

- 2026-08-23 (Sun) 10:00: Football match — Grêmio vs FC Vahdat — high legs/fatigue
- 2026-08-24 (Mon) 20:00: Tennis — moderate load
- 2026-08-30 (Sun) 16:20: Football match — Grêmio vs FC Tormotor 07 — high legs/fatigue
- 2026-09-06 (Sun) 12:00: 🏆 Football match (MCup) — Grêmio vs FC Tormotor 07 — high legs/fatigue
- 2026-09-13 (Sat) 16:25: Football match — Grêmio vs Ex Hürlimann — high legs/fatigue
- 2026-09-27 (Sat) 13:10: Football match — Grêmio vs Deportivo La Habaña — high legs/fatigue

## How the coach uses this

1. Read fixed constraints → identify which days have no training window or a restricted window
   (time-of-day aware: German days = no evening gym).
2. Read dated events → overlay one-off load events onto those days.
3. Cross-check Hevy (get_recent_workouts ~7 days) → actual recent fatigue/load.
4. Read running-state.md → next run target.
5. Build Mon–Sun plan: place immovable events first, slot gym (PPL rotation) + runs into open
   windows, honoring spacing rules from coaching-rules.md.
6. Prune any past-dated events from this file as part of planning.
7. If a window collapses later ("work ran long") → re-slot the missed session, update this file if
   a dated event moved.
