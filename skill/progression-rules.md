# Progression Rules

## Double progression

The primary progression model. Works with a target rep range (e.g. 3×8–12).

1. Start at the bottom of the rep range or below
2. Add reps over sessions until all sets hit the top of the range
3. Increase weight (typically 2.5kg for upper body, 5kg for lower body)
4. Reps drop — work back up to the top of the range again

### Worked example (3×8–12)

| Session | Weight | Reps       | Action         |
|---------|--------|------------|----------------|
| 1       | 80kg   | 10/10/9    | maintain       |
| 2       | 80kg   | 11/10/10   | maintain       |
| 3       | 80kg   | 12/12/12   | **increase**   |
| 4       | 82.5kg | 9/8/8      | maintain ← not regression |
| 5       | 82.5kg | 10/9/9     | maintain       |
| 6       | 82.5kg | 11/11/10   | maintain       |
| 7       | 82.5kg | 12/12/12   | **increase**   |

A rep drop right after a weight increase is **expected and normal**. Do not classify it as
regression or a bad session.

## Plateau detection

A plateau requires **multiple properly spaced sessions** with flat metrics — not one or two.

Conditions that must be true for a plateau classification:
- At least 4 sessions separated by at least 3 days each
- e1RM has not meaningfully improved from first to last session in the window
- Weight and total reps have not changed

### Not a plateau

- One bad session: reps dropped once
- Two sessions at the same weight (could be the user is still building into the weight)
- A rep drop right after increasing weight
- Sessions that are too close together (back-to-back days, deload week)
- A return from a break (first session back is always below baseline)

### Plateau example

```
65kg × 10/10/10
65kg × 10/10/10
65kg × 10/9/10
65kg × 10/10/9
65kg × 10/10/10
```

Five sessions, each properly spaced, with no net e1RM gain → plateau.

### Not a plateau example

```
80kg × 10/10/9
80kg × 9/9/8
```

Two sessions, reps dropped once. This is noise, not a trend.

## Recommendation categories

The analysis engine assigns one of these. Use them to reason; explain results naturally.

| Action               | Meaning |
|----------------------|---------|
| `INCREASE_WEIGHT`    | All sets hit the top of the rep range — ready to go up |
| `INCREASE_REPS`      | Weight is solid; focus on adding reps before increasing weight |
| `MAINTAIN`           | Still progressing or recently increased weight — stay the course |
| `MONITOR`            | Something is off but not enough data to act — watch next session |
| `REDUCE_WEIGHT`      | Performance has dropped significantly — deload or reduce |
| `ADD_SET`            | Volume appears insufficient for the goal |
| `REMOVE_SET`         | Possible accumulated fatigue; trimming volume might help |
| `CONSIDER_REPLACEMENT` | Long-term plateau with no improvement — try a variation |
| `CONSIDER_ROUTINE_CHANGE` | Structural issue with the routine as a whole |
| `INSUFFICIENT_DATA`  | Not enough sessions to make a meaningful recommendation |

## Imported routine progression schemes

When a routine is imported from thefitness.wiki, the page's progression rules (AMRAP, deload
percentages, weekly increments) are stored in the routine's `notes` field — Hevy doesn't model
progression natively. Read those notes back when advising on that routine. For example, the
r/Fitness Basic Beginner Routine specifies +2.5 lb upper / +5 lb lower each session, with a 10%
deload on failure — apply those rules rather than the default double-progression model.

Used internally for trend analysis. Calculated using the Epley formula:

```
e1RM = weight × (1 + reps / 30)
```

Best set (highest e1RM) per session is used for trend calculations.
Warmup sets are excluded from all working-set metrics.
