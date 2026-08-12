import { loadRecommendations, getRecommendationsForExercise } from "../memory/recommendations.js";

export async function getRecommendationsTool(args: {
  exercise?: string;
  limit?: number;
} = {}): Promise<{
  recommendations: Array<{
    date: string;
    exercise: string;
    action: string;
    currentWeight: number | null;
    target: string;
    reason: string;
  }>;
}> {
  const all = args.exercise
    ? getRecommendationsForExercise(args.exercise)
    : loadRecommendations();

  const limit = args.limit ?? 20;
  const recent = all.slice(-limit);

  return { recommendations: recent };
}
