import { eq } from "drizzle-orm";
import { afterAll, expect, test } from "vitest";
import { db } from "./index";
import { chunks, documents, facts } from "./schema";

const createdIds: string[] = [];

afterAll(async () => {
  for (const id of createdIds) {
    await db.delete(documents).where(eq(documents.id, id));
  }
});

test("database round-trips rows including pgvector embeddings", async () => {
  const [doc] = await db
    .insert(documents)
    .values({ filename: "smoke.pdf", status: "done", pageCount: 1 })
    .returning();
  createdIds.push(doc.id);

  const [fact] = await db
    .insert(facts)
    .values({
      documentId: doc.id,
      entity: "Acme Corp",
      attribute: "FY24 revenue",
      value: { text: "₹8,032 crore" },
      qualifiers: { time: "FY24", scope: "consolidated", location: null },
      evidenceQuote: "revenue of ₹8,032 crore in FY24",
      pageNumber: 12,
      confidence: 0.95,
      embedding: Array.from({ length: 1536 }, (_, i) => (i % 7) / 7),
    })
    .returning();

  const [readBack] = await db.select().from(facts).where(eq(facts.id, fact.id));
  expect(readBack.evidenceQuote).toBe("revenue of ₹8,032 crore in FY24");
  expect(readBack.pageNumber).toBe(12);
  expect(readBack.qualifiers).toEqual({
    time: "FY24",
    scope: "consolidated",
    location: null,
  });
  if (readBack.embedding == null) throw new Error("embedding was not stored");
  expect(readBack.embedding).toHaveLength(1536);
  expect(readBack.embedding[5]).toBeCloseTo(5 / 7);

  const [chunk] = await db
    .insert(chunks)
    .values({ documentId: doc.id, pageStart: 1, pageEnd: 3, text: "page text" })
    .returning();
  expect(chunk.documentId).toBe(doc.id);

  await db.delete(documents).where(eq(documents.id, doc.id));
  expect(
    await db.select().from(facts).where(eq(facts.id, fact.id)),
  ).toHaveLength(0);
  expect(
    await db.select().from(chunks).where(eq(chunks.id, chunk.id)),
  ).toHaveLength(0);
});
