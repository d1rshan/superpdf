// ponytail: thresholds are constants, not env — tune in code if retrieval quality demands it
export const MAX_COSINE_DISTANCE = 0.3;
export const BATCH_SIZE = 10;

export type CandidatePair = {
  factAId: string;
  factBId: string;
  distance: number;
};

export function buildComparisonBatches(
  candidates: CandidatePair[],
): CandidatePair[][] {
  const best = new Map<string, CandidatePair>();
  for (const { factAId, factBId, distance } of candidates) {
    if (factAId === factBId) continue;
    if (distance > MAX_COSINE_DISTANCE) continue;
    const [a, b] = factAId < factBId ? [factAId, factBId] : [factBId, factAId];
    const key = `${a}:${b}`;
    const existing = best.get(key);
    if (!existing || distance < existing.distance) {
      best.set(key, { factAId: a, factBId: b, distance });
    }
  }
  const pairs = [...best.values()].sort((x, y) => x.distance - y.distance);
  const batches: CandidatePair[][] = [];
  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    batches.push(pairs.slice(i, i + BATCH_SIZE));
  }
  return batches;
}
