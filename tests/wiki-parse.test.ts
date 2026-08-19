import { describe, it, expect } from "vitest";
import { parseWikiRoutine } from "../src/wiki/parse.js";

const BEGINNER_HTML = `
<html>
<head><title>r/Fitness Basic Beginner Routine - thefitness.wiki</title></head>
<body>
<nav><ul><li>Home</li><li>Routines</li></ul></nav>
<h1>r/Fitness Basic Beginner Routine</h1>
<div class="content">
  <ul>
    <li>3&#215;5+ Barbell Rows</li>
    <li>3&#215;5+ Bench Press</li>
    <li>3&#215;5+ Squats</li>
    <li>3&#215;5+ Chinups (or equivalent)</li>
    <li>3&#215;5+ Overhead Press</li>
    <li>3&#215;5+ Deadlifts</li>
  </ul>
  <ul>
    <li>Add 2.5 lbs to the upper body lifts (Bench, Overhead Press, Row, Chinup) each day.</li>
    <li>Add 5 lbs to the lower body lifts (Squat, Deadlift) each day.</li>
    <li>If you fail to complete at least 15 total reps, deload by subtracting 10%.</li>
  </ul>
</div>
<footer><ul><li>Privacy Policy</li><li>Contact</li></ul></footer>
</body>
</html>
`;

const PLAIN_X_HTML = `
<html><head><title>Test</title></head><body>
<ul>
  <li>3x8 Dumbbell Curl</li>
  <li>3x10 Tricep Pushdown</li>
</ul>
</body></html>
`;

const ENTITY_HTML = `
<html><head><title>Test</title></head><body>
<ul>
  <li>3&#215;5 Farmer&#8217;s Walk</li>
  <li>3&#215;8 Arnold&#8217;s Press</li>
</ul>
</body></html>
`;

const REP_RANGE_HTML = `
<html><head><title>Test</title></head><body>
<ul>
  <li>3&#215;8-12 Dumbbell Curl</li>
  <li>4&#215;6-10 Romanian Deadlift</li>
</ul>
</body></html>
`;

describe("parseWikiRoutine", () => {
  describe("beginner routine", () => {
    const result = parseWikiRoutine(BEGINNER_HTML, "https://thefitness.wiki/routines/beginner/");

    it("strips site suffix from title", () => {
      expect(result.title).toBe("r/Fitness Basic Beginner Routine");
    });

    it("extracts 6 exercises, excluding nav and footer <li>s", () => {
      expect(result.exercises).toHaveLength(6);
    });

    it("parses first exercise correctly (× decoded, + → isAmrap)", () => {
      expect(result.exercises[0]).toEqual({
        rawName: "Barbell Rows",
        sets: 3,
        reps: 5,
        isAmrap: true,
      });
    });

    it("parses Overhead Press as isAmrap", () => {
      const ohp = result.exercises.find((e) => e.rawName === "Overhead Press");
      expect(ohp?.isAmrap).toBe(true);
    });

    it("notes contain progression lines", () => {
      expect(result.notes.some((n) => n.includes("Add 2.5 lbs"))).toBe(true);
    });

    it("notes do not contain nav/footer text", () => {
      expect(result.notes.every((n) => !n.includes("Home") && !n.includes("Privacy"))).toBe(true);
    });
  });

  describe("plain x separator", () => {
    const result = parseWikiRoutine(PLAIN_X_HTML);

    it("parses exercises using plain x", () => {
      expect(result.exercises).toHaveLength(2);
    });

    it("first exercise parsed correctly", () => {
      expect(result.exercises[0]).toEqual({
        rawName: "Dumbbell Curl",
        sets: 3,
        reps: 8,
        isAmrap: false,
      });
    });
  });

  describe("entity decoding in exercise names", () => {
    const result = parseWikiRoutine(ENTITY_HTML);

    it("decodes &#8217; to apostrophe in name", () => {
      expect(result.exercises[0]?.rawName).toBe("Farmer's Walk");
    });

    it("decodes second exercise name", () => {
      expect(result.exercises[1]?.rawName).toBe("Arnold's Press");
    });
  });

  describe("rep ranges", () => {
    const result = parseWikiRoutine(REP_RANGE_HTML);

    it("uses lower bound of rep range", () => {
      expect(result.exercises[0]?.reps).toBe(8);
    });

    it("second exercise lower bound", () => {
      expect(result.exercises[1]?.reps).toBe(6);
    });
  });

  describe("edge cases", () => {
    it("empty HTML returns empty exercises without throwing", () => {
      const result = parseWikiRoutine("");
      expect(result.exercises).toHaveLength(0);
      expect(result.notes).toHaveLength(0);
      expect(result.title).toBeTruthy();
    });

    it("garbage HTML returns empty exercises without throwing", () => {
      const result = parseWikiRoutine("<html><body><p>Nothing here</p></body></html>");
      expect(result.exercises).toHaveLength(0);
    });

    it("title falls back to URL slug when no h1 or title tag", () => {
      const result = parseWikiRoutine(
        "<html><body></body></html>",
        "https://thefitness.wiki/routines/my-cool-routine/"
      );
      expect(result.title).toBe("my cool routine");
    });

    it("title falls back to default when no h1, title, or url", () => {
      const result = parseWikiRoutine("<html><body></body></html>");
      expect(result.title).toBe("Imported Routine");
    });
  });
});
