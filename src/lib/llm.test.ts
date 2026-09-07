const LIVE = process.env.LIVE_TESTS === "1";

import { expect, test } from "vitest";
import { embedFacts, extractFacts } from "./llm";

test(
  "live gateway returns structured Facts (skipped without LLM_API_KEY)",
  { skip: !LIVE },
  async () => {
    const facts = await extractFacts(
      `[page 1]\nThe company reported revenue of ₹8,032 crore for FY24. On March 3, a director resigned.`,
      "smoke-test",
    );
    expect(facts.length).toBeGreaterThan(0);
    for (const fact of facts) {
      expect(fact.evidenceQuote.length).toBeGreaterThan(0);
      expect(fact.pageNumber).toBe(1);
      expect(fact.confidence).toBeGreaterThan(0);
    }
    expect(facts.some((f) => f.value.includes("8,032"))).toBe(true);
  },
);

test(
  "live Gemini embeddings return 1536-dim vectors (skipped without GOOGLE_API_KEY)",
  { skip: !LIVE },
  async () => {
    const vectors = await embedFacts([
      "revenue of ₹8,032 crore",
      "a director resigned",
    ]);
    expect(vectors).toHaveLength(2);
    for (const v of vectors) {
      expect(v).toHaveLength(1536);
      expect(v.some((x) => x !== 0)).toBe(true);
    }
  },
);
