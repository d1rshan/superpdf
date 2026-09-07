import { eq } from "drizzle-orm";
import { db } from "../db";
import { chunks, documents } from "../db/schema";
import { buildChunks, type UnstructuredElement } from "./chunk-builder";
import { parsePdf } from "./parse";

type ParseFn = (
  bytes: Uint8Array,
  filename: string,
) => Promise<UnstructuredElement[]>;

export async function ingestDocument(
  documentId: string,
  deps: { parse?: ParseFn } = {},
): Promise<void> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  if (!doc) return;

  try {
    await db
      .update(documents)
      .set({ status: "parsing", error: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    if (!doc.blobUrl) throw new Error("Document has no stored PDF");
    const response = await fetch(doc.blobUrl);
    if (!response.ok)
      throw new Error(`Failed to download PDF: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());

    const parse = deps.parse ?? parsePdf;
    const drafts = buildChunks(await parse(bytes, doc.filename));

    await db.delete(chunks).where(eq(chunks.documentId, documentId));
    if (drafts.length > 0) {
      await db.insert(chunks).values(drafts.map((d) => ({ documentId, ...d })));
    }

    await db
      .update(documents)
      .set({
        status: "done",
        pageCount: Math.max(0, ...drafts.map((d) => d.pageEnd)),
        error: null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  } catch (err) {
    await db
      .update(documents)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  }
}
