import { describe, it, expect } from "vitest";
import { makeSession, ws } from "./fixtures/helpers.js";
import { detectPlateau } from "../src/analysis/plateau.js";

// Dates spaced ~1 week apart
const DATES = [
  "2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22",
  "2026-01-29", "2026-02-05", "2026-02-12",
];

describe("detectPlateau — fixtures", () => {
  it("steady progression: NOT plateaued", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(70, 10), ws(70, 10)]),
      makeSession(DATES[1]!, [ws(72.5, 9), ws(72.5, 9)]),
      makeSession(DATES[2]!, [ws(75, 9), ws(75, 8)]),
      makeSession(DATES[3]!, [ws(77.5, 8), ws(77.5, 8)]),
    ];
    expect(detectPlateau(sessions).isPlateaued).toBe(false);
  });

  it("true plateau: flat load+reps over 4+ spaced sessions", () => {
    const sessions = DATES.slice(0, 5).map((d) =>
      makeSession(d, [ws(65, 10), ws(65, 10), ws(65, 10)])
    );
    expect(detectPlateau(sessions).isPlateaued).toBe(true);
  });

  it("one bad workout: NOT plateaued", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 10)]),
      makeSession(DATES[1]!, [ws(80, 9), ws(80, 9)]),
    ];
    const result = detectPlateau(sessions);
    expect(result.isPlateaued).toBe(false);
  });

  it("two bad sessions: NOT plateaued", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10), ws(80, 10)]),
      makeSession(DATES[1]!, [ws(80, 9), ws(80, 8)]),
      makeSession(DATES[2]!, [ws(80, 9), ws(80, 8)]),
    ];
    expect(detectPlateau(sessions).isPlateaued).toBe(false);
  });

  it("return after break: NOT immediately plateaued", () => {
    // Long gap then one session — insufficient data after filtering
    const sessions = [
      makeSession("2026-01-01", [ws(80, 10), ws(80, 10)]),
      makeSession("2026-03-01", [ws(80, 8), ws(80, 8)]), // 8-week break
    ];
    expect(detectPlateau(sessions).isPlateaued).toBe(false);
  });

  it("irregular frequency sessions still detected as plateau when flat", () => {
    // Irregular spacing but all flat
    const dates = ["2026-01-01", "2026-01-10", "2026-01-25", "2026-02-08", "2026-02-20"];
    const sessions = dates.map((d) =>
      makeSession(d, [ws(65, 10), ws(65, 10), ws(65, 10)])
    );
    expect(detectPlateau(sessions).isPlateaued).toBe(true);
  });

  it("insufficient data (< 4 sessions) returns not plateaued", () => {
    const sessions = [
      makeSession(DATES[0]!, [ws(80, 10)]),
      makeSession(DATES[1]!, [ws(80, 10)]),
    ];
    expect(detectPlateau(sessions).isPlateaued).toBe(false);
  });
});
