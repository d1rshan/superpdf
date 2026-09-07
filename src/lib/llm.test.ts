import { expect, test } from "vitest";
import { extractFacts } from "./llm";

test(
  "live gateway returns structured Facts (skipped without LLM_API_KEY)",
  { skip: !process.env.LLM_API_KEY || !process.env.LLM_BASE_URL },
  async () => {
    const facts = await extractFacts(
      `[page 1]\nThe company reported revenue of ₹8,032 crore for FY24. On March 3, a director resigned.`,
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
