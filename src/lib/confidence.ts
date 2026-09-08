// ponytail: flag is derived from confidence, not stored as a column (spec schema has none) — surfaced in results UI
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function isLowConfidence(fact: { confidence: number }): boolean {
  return fact.confidence < LOW_CONFIDENCE_THRESHOLD;
}
