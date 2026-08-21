import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  parseSmartgymHistory,
  parseSetLine,
  parseDateLine,
} from "../src/import/smartgym-parse.js";
import {
  sessionToWorkoutInput,
  sessionKey,
} from "../src/import/smartgym-import.js";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = readFileSync(join(here, "fixtures/smartgym-history-slice.txt"), "utf8");

describe("parseSetLine", () => {
  it("parses weight + reps", () => {
    expect(parseSetLine("3 sets, 10 reps, 40kg, 60 sec (rest)")).toEqual({
      sets: 3, reps: 10, weightKg: 40, durationSeconds: null, restSeconds: 60,
    });
  });

  it("parses reps-only (bodyweight)", () => {
    expect(parseSetLine("4 sets, 8 reps, 90 sec (rest)")).toEqual({
      sets: 4, reps: 8, weightKg: null, durationSeconds: null, restSeconds: 90,
    });
  });

  it("parses duration-only", () => {
    expect(parseSetLine("3 sets, 40 sec (duration), 30 sec (rest)")).toEqual({
      sets: 3, reps: null, weightKg: null, durationSeconds: 40, restSeconds: 30,
    });
  });

  it("parses decimal weight", () => {
    expect(parseSetLine("3 sets, 11 reps, 2.5kg, 60 sec (rest)")).toEqual({
      sets: 3, reps: 11, weightKg: 2.5, durationSeconds: null, restSeconds: 60,
    });
  });

  it("parses duration + weight", () => {
    expect(parseSetLine("4 sets, 30 sec (duration), 10kg, 0 sec (rest)")).toEqual({
      sets: 4, reps: null, weightKg: 10, durationSeconds: 30, restSeconds: 0,
    });
  });

  it("returns null for a non set-line", () => {
    expect(parseSetLine("Bench Press")).toBeNull();
    expect(parseSetLine("")).toBeNull();
    expect(parseSetLine("Goal:")).toBeNull();
  });
});

describe("parseDateLine", () => {
  it("parses a day-month-year line to ISO date", () => {
    expect(parseDateLine("12 December 2022")).toEqual({ dateText: "12 December 2022", date: "2022-12-12" });
    expect(parseDateLine("3 January 2023")).toEqual({ dateText: "3 January 2023", date: "2023-01-03" });
    expect(parseDateLine("22 May 2026")).toEqual({ dateText: "22 May 2026", date: "2026-05-22" });
  });

  it("returns null for non-date lines", () => {
    expect(parseDateLine("Almost There 1")).toBeNull();
    expect(parseDateLine("Bench Press")).toBeNull();
  });
});

describe("parseSmartgymHistory", () => {
  const sessions = parseSmartgymHistory(FIXTURE);

  it("extracts every session in the HISTORY block", () => {
    expect(sessions.map((s) => s.date)).toEqual(["2022-12-12", "2022-12-13", "2026-05-22"]);
  });

  it("captures routine name and goal, ignoring the schedule line", () => {
    expect(sessions[0]!.routineName).toBe("Almost There 1");
    expect(sessions[0]!.goal).toBe("Hypertrophy");
    expect(sessions[1]!.goal).toBe("Strength");
  });

  it("parses each exercise's set data", () => {
    const bench = sessions[0]!.exercises.find((e) => e.rawName === "Bench Press");
    expect(bench?.set).toEqual({ sets: 3, reps: 10, weightKg: 40, durationSeconds: null, restSeconds: 60 });
  });

  it("marks bare-name exercises (no set line) with set: null", () => {
    const cross = sessions[2]!.exercises.find((e) => e.rawName === "Cross Arm Stretch");
    expect(cross).toBeDefined();
    expect(cross?.set).toBeNull();
    // 'Walking' in session 2 has a set-line-ish '0 sec (duration)...' with no set count → treated as bare
    const walking = sessions[1]!.exercises.find((e) => e.rawName === "Walking");
    expect(walking?.set).toBeNull();
  });

  it("throws if HISTORY / MEASURES markers are missing", () => {
    expect(() => parseSmartgymHistory("no markers here")).toThrow();
  });
});

describe("sessionToWorkoutInput", () => {
  const sessions = parseSmartgymHistory(FIXTURE);

  it("builds a workout with mapped template ids and expanded sets", () => {
    const { workout, unmapped } = sessionToWorkoutInput(sessions[0]!, {});
    expect(unmapped).toEqual([]);
    expect(workout.title).toBe("Almost There 1");
    expect(workout.description).toBe("Hypertrophy");
    expect(workout.start_time).toBe("2022-12-12T18:00:00.000Z");
    expect(workout.end_time).toBe("2022-12-12T19:00:00.000Z");

    const bench = workout.exercises.find((e) => e.exercise_template_id === "79D0BB3A");
    expect(bench).toBeDefined();
    expect(bench?.sets).toHaveLength(3); // "3 sets" expanded
    expect(bench?.sets[0]).toEqual({ type: "normal", weight_kg: 40, reps: 10 });
  });

  it("maps duration exercises to duration_seconds sets", () => {
    const { workout } = sessionToWorkoutInput(sessions[0]!, {});
    // Plank -> duration
    const plank = workout.exercises.find((e) => e.exercise_template_id === "C6C9B8A0");
    expect(plank?.sets).toHaveLength(3);
    expect(plank?.sets[0]).toEqual({ type: "normal", duration_seconds: 40 });
  });

  it("skips bare-name exercises (no set data)", () => {
    const { workout } = sessionToWorkoutInput(sessions[2]!, {});
    // Cross Arm Stretch is bare → excluded; Ankle Circles + Hip Circle remain
    const titles = workout.exercises.map((e) => e.exercise_template_id);
    expect(titles).toContain("9854a4c8-4027-418c-a1f4-d18387611b79"); // Ankle Circles
    expect(titles).toContain("827872ba-2b55-4230-bc5a-ab8fb769a0ae"); // Hip Circle
    expect(workout.exercises).toHaveLength(2);
  });

  it("honors a custom startHour", () => {
    const { workout } = sessionToWorkoutInput(sessions[0]!, { startHour: 7 });
    expect(workout.start_time).toBe("2022-12-12T07:00:00.000Z");
    expect(workout.end_time).toBe("2022-12-12T08:00:00.000Z");
  });
});

describe("sessionKey", () => {
  const sessions = parseSmartgymHistory(FIXTURE);

  it("is stable and independent of exercise ordering", () => {
    const a = sessions[0]!;
    const reordered = { ...a, exercises: [...a.exercises].reverse() };
    expect(sessionKey(a)).toBe(sessionKey(reordered));
  });

  it("differs across different sessions", () => {
    expect(sessionKey(sessions[0]!)).not.toBe(sessionKey(sessions[1]!));
  });
});
