export type MatchResult = {
  home: number;
  away: number;
};

export type PredictionResult = {
  home: number;
  away: number;
};

export function scorePrediction(
  prediction: PredictionResult,
  actual: MatchResult,
): number {
  const exact =
    prediction.home === actual.home && prediction.away === actual.away;
  if (exact) return 3;

  const predOutcome = Math.sign(prediction.home - prediction.away);
  const actualOutcome = Math.sign(actual.home - actual.away);
  if (predOutcome === actualOutcome) return 1;

  return 0;
}
