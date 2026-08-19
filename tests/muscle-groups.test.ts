import { describe, it, expect } from "vitest";
import { inferMovementPattern, aggregateMuscleVolume, flagVolumeImbalances } from "../src/analysis/muscle-groups.js";
import type { HevyExerciseTemplate } from "../src/hevy/types.js";

function tpl(id: string, title: string, primary: string): HevyExerciseTemplate {
  return { id, title, type: "weight_reps", primary_muscle_group: primary, secondary_muscle_groups: [], is_custom: false };
}

describe("inferMovementPattern", () => {
  it("bench press → horizontal_push", () => {
    expect(inferMovementPattern("Bench Press (Barbell)", "chest")).toBe("horizontal_push");
  });
  it("overhead press → vertical_push", () => {
    expect(inferMovementPattern("Overhead Press (Barbell)", "shoulders")).toBe("vertical_push");
  });
  it("barbell row → horizontal_pull", () => {
    expect(inferMovementPattern("Barbell Row", "back")).toBe("horizontal_pull");
  });
  it("lat pulldown → vertical_pull", () => {
    expect(inferMovementPattern("Lat Pulldown (Cable)", "lats")).toBe("vertical_pull");
  });
  it("squat → squat", () => {
    expect(inferMovementPattern("Squat (Barbell)", "quads")).toBe("squat");
  });
  it("romanian deadlift → hinge", () => {
    expect(inferMovementPattern("Romanian Deadlift (Barbell)", "hamstrings")).toBe("hinge");
  });
  it("bicep curl → isolation", () => {
    expect(inferMovementPattern("Bicep Curl (Dumbbell)", "biceps")).toBe("isolation");
  });
  it("plank → core", () => {
    expect(inferMovementPattern("Plank", "core")).toBe("core");
  });
  it("Running (cardio muscle group) → cardio", () => {
    expect(inferMovementPattern("Running", "cardio")).toBe("cardio");
  });
  it("Cycling (cardio muscle group) → cardio", () => {
    expect(inferMovementPattern("Cycling", "cardio")).toBe("cardio");
  });
});

describe("aggregateMuscleVolume", () => {
  it("sums sets per primary muscle group", () => {
    const exercises = [
      { title: "Bench Press", sets: 3, template: tpl("1", "Bench Press", "chest") },
      { title: "Incline Press", sets: 3, template: tpl("2", "Incline Press", "chest") },
      { title: "Barbell Row", sets: 4, template: tpl("3", "Barbell Row", "back") },
    ];
    const result = aggregateMuscleVolume(exercises, 1);
    const chest = result.find((r) => r.muscleGroup === "chest");
    const back = result.find((r) => r.muscleGroup === "back");
    expect(chest?.weeklySetEstimate).toBe(6);
    expect(back?.weeklySetEstimate).toBe(4);
  });

  it("multiplies by sessionsPerWeek", () => {
    const exercises = [{ title: "Bench Press", sets: 3, template: tpl("1", "Bench Press", "chest") }];
    const result = aggregateMuscleVolume(exercises, 2);
    expect(result[0]?.weeklySetEstimate).toBe(6);
  });

  it("handles missing template (unknown muscle group)", () => {
    const exercises = [{ title: "Mystery Exercise", sets: 3, template: null }];
    const result = aggregateMuscleVolume(exercises);
    expect(result[0]?.muscleGroup).toBe("unknown");
  });
});

describe("flagVolumeImbalances", () => {
  it("flags missing back when chest present", () => {
    const volumes = [{ muscleGroup: "chest", weeklySetEstimate: 12, exercises: [] }];
    const flags = flagVolumeImbalances(volumes);
    expect(flags.some((f) => f.toLowerCase().includes("back"))).toBe(true);
  });

  it("flags push/pull imbalance > 2×", () => {
    const volumes = [
      { muscleGroup: "chest", weeklySetEstimate: 18, exercises: [] },
      { muscleGroup: "back", weeklySetEstimate: 6, exercises: [] },
    ];
    const flags = flagVolumeImbalances(volumes);
    expect(flags.some((f) => f.toLowerCase().includes("push") || f.toLowerCase().includes("pull"))).toBe(true);
  });

  it("no flags for balanced push/pull", () => {
    const volumes = [
      { muscleGroup: "chest", weeklySetEstimate: 12, exercises: [] },
      { muscleGroup: "back", weeklySetEstimate: 12, exercises: [] },
    ];
    const flags = flagVolumeImbalances(volumes);
    expect(flags.every((f) => !f.toLowerCase().includes("push"))).toBe(true);
  });

  it("flags quads without hamstrings", () => {
    const volumes = [{ muscleGroup: "quads", weeklySetEstimate: 12, exercises: [] }];
    const flags = flagVolumeImbalances(volumes);
    expect(flags.some((f) => f.toLowerCase().includes("hamstring"))).toBe(true);
  });
});
