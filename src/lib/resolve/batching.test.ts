import { describe, expect, test } from "vitest";
import {
  BATCH_SIZE,
  buildComparisonBatches,
  type CandidatePair,
  MAX_COSINE_DISTANCE,
} from "./batching";

const pair = (a: string, b: string, distance: number): CandidatePair => ({
  factAId: a,
  factBId: b,
  distance,
});

describe("buildComparisonBatches", () => {
  test("excludes self-pairs", () => {
    const batches = buildComparisonBatches([pair("a", "a", 0)]);
    expect(batches.flat()).toHaveLength(0);
  });

  test("filters pairs beyond the distance threshold", () => {
    const batches = buildComparisonBatches([
      pair("a", "b", MAX_COSINE_DISTANCE),
      pair("c", "d", MAX_COSINE_DISTANCE + 0.001),
    ]);
    expect(batches.flat()).toHaveLength(1);
    expect(batches.flat()[0]).toEqual({
      factAId: "a",
      factBId: "b",
      distance: MAX_COSINE_DISTANCE,
    });
  });

  test("treats (a, b) and (b, a) as the same pair, keeping the nearest", () => {
    const batches = buildComparisonBatches([
      pair("b", "a", 0.2),
      pair("a", "b", 0.1),
    ]);
    expect(batches.flat()).toEqual([
      { factAId: "a", factBId: "b", distance: 0.1 },
    ]);
  });

  test("normalizes pair orientation so factAId < factBId", () => {
    const batches = buildComparisonBatches([pair("z", "a", 0.1)]);
    expect(batches.flat()[0]).toEqual({
      factAId: "a",
      factBId: "z",
      distance: 0.1,
    });
  });

  test("deduplicates repeated pairs", () => {
    const batches = buildComparisonBatches([
      pair("a", "b", 0.1),
      pair("a", "b", 0.1),
      pair("b", "c", 0.2),
    ]);
    expect(batches.flat()).toHaveLength(2);
  });

  test("assembles batches of BATCH_SIZE", () => {
    const candidates: CandidatePair[] = [];
    for (let i = 0; i < BATCH_SIZE * 2 + 3; i++) {
      candidates.push(pair(`f${i}`, `g${i}`, 0.1));
    }
    const batches = buildComparisonBatches(candidates);
    expect(batches).toHaveLength(3);
    expect(batches[0]).toHaveLength(BATCH_SIZE);
    expect(batches[1]).toHaveLength(BATCH_SIZE);
    expect(batches[2]).toHaveLength(3);
  });

  test("sorts pairs nearest-first across the flat sequence", () => {
    const batches = buildComparisonBatches([
      pair("a", "b", 0.3),
      pair("c", "d", 0.05),
      pair("e", "f", 0.15),
    ]);
    const flat = batches.flat();
    expect(flat.map((p) => p.distance)).toEqual([0.05, 0.15, 0.3]);
  });

  test("returns no batches for empty input", () => {
    expect(buildComparisonBatches([])).toEqual([]);
  });
});
