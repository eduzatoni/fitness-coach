import { describe, it, expect } from "vitest";
import {
  roundToStep,
  movementClassFor,
  repRangeForExercise,
  incrementFor,
  nextWeight,
  reduceWeight,
  INCREMENT_KG,
  PLATE_STEP_KG,
  DELOAD_PCT,
} from "../src/analysis/load-increment.js";

describe("roundToStep", () => {
  it("rounds to the nearest multiple of step", () => {
    expect(roundToStep(82.3, 2.5)).toBe(82.5);
    expect(roundToStep(81.0, 2.5)).toBe(80.0); // closer to 80
    expect(roundToStep(12.3, 0.5)).toBe(12.5);
    expect(roundToStep(12.1, 0.5)).toBe(12.0);
    expect(roundToStep(100, 2.5)).toBe(100);
  });
});

describe("movementClassFor", () => {
  it("maps squat and hinge to large_compound", () => {
    expect(movementClassFor("squat")).toBe("large_compound");
    expect(movementClassFor("hinge")).toBe("large_compound");
  });

  it("maps horizontal/vertical pushes and pulls to upper_compound", () => {
    expect(movementClassFor("horizontal_push")).toBe("upper_compound");
    expect(movementClassFor("vertical_push")).toBe("upper_compound");
    expect(movementClassFor("horizontal_pull")).toBe("upper_compound");
    expect(movementClassFor("vertical_pull")).toBe("upper_compound");
  });

  it("maps isolation to isolation", () => {
    expect(movementClassFor("isolation")).toBe("isolation");
  });

  it("maps carry/core/cardio/unknown and undefined to upper_compound (safe default)", () => {
    expect(movementClassFor("carry")).toBe("upper_compound");
    expect(movementClassFor("core")).toBe("upper_compound");
    expect(movementClassFor("cardio")).toBe("upper_compound");
    expect(movementClassFor("unknown")).toBe("upper_compound");
    expect(movementClassFor(undefined)).toBe("upper_compound");
  });
});

describe("repRangeForExercise", () => {
  it("returns [12,20] for core movement pattern", () => {
    expect(repRangeForExercise("core")).toEqual([12, 20]);
  });

  it("returns [12,20] for abdominals primary muscle", () => {
    expect(repRangeForExercise("unknown", "abdominals")).toEqual([12, 20]);
  });

  it("returns [12,20] for calves primary muscle", () => {
    expect(repRangeForExercise("isolation", "calves")).toEqual([12, 20]);
  });

  it("returns [8,12] for compounds and isolation without high-rep muscle", () => {
    expect(repRangeForExercise("squat")).toEqual([8, 12]);
    expect(repRangeForExercise("hinge")).toEqual([8, 12]);
    expect(repRangeForExercise("horizontal_push")).toEqual([8, 12]);
    expect(repRangeForExercise("isolation", "biceps")).toEqual([8, 12]);
    expect(repRangeForExercise(undefined)).toEqual([8, 12]);
  });
});

describe("incrementFor", () => {
  it("returns the nominal increment for large_compound in the 2–10% band", () => {
    // squat 100kg: nominal 5kg = 5% (in 2–10%) → 5
    expect(incrementFor("large_compound", 100)).toBe(5);
  });

  it("returns the nominal increment for upper_compound in the 2–10% band", () => {
    // bench 80kg: nominal 2.5kg = 3.1% (in 2–10%) → 2.5
    expect(incrementFor("upper_compound", 80)).toBe(2.5);
  });

  it("clamps down when nominal exceeds 10% of current weight (very light lifter)", () => {
    // isolation 5kg: nominal 2.5 = 50% → clamped to 10% = 0.5
    expect(incrementFor("isolation", 5)).toBe(0.5);
  });

  it("clamps up when nominal is less than 2% of current weight (very heavy lifter)", () => {
    // large_compound 300kg: nominal 5 = 1.7% → clamped to 2% = 6
    expect(incrementFor("large_compound", 300)).toBe(6);
  });
});

describe("nextWeight", () => {
  it("adds the correct increment and rounds to plate step (squat 100 → 105)", () => {
    expect(nextWeight(100, "large_compound")).toBe(105);
  });

  it("adds the correct increment and rounds to plate step (bench 80 → 82.5)", () => {
    expect(nextWeight(80, "upper_compound")).toBe(82.5);
  });

  it("handles isolation with 0.5kg step (curl 12 → 13)", () => {
    // 12kg: nominal 2.5, 12*10%=1.2 → clamped to 1.2 → round(12+1.2, 0.5) = round(13.2) = 13.0
    expect(nextWeight(12, "isolation")).toBe(13);
  });

  it("guarantees forward progress — never rounds back to current weight", () => {
    // Edge case: if increment rounds back to current weight, must bump by one step
    // E.g. 2.5kg isolation: 10% = 0.25, round(2.5+0.25, 0.5) = round(2.75) = 3.0 — ok
    // Verify generally: nextWeight > currentWeight
    expect(nextWeight(2.5, "isolation")).toBeGreaterThan(2.5);
    expect(nextWeight(100, "large_compound")).toBeGreaterThan(100);
    expect(nextWeight(80, "upper_compound")).toBeGreaterThan(80);
  });
});

describe("reduceWeight", () => {
  it("reduces by DELOAD_PCT (10%) and rounds to plate step (large 100 → 90)", () => {
    // 100 * 0.9 = 90, round(90, 2.5) = 90
    expect(reduceWeight(100, "large_compound")).toBe(90);
  });

  it("rounds to the appropriate plate step (upper 82.5 → 74.25 → 75.0)", () => {
    // 82.5 * 0.9 = 74.25, round(74.25, 2.5) = 75.0
    expect(reduceWeight(82.5, "upper_compound")).toBe(75);
  });

  it("accepts an explicit percentage override", () => {
    // 100 * 0.85 = 85
    expect(reduceWeight(100, "large_compound", 0.15)).toBe(85);
  });
});
