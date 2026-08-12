import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RecommendationAction } from "../hevy/types.js";

const projectRoot = fileURLToPath(new URL("../../..", import.meta.url));
const FILE = join(projectRoot, "data", "recommendations.json");

export interface StoredRecommendation {
  date: string;
  exercise: string;
  action: RecommendationAction;
  currentWeight: number | null;
  target: string;
  reason: string;
}

export function loadRecommendations(): StoredRecommendation[] {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as StoredRecommendation[];
  } catch {
    return [];
  }
}

export function saveRecommendation(rec: StoredRecommendation): void {
  const all = loadRecommendations();
  all.push(rec);
  writeFileSync(FILE, JSON.stringify(all, null, 2));
}

export function getRecommendationsForExercise(exercise: string): StoredRecommendation[] {
  const all = loadRecommendations();
  const normalized = exercise.toLowerCase();
  return all.filter((r) => r.exercise.toLowerCase().includes(normalized));
}
