import { eq } from "drizzle-orm";
import { afterAll, describe, expect, test, vi } from "vitest";
import { db } from "../db";
import { chunks, documents, facts } from "../db/schema";
import type { ExtractedFact } from "../llm";
import type { ParsedPage } from "./chunk-builder";
import { ingestDocument } from "./ingest";

const createdIds: string[] = [];

afterAll(async () => {
  for (const id of createdIds) {
    await db.delete(documents).where(eq(documents.id, id));
  }
});

const PDF_BYTES = Uint8Array.from([0x25, 0x50, 0x44, 0x46]);
const PDF_DATA_URL = `data:application/pdf;base64,${Buffer.from(PDF_BYTES).toString("base64")}`;

async function createDocument(): Promise<string> {
  const [doc] = await db
    .insert(documents)
    .values({
      filename: "report.pdf",
      blobUrl: PDF_DATA_URL,
      status: "uploading",
    })
    .returning();
  createdIds.push(doc.id);
  return doc.id;
}

function mkPage(n: number, text: string): ParsedPage {
  return { page: n, text };
}

function fact(overrides: Partial<ExtractedFact> = {}): ExtractedFact {
  return {
    entity: "Acme Corp",
    attribute: "FY24 revenue",
    value: "₹8,032 crore",
    qualifiers: { time: "FY24", scope: "consolidated", location: null },
    evidenceQuote: "revenue of ₹8,032 crore in FY24",
    pageNumber: 1,
    confidence: 0.9,
    ...overrides,
  };
}

function vectorOf(signal: number): number[] {
  return Array.from({ length: 1536 }, (_, i) => ((i + signal) % 7) / 7);
}

const embedStub = async (values: string[]) =>
  values.map((_, i) => vectorOf(i + 1));

describe("ingestDocument seam", () => {
  test("stubbed parse output produces expected Chunk rows and page count", async () => {
    const documentId = await createDocument();
    const parse = async () => [
      mkPage(1, "Revenue grew in FY24."),
      mkPage(2, "Margins improved."),
      mkPage(3, "Headcount fell."),
      mkPage(4, "Debt rose."),
    ];
    const extract = vi.fn(async () => [fact()]);
    const embed = vi.fn(embedStub);

    await ingestDocument(documentId, { parse, extract, embed });

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(doc.status).toBe("done");
    expect(doc.pageCount).toBe(4);
    expect(doc.error).toBeNull();

    const stored = await db
      .select()
      .from(chunks)
      .where(eq(chunks.documentId, documentId));
    expect(stored).toHaveLength(2);
    const sorted = stored.sort((a, b) => a.pageStart - b.pageStart);
    expect(sorted[0]).toMatchObject({ pageStart: 1, pageEnd: 3 });
    expect(sorted[0].text).toContain("Revenue grew in FY24.");
    expect(sorted[0].text).toContain("Headcount fell.");
    expect(sorted[1]).toMatchObject({ pageStart: 4, pageEnd: 4 });
  });

  test("failed parse records an error message and marks the document failed", async () => {
    const documentId = await createDocument();
    const parse = async () => {
      throw new Error("parser failed");
    };

    await ingestDocument(documentId, { parse });

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(doc.status).toBe("failed");
    expect(doc.error).toBe("parser failed");
    expect(
      await db.select().from(chunks).where(eq(chunks.documentId, documentId)),
    ).toHaveLength(0);
  });

  test("stubbed extraction stores Facts with evidence, qualifiers, raw value, and vectors", async () => {
    const documentId = await createDocument();
    const parse = async () => [
      mkPage(1, "Revenue of ₹8,032 crore."),
      mkPage(2, "A director resigned."),
    ];
    const extract = vi.fn(async (text: string) => [
      fact({ pageNumber: 1, evidenceQuote: "Revenue of ₹8,032 crore." }),
      ...(text.includes("[page 2]")
        ? [
            fact({
              entity: "Acme Corp",
              attribute: "directorship",
              value: "resigned",
              qualifiers: { time: null, scope: null, location: null },
              evidenceQuote: "A director resigned.",
              pageNumber: 2,
              confidence: 0.6,
            }),
          ]
        : []),
    ]);
    const embed = vi.fn(embedStub);

    await ingestDocument(documentId, { parse, extract, embed });

    expect(embed).toHaveBeenCalledOnce();
    expect(embed.mock.calls[0][0]).toHaveLength(2);
    expect(embed.mock.calls[0][0][0]).toContain("₹8,032 crore");

    const stored = await db
      .select()
      .from(facts)
      .where(eq(facts.documentId, documentId))
      .then((rows) => rows.sort((a, b) => a.pageNumber - b.pageNumber));
    expect(stored).toHaveLength(2);

    expect(stored[0]).toMatchObject({
      entity: "Acme Corp",
      attribute: "FY24 revenue",
      value: "₹8,032 crore",
      qualifiers: { time: "FY24", scope: "consolidated", location: null },
      evidenceQuote: "Revenue of ₹8,032 crore.",
      pageNumber: 1,
      confidence: 0.9,
    });
    expect(stored[1]).toMatchObject({
      attribute: "directorship",
      value: "resigned",
      pageNumber: 2,
    });
    for (const [i, row] of stored.entries()) {
      expect(row.embedding).toHaveLength(1536);
      for (const [j, v] of (row.embedding ?? []).entries()) {
        expect(v).toBeCloseTo(vectorOf(i + 1)[j], 5);
      }
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(doc.status).toBe("done");
  });

  test("extraction failures record an error and leave no Facts behind", async () => {
    const documentId = await createDocument();
    const parse = async () => [mkPage(1, "Some text.")];
    const extract = vi.fn(async () => {
      throw new Error("gateway unreachable");
    });
    const embed = vi.fn(async (values: string[]) =>
      values.map(() => vectorOf(1)),
    );

    await ingestDocument(documentId, { parse, extract, embed });

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(doc.status).toBe("failed");
    expect(doc.error).toBe("gateway unreachable");
    expect(
      await db.select().from(facts).where(eq(facts.documentId, documentId)),
    ).toHaveLength(0);
  });
});
