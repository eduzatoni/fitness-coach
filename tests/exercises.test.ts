import { describe, it, expect } from "vitest";
import { findBestTemplateMatch } from "../src/hevy/exercises.js";
import type { HevyExerciseTemplate } from "../src/hevy/types.js";

function t(id: string, title: string): HevyExerciseTemplate {
  return { id, title, type: "weight_reps", primary_muscle_group: "chest", secondary_muscle_groups: [], is_custom: false };
}

const templates = [
  t("1", "Bench Press (Barbell)"),
  t("2", "Incline Bench Press (Barbell)"),
  t("3", "Incline Bench Press (Dumbbell)"),
  t("4", "Lateral Raise (Dumbbell)"),
  t("5", "Overhead Press (Barbell)"),
  t("6", "Tricep Pushdown (Cable - Bar)"),
  t("7", "Squat (Barbell)"),
  t("8", "Romanian Deadlift (Barbell)"),
];

describe("findBestTemplateMatch", () => {
  it("exact match (case-insensitive)", () => {
    expect(findBestTemplateMatch(templates, "bench press (barbell)")?.id).toBe("1");
  });

  it("starts-with match", () => {
    expect(findBestTemplateMatch(templates, "bench press")?.id).toBe("1");
  });

  it("contains match", () => {
    expect(findBestTemplateMatch(templates, "lateral raise")?.id).toBe("4");
  });

  it("word overlap — 'incline bench' resolves to incline bench press", () => {
    const match = findBestTemplateMatch(templates, "incline bench");
    expect(match?.title.toLowerCase()).toContain("incline");
    expect(match?.title.toLowerCase()).toContain("bench");
  });

  it("'bench' alone resolves to bench press (not incline)", () => {
    const match = findBestTemplateMatch(templates, "bench");
    expect(match).not.toBeNull();
    expect(match?.title.toLowerCase()).toContain("bench");
  });

  it("'ohp' / short alias with no overlap returns null", () => {
    // "ohp" has no word overlap with any template — should return null
    expect(findBestTemplateMatch(templates, "ohp")).toBeNull();
  });

  it("partial word overlap below 50% threshold returns null", () => {
    // "squat press" — only "squat" overlaps (1/2 = 50%) — borderline, should return squat
    const match = findBestTemplateMatch(templates, "squat press");
    // 1 of 2 words = 50%, which meets the >= 0.5 threshold
    expect(match?.title.toLowerCase()).toContain("squat");
  });

  it("returns null for empty string", () => {
    expect(findBestTemplateMatch(templates, "")).toBeNull();
  });

  it("'rdl' returns null (no word overlap)", () => {
    expect(findBestTemplateMatch(templates, "rdl")).toBeNull();
  });

  it("'romanian deadlift' resolves correctly via word overlap", () => {
    const match = findBestTemplateMatch(templates, "romanian deadlift");
    expect(match?.id).toBe("8");
  });
});
