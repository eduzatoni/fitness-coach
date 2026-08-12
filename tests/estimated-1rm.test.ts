import { describe, it, expect } from "vitest";
import { epley1RM, best1RM, workingSets } from "../src/analysis/estimated-1rm.js";
import type { HevySet } from "../src/hevy/types.js";

describe("epley1RM", () => {
  it("returns weight directly for 1 rep", () => {
    expect(epley1RM(100, 1)).toBe(100);
  });

  it("calculates correctly for multiple reps", () => {
    // 80kg × (1 + 10/30) = 80 × 1.333... ≈ 106.7
    expect(epley1RM(80, 10)).toBeCloseTo(106.67, 1);
  });
});

describe("workingSets", () => {
  const sets: HevySet[] = [
    { index: 0, type: "warmup", weight_kg: 40, reps: 10, distance_meters: null, duration_seconds: null, rpe: null },
    { index: 1, type: "normal", weight_kg: 80, reps: 10, distance_meters: null, duration_seconds: null, rpe: null },
    { index: 2, type: "normal", weight_kg: 80, reps: 9, distance_meters: null, duration_seconds: null, rpe: null },
    { index: 3, type: "normal", weight_kg: 80, reps: 8, distance_meters: null, duration_seconds: null, rpe: null },
    { index: 4, type: "normal", weight_kg: 0, reps: 0, distance_meters: null, duration_seconds: null, rpe: null },
  ];

  it("excludes warmup sets", () => {
    const ws = workingSets(sets);
    expect(ws.every((s) => s.type !== "warmup")).toBe(true);
  });

  it("excludes zero-rep sets", () => {
    const ws = workingSets(sets);
    expect(ws.every((s) => s.reps > 0)).toBe(true);
  });

  it("returns 3 working sets", () => {
    expect(workingSets(sets)).toHaveLength(3);
  });

  it("best1RM uses top set", () => {
    const ws = workingSets(sets);
    const b = best1RM(ws);
    expect(b).not.toBeNull();
    expect(b!).toBeCloseTo(epley1RM(80, 10), 1);
  });
});
