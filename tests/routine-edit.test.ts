import { describe, it, expect } from "vitest";
import {
  routineToInput,
  applyRoutineEdit,
  summarizeRoutineDiff,
} from "../src/analysis/routine-edit.js";
import type { HevyRoutine } from "../src/hevy/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeRoutine(overrides: Partial<HevyRoutine> = {}): HevyRoutine {
  return {
    id: "r1",
    title: "Push Day",
    notes: null,
    updated_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    exercises: [
      {
        index: 0,
        title: "Bench Press (Barbell)",
        notes: null,
        exercise_template_id: "tpl-bench",
        superset_id: null,
        sets: [
          { index: 0, type: "normal", weight_kg: 80, reps: 10, distance_meters: null, duration_seconds: null },
          { index: 1, type: "normal", weight_kg: 80, reps: 10, distance_meters: null, duration_seconds: null },
          { index: 2, type: "normal", weight_kg: 80, reps: 10, distance_meters: null, duration_seconds: null },
        ],
      },
      {
        index: 1,
        title: "Overhead Press (Barbell)",
        notes: null,
        exercise_template_id: "tpl-ohp",
        superset_id: null,
        sets: [
          { index: 0, type: "normal", weight_kg: 60, reps: 8, distance_meters: null, duration_seconds: null },
          { index: 1, type: "normal", weight_kg: 60, reps: 8, distance_meters: null, duration_seconds: null },
        ],
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// routineToInput
// ---------------------------------------------------------------------------

describe("routineToInput", () => {
  it("strips server-only fields (id, updated_at, created_at)", () => {
    const input = routineToInput(makeRoutine());
    expect(input).not.toHaveProperty("id");
    expect(input).not.toHaveProperty("updated_at");
    expect(input).not.toHaveProperty("created_at");
  });

  it("preserves title, notes, exercises", () => {
    const input = routineToInput(makeRoutine());
    expect(input.title).toBe("Push Day");
    expect(input.exercises).toHaveLength(2);
  });

  it("strips set index and server fields from sets", () => {
    const input = routineToInput(makeRoutine());
    const set = input.exercises[0]!.sets[0]!;
    expect(set).not.toHaveProperty("index");
    expect(set.weight_kg).toBe(80);
    expect(set.reps).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// applyRoutineEdit — add_set
// ---------------------------------------------------------------------------

describe("applyRoutineEdit — add_set", () => {
  it("adds a set to the correct exercise", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "add_set",
      exercise_title: "Bench Press",
      set: { type: "normal", weight_kg: 80, reps: 10 },
    });
    expect(payload.exercises[0]!.sets).toHaveLength(4);
  });

  it("records the change in the diff", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "add_set",
      exercise_title: "Bench Press",
      set: { type: "normal", weight_kg: 80, reps: 10 },
    });
    const ex = diff.exercises[0]!;
    expect(ex.change).toBe("modified");
    expect(ex.setsBefore).toBe(3);
    expect(ex.setsAfter).toBe(4);
  });

  it("throws for unknown exercise", () => {
    expect(() =>
      applyRoutineEdit(makeRoutine(), {
        type: "add_set",
        exercise_title: "Cable Fly",
        set: { type: "normal", weight_kg: 20, reps: 15 },
      })
    ).toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// applyRoutineEdit — remove_set
// ---------------------------------------------------------------------------

describe("applyRoutineEdit — remove_set", () => {
  it("removes the last set by default", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "remove_set",
      exercise_title: "Bench Press",
    });
    expect(payload.exercises[0]!.sets).toHaveLength(2);
  });

  it("removes by index when specified", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "remove_set",
      exercise_title: "Bench Press",
      set_index: 0,
    });
    expect(payload.exercises[0]!.sets).toHaveLength(2);
  });

  it("throws when removing from an exercise with only one set", () => {
    const routine = makeRoutine();
    routine.exercises[1]!.sets = [routine.exercises[1]!.sets[0]!];
    expect(() =>
      applyRoutineEdit(routine, { type: "remove_set", exercise_title: "Overhead Press" })
    ).toThrow(/only.*set|cannot remove/i);
  });

  it("throws for unknown exercise", () => {
    expect(() =>
      applyRoutineEdit(makeRoutine(), { type: "remove_set", exercise_title: "Deadlift" })
    ).toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// applyRoutineEdit — change_target
// ---------------------------------------------------------------------------

describe("applyRoutineEdit — change_target", () => {
  it("updates weight_kg on all working sets", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "change_target",
      exercise_title: "Bench Press",
      weight_kg: 82.5,
    });
    for (const s of payload.exercises[0]!.sets) {
      expect(s.weight_kg).toBe(82.5);
    }
  });

  it("updates reps on all working sets", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "change_target",
      exercise_title: "Bench Press",
      reps: 8,
    });
    for (const s of payload.exercises[0]!.sets) {
      expect(s.reps).toBe(8);
    }
  });

  it("records modified in diff", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "change_target",
      exercise_title: "overhead press", // lowercase contains match
      weight_kg: 62.5,
    });
    expect(diff.exercises[0]!.change).toBe("modified");
  });

  it("throws for unknown exercise", () => {
    expect(() =>
      applyRoutineEdit(makeRoutine(), {
        type: "change_target",
        exercise_title: "Romanian Deadlift", // not in routine
        reps: 12,
      })
    ).toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// applyRoutineEdit — add_exercise
// ---------------------------------------------------------------------------

describe("applyRoutineEdit — add_exercise", () => {
  it("appends a new exercise at the end by default", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-lateral",
      exercise_title: "Lateral Raise (Dumbbell)",
      sets: [{ type: "normal", weight_kg: 12, reps: 15 }],
    });
    expect(payload.exercises).toHaveLength(3);
    expect(payload.exercises[2]!.exercise_template_id).toBe("tpl-lateral");
  });

  it("inserts after a named exercise when after_exercise is provided", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-incline",
      exercise_title: "Incline Bench Press",
      sets: [{ type: "normal", weight_kg: 70, reps: 10 }],
      after_exercise: "bench press",
    });
    expect(payload.exercises[1]!.exercise_template_id).toBe("tpl-incline");
  });

  it("records added in diff", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-lateral",
      exercise_title: "Lateral Raise",
    });
    const added = diff.exercises.find((e) => e.change === "added");
    expect(added).toBeDefined();
    expect(added!.title).toBe("Lateral Raise");
  });

  it("defaults to one empty set if sets not provided", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-fly",
      exercise_title: "Cable Fly",
    });
    expect(payload.exercises[2]!.sets).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// applyRoutineEdit — remove_exercise
