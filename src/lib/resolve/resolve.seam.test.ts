import { eq } from "drizzle-orm";
import { afterAll, describe, expect, test } from "vitest";
import { db } from "../db";
import {
  documents,
  factRelationships,
  facts,
  topicDocuments,
  topics,
} from "../db/schema";
import type { ComparisonFact } from "../llm";
import type { CandidatePair } from "./batching";
import type { StoredFact } from "./resolve";
import { resolveTopic } from "./resolve";

const createdDocumentIds: string[] = [];
const createdTopicIds: string[] = [];

afterAll(async () => {
  for (const id of createdTopicIds) {
    await db.delete(topics).where(eq(topics.id, id));
  }
  for (const id of createdDocumentIds) {
    await db.delete(documents).where(eq(documents.id, id));
  }
});

function vectorOf(signal: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => ((i + signal) % 7) / 7);
}

async function createDocument(filename: string): Promise<string> {
  const [doc] = await db
    .insert(documents)
    .values({ filename, status: "done" })
    .returning();
  createdDocumentIds.push(doc.id);
  return doc.id;
}

type FactSeed = {
  documentId: string;
  entity: string;
  attribute: string;
  value: string;
  qualifiers: {
    time: string | null;
    scope: string | null;
    location: string | null;
  };
  evidenceQuote: string;
  pageNumber: number;
  confidence: number;
  embedding: number[];
};

async function insertFact(seed: FactSeed): Promise<string> {
  const [row] = await db.insert(facts).values(seed).returning({ id: facts.id });
  return row.id;
}

async function createTopic(documentIds: string[]): Promise<string> {
  const [topic] = await db
    .insert(topics)
    .values({ name: "test topic" })
    .returning();
  createdTopicIds.push(topic.id);
  if (documentIds.length > 0) {
    await db
      .insert(topicDocuments)
      .values(
        documentIds.map((documentId) => ({ topicId: topic.id, documentId })),
      );
  }
  return topic.id;
}

