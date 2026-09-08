import { eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  factRelationships,
  facts,
  topicDocuments,
  topics,
} from "@/lib/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [topic] = await db.select().from(topics).where(eq(topics.id, id));
  if (!topic) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  const factA = alias(facts, "fact_a");
  const factB = alias(facts, "fact_b");
  const relationships = await db
    .select({
      id: factRelationships.id,
      type: factRelationships.type,
      explanation: factRelationships.explanation,
      confidence: factRelationships.confidence,
      a: {
        id: factA.id,
        entity: factA.entity,
        attribute: factA.attribute,
        value: factA.value,
        qualifiers: factA.qualifiers,
        evidenceQuote: factA.evidenceQuote,
        pageNumber: factA.pageNumber,
        confidence: factA.confidence,
      },
      b: {
        id: factB.id,
        entity: factB.entity,
        attribute: factB.attribute,
        value: factB.value,
        qualifiers: factB.qualifiers,
        evidenceQuote: factB.evidenceQuote,
        pageNumber: factB.pageNumber,
        confidence: factB.confidence,
      },
    })
    .from(factRelationships)
    .innerJoin(factA, eq(factRelationships.factAId, factA.id))
    .innerJoin(factB, eq(factRelationships.factBId, factB.id))
    .where(eq(factRelationships.topicId, id));

  const docRows = await db
    .select({ documentId: topicDocuments.documentId })
    .from(topicDocuments)
    .where(eq(topicDocuments.topicId, id));
  const docIds = docRows.map((r) => r.documentId);
  const allFacts =
    docIds.length > 0
      ? await db
          .select({
            id: facts.id,
            documentId: facts.documentId,
            entity: facts.entity,
            attribute: facts.attribute,
            value: facts.value,
            qualifiers: facts.qualifiers,
            evidenceQuote: facts.evidenceQuote,
            pageNumber: facts.pageNumber,
            confidence: facts.confidence,
          })
          .from(facts)
          .where(inArray(facts.documentId, docIds))
      : [];

  return Response.json({
    status: topic.status,
    relationships,
    facts: allFacts,
  });
}