// ---------------------------------------------------------------------------

describe("applyRoutineEdit — remove_exercise", () => {
  it("removes the named exercise", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "remove_exercise",
      exercise_title: "Overhead Press",
    });
    expect(payload.exercises).toHaveLength(1);
    expect(payload.exercises[0]!.exercise_template_id).toBe("tpl-bench");
  });

  it("records removed in diff", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "remove_exercise",
      exercise_title: "overhead press",
    });
    const removed = diff.exercises.find((e) => e.change === "removed");
    expect(removed).toBeDefined();
  });

  it("throws for unknown exercise", () => {
    expect(() =>
      applyRoutineEdit(makeRoutine(), { type: "remove_exercise", exercise_title: "Squat" })
    ).toThrow(/not found/i);
  });
});

// ---------------------------------------------------------------------------
// rest_seconds support
// ---------------------------------------------------------------------------

describe("rest_seconds", () => {
  it("add_exercise with rest_seconds sets it on the new exercise payload", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-lateral",
      exercise_title: "Lateral Raise",
      rest_seconds: 90,
    });
    expect(payload.exercises[2]!.rest_seconds).toBe(90);
  });

  it("add_exercise with rest_seconds includes it in the diff summary", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-lateral",
      exercise_title: "Lateral Raise",
      rest_seconds: 90,
    });
    const lines = summarizeRoutineDiff(diff);
    expect(lines[0]).toMatch(/90s rest/i);
  });

  it("change_target with rest_seconds updates the exercise", () => {
    const { payload, diff } = applyRoutineEdit(makeRoutine(), {
      type: "change_target",
      exercise_title: "Bench Press",
      rest_seconds: 120,
    });
    expect(payload.exercises[0]!.rest_seconds).toBe(120);
    expect(diff.exercises[0]!.notes).toMatch(/120s/);
  });

  it("add_exercise without rest_seconds leaves it null", () => {
    const { payload } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-lateral",
      exercise_title: "Lateral Raise",
    });
    expect(payload.exercises[2]!.rest_seconds).toBeNull();
  });
});

describe("summarizeRoutineDiff", () => {
  it("produces human-readable lines for modifications", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "add_set",
      exercise_title: "Bench Press",
      set: { type: "normal", weight_kg: 80, reps: 10 },
    });
    const lines = summarizeRoutineDiff(diff);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toMatch(/bench press/i);
    expect(lines[0]).toMatch(/3.*4|4.*set/i);
  });

  it("produces a line for added exercises", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "add_exercise",
      exercise_template_id: "tpl-lateral",
      exercise_title: "Lateral Raise",
    });
    const lines = summarizeRoutineDiff(diff);
    expect(lines.some((l) => /add|lateral raise/i.test(l))).toBe(true);
  });

  it("produces a line for removed exercises", () => {
    const { diff } = applyRoutineEdit(makeRoutine(), {
      type: "remove_exercise",
      exercise_title: "Overhead Press",
    });
    const lines = summarizeRoutineDiff(diff);
    expect(lines.some((l) => /remov|overhead press/i.test(l))).toBe(true);
  });
});
