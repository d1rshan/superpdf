import { eq } from "drizzle-orm";
import { afterAll, describe, expect, test } from "vitest";
import { db } from "../db";
import { chunks, documents } from "../db/schema";
import type { UnstructuredElement } from "./chunk-builder";
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

function page(number: number, text: string): UnstructuredElement {
  return { type: "NarrativeText", text, metadata: { page_number: number } };
}

describe("ingestDocument seam", () => {
  test("stubbed parse output produces expected Chunk rows and page count", async () => {
    const documentId = await createDocument();
    const parse = async () => [
      page(1, "Revenue grew in FY24."),
      page(2, "Margins improved."),
      page(3, "Headcount fell."),
      page(4, "Debt rose."),
    ];

    await ingestDocument(documentId, { parse });

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
      throw new Error("unstructured unreachable");
    };

    await ingestDocument(documentId, { parse });

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId));
    expect(doc.status).toBe("failed");
    expect(doc.error).toBe("unstructured unreachable");
    expect(
      await db.select().from(chunks).where(eq(chunks.documentId, documentId)),
    ).toHaveLength(0);
  });
});
