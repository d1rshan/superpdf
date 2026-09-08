import { and, cosineDistance, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db } from "../db";
import { factRelationships, facts, topicDocuments, topics } from "../db/schema";
import { type ComparisonFact, compareFactPairs } from "../llm";
import { buildComparisonBatches, type CandidatePair } from "./batching";

export type StoredFact = typeof facts.$inferSelect;

type Verdict = { type: string; explanation: string; confidence: number };
type CompareFn = (
  pairs: { a: ComparisonFact; b: ComparisonFact }[],
) => Promise<Verdict[]>;
type RetrieveFn = (topicFacts: StoredFact[]) => Promise<CandidatePair[]>;

// ponytail: top-k per fact, raise if recall is visibly poor
const TOP_K = 5;
// ponytail: bounded pool, cap 5 — matches ingest extraction concurrency
const RETRIEVAL_CONCURRENCY = 5;

async function retrieveCandidates(
  topicFacts: StoredFact[],
): Promise<CandidatePair[]> {
  const docIds = [...new Set(topicFacts.map((f) => f.documentId))];
  const withEmbedding = topicFacts.filter((f) => f.embedding != null);
  const results: CandidatePair[][] = new Array(withEmbedding.length);
  let next = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(RETRIEVAL_CONCURRENCY, withEmbedding.length) },
      async () => {
        while (next < withEmbedding.length) {
          const i = next++;
          const fact = withEmbedding[i];
          const embedding = fact.embedding;
          if (!embedding) continue;
          const rows = await db
            .select({
              candidateId: facts.id,
              distance: cosineDistance(facts.embedding, embedding),
            })
            .from(facts)
            .where(
              and(
                inArray(facts.documentId, docIds),
                ne(facts.id, fact.id),
                isNotNull(facts.embedding),
              ),
            )
            .orderBy(cosineDistance(facts.embedding, embedding))
            .limit(TOP_K);
          results[i] = rows.map((row) => ({
            factAId: fact.id,
            factBId: row.candidateId,
            distance: Number(row.distance ?? 1),
          }));
        }
      },
    ),
  );
  return results.flat();
}

function toComparisonFact(fact: StoredFact): ComparisonFact {
  return {
    entity: fact.entity,
    attribute: fact.attribute,
    value: fact.value,
    qualifiers: fact.qualifiers,
    evidenceQuote: fact.evidenceQuote,
    pageNumber: fact.pageNumber,
  };
}

export async function resolveTopic(
  topicId: string,
  deps: { retrieve?: RetrieveFn; compare?: CompareFn } = {},
): Promise<void> {
  const [topic] = await db.select().from(topics).where(eq(topics.id, topicId));
  if (!topic) return;

  try {
    await db
      .update(topics)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(topics.id, topicId));

    // Regenerate: discard this Topic's Relationships before recomputing
    await db
      .delete(factRelationships)
      .where(eq(factRelationships.topicId, topicId));

    const docRows = await db
      .select({ documentId: topicDocuments.documentId })
      .from(topicDocuments)
      .where(eq(topicDocuments.topicId, topicId));
    const docIds = docRows.map((r) => r.documentId);
    const topicFacts =
      docIds.length > 0
        ? await db.select().from(facts).where(inArray(facts.documentId, docIds))
        : [];

    const retrieve = deps.retrieve ?? retrieveCandidates;
    const candidates = await retrieve(topicFacts);
    const batches = buildComparisonBatches(candidates);
    const compare =
      deps.compare ?? ((pairs) => compareFactPairs(pairs, topicId));

    const factById = new Map(topicFacts.map((f) => [f.id, f] as const));
    const rows: {
      factAId: string;
      factBId: string;
      type: "SAME_FACT" | "CONTRADICTS" | "CONTEXTUALIZES";
      explanation: string;
      confidence: number;
    }[] = [];
    for (const batch of batches) {
      const verdicts = await compare(
        batch.map((p) => {
          const a = factById.get(p.factAId);
          const b = factById.get(p.factBId);
          if (!a || !b) throw new Error("Candidate fact missing from topic");
          return { a: toComparisonFact(a), b: toComparisonFact(b) };
        }),
      );
      verdicts.forEach((verdict, i) => {
        if (verdict.type === "UNRELATED") return;
        rows.push({
          factAId: batch[i].factAId,
          factBId: batch[i].factBId,
          type: verdict.type as "SAME_FACT" | "CONTRADICTS" | "CONTEXTUALIZES",
          explanation: verdict.explanation,
          confidence: verdict.confidence,
        });
      });
    }

    if (rows.length > 0) {
      await db
        .insert(factRelationships)
        .values(rows.map((row) => ({ topicId, ...row })));
    }

    await db
      .update(topics)
      .set({ status: "done", updatedAt: new Date() })
      .where(eq(topics.id, topicId));
    console.log(
      `[resolve ${topicId}] done: ${rows.length} relationships from ${topicFacts.length} facts`,
    );
  } catch (err) {
    console.error(
      `[resolve ${topicId}] failed:`,
      err instanceof Error ? err.message : err,
    );
    await db
      .update(topics)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(topics.id, topicId));
  }
}