describe("resolveTopic seam", () => {
  test("stubbed verdicts produce correctly-typed Relationship rows; UNRELATED is dropped", async () => {
    const docA = await createDocument("a.pdf");
    const docB = await createDocument("b.pdf");
    const seedA: FactSeed = {
      documentId: docA,
      entity: "Acme Corp",
      attribute: "FY24 revenue",
      value: "₹8,032 crore",
      qualifiers: { time: "FY24", scope: "consolidated", location: null },
      evidenceQuote: "revenue of ₹8,032 crore",
      pageNumber: 1,
      confidence: 0.9,
      embedding: vectorOf(1),
    };
    const seedB: FactSeed = {
      documentId: docB,
      entity: "Acme Corp",
      attribute: "revenue",
      value: "₹80.3 billion",
      qualifiers: { time: "FY24", scope: "consolidated", location: null },
      evidenceQuote: "revenue reached ₹80.3 billion",
      pageNumber: 2,
      confidence: 0.8,
      embedding: vectorOf(1),
    };
    const seedC: FactSeed = {
      documentId: docB,
      entity: "Acme Corp",
      attribute: "headcount",
      value: "10,000",
      qualifiers: { time: null, scope: null, location: null },
      evidenceQuote: "we employ 10,000 people",
      pageNumber: 3,
      confidence: 0.7,
      embedding: vectorOf(2),
    };
    const idA = await insertFact(seedA);
    const idB = await insertFact(seedB);
    const idC = await insertFact(seedC);
    const topicId = await createTopic([docA, docB]);

    const retrieve = async (
      topicFacts: StoredFact[],
    ): Promise<CandidatePair[]> =>
      topicFacts.flatMap((f, i) =>
        topicFacts
          .filter((g) => g.id !== f.id)
          .map((g) => ({
            factAId: f.id,
            factBId: g.id,
            distance: 0.1 + i * 0.01,
          })),
      );
    const compare = async (pairs: { a: ComparisonFact; b: ComparisonFact }[]) =>
      pairs.map(({ a, b }) =>
        a.attribute.includes("revenue") && b.attribute.includes("revenue")
          ? {
              type: "SAME_FACT",
              explanation: "same revenue, different units",
              confidence: 0.95,
            }
          : {
              type: "UNRELATED",
              explanation: "different claims",
              confidence: 0.5,
            },
      );

    await resolveTopic(topicId, { retrieve, compare });

    const [topic] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId));
    expect(topic.status).toBe("done");

    const stored = await db
      .select()
      .from(factRelationships)
      .where(eq(factRelationships.topicId, topicId));
    expect(stored).toHaveLength(1);
    const rel = stored[0];
    expect(rel.type).toBe("SAME_FACT");
    expect(rel.explanation).toBe("same revenue, different units");
    expect(rel.confidence).toBeCloseTo(0.95);
    const factIds = new Set([rel.factAId, rel.factBId]);
    expect(factIds).toEqual(new Set([idA, idB]));
    expect(factIds.has(idC)).toBe(false);
  });

  test("regenerate removes prior Relationships before recomputing", async () => {
    const docA = await createDocument("regen-a.pdf");
    const seedA: FactSeed = {
      documentId: docA,
      entity: "Acme",
      attribute: "growth",
      value: "12%",
      qualifiers: { time: "FY24", scope: null, location: null },
      evidenceQuote: "grew 12%",
      pageNumber: 1,
      confidence: 0.9,
      embedding: vectorOf(1),
    };
    const seedB: FactSeed = {
      ...seedA,
      evidenceQuote: "12% growth",
      pageNumber: 2,
      embedding: vectorOf(2),
    };
    const idA = await insertFact(seedA);
    const idB = await insertFact(seedB);
    const topicId = await createTopic([docA]);

    const [old] = await db
      .insert(factRelationships)
      .values({
        topicId,
        factAId: idA,
        factBId: idB,
        type: "CONTRADICTS",
        explanation: "stale verdict",
        confidence: 0.4,
      })
      .returning();

    const retrieve = async (
      topicFacts: StoredFact[],
    ): Promise<CandidatePair[]> =>
      topicFacts.map((f) => ({
        factAId: idA,
        factBId: f.id,
        distance: 0.05,
      }));
    let calls = 0;
    const compare = async () => {
      calls++;
      return [
        { type: "SAME_FACT", explanation: "fresh verdict", confidence: 0.9 },
      ];
    };

    await resolveTopic(topicId, { retrieve, compare });

    const stored = await db
      .select()
      .from(factRelationships)
      .where(eq(factRelationships.topicId, topicId));
    expect(stored).toHaveLength(1);
    expect(stored[0].id).not.toBe(old.id);
    expect(stored[0].explanation).toBe("fresh verdict");
    expect(calls).toBe(1);
  });

  test("default pgvector retrieval respects topic scope and finds the near pair", async () => {
    const docA = await createDocument("vec-a.pdf");
    const docOutside = await createDocument("vec-outside.pdf");
    const seed = (
      documentId: string,
      signal: number,
      quote: string,
    ): FactSeed => ({
      documentId,
      entity: "Acme",
      attribute: "growth",
      value: "12%",
      qualifiers: { time: null, scope: null, location: null },
      evidenceQuote: quote,
      pageNumber: 1,
      confidence: 0.9,
      embedding: vectorOf(signal),
    });
    const idA = await insertFact(seed(docA, 1, "grew 12%"));
    const idB = await insertFact(seed(docA, 1, "grew by 12 percent"));
    const idFar = await insertFact(seed(docA, 6, "unrelated remark"));
    const idOutside = await insertFact(seed(docOutside, 1, "grew 12% too"));
    const topicId = await createTopic([docA]);

    const verdicts: string[] = [];
    await resolveTopic(topicId, {
      compare: async (pairs) => {
        verdicts.push(
          ...pairs.map(({ a, b }) => `${a.evidenceQuote}|${b.evidenceQuote}`),
        );
        return pairs.map(() => ({
          type: "SAME_FACT",
          explanation: "identical metric",
          confidence: 0.9,
        }));
      },
    });

    const stored = await db
      .select()
      .from(factRelationships)
      .where(eq(factRelationships.topicId, topicId));
    // near pair surfaces, the far fact and the out-of-scope fact do not
    expect(stored).toHaveLength(1);
    const rel = stored[0];
    const ids = new Set([rel.factAId, rel.factBId]);
    expect(ids.has(idA)).toBe(true);
    expect(ids.has(idFar)).toBe(false);
    expect(ids.has(idOutside)).toBe(false);
    expect(ids.has(idB) || verdicts.length === 0).toBe(true);
  });

  test("comparison failure marks the topic failed", async () => {
    const docA = await createDocument("fail.pdf");
    const topicId = await createTopic([docA]);
    const seedFail = (pageNumber: number, signal: number): FactSeed => ({
      documentId: docA,
      entity: "Acme",
      attribute: "growth",
      value: "12%",
      qualifiers: { time: null, scope: null, location: null },
      evidenceQuote: "grew 12%",
      pageNumber,
      confidence: 0.9,
      embedding: vectorOf(signal),
    });
    const idA = await insertFact(seedFail(1, 1));
    const idB = await insertFact(seedFail(2, 2));

    await resolveTopic(topicId, {
      retrieve: async () => [{ factAId: idA, factBId: idB, distance: 0.05 }],
      compare: async () => {
        throw new Error("gateway down");
      },
    });

    const [topic] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId));
    expect(topic.status).toBe("failed");
  });

  test("topic with no documents completes with no Relationships", async () => {
    const topicId = await createTopic([]);
    await resolveTopic(topicId);
    const [topic] = await db
      .select()
      .from(topics)
      .where(eq(topics.id, topicId));
    expect(topic.status).toBe("done");
    expect(
      await db
        .select()
        .from(factRelationships)
        .where(eq(factRelationships.topicId, topicId)),
    ).toHaveLength(0);
  });
});
