---
name: feedback_weight_increase_reset_reps
description: When increasing weight in a routine target, always drop reps to the bottom of the rep range
metadata:
  type: feedback
---

When applying a weight increase via `change_target`, always reset the rep target to the bottom of the rep range (e.g. 8 for an 8–12 range). Do not carry the old rep count forward.

**Why:** The user explicitly called this out — bumping weight without dropping reps sets an unrealistic target for the first session at the new load.

**How to apply:** Any time `change_target` is called with a higher `weight_kg`, set `reps` to 8 (or the bottom of the applicable range). Exception: negligible increments (≤1.5 kg isolation) may stay at current reps at coach discretion.
