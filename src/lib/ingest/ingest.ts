import { eq } from "drizzle-orm";
import { db } from "../db";
import { chunks, documents, facts } from "../db/schema";
import { markDocument } from "../documents";
import {
  type ExtractedFact,
  embedFacts,
  extractFacts,
  factEmbeddingText,
} from "../llm";
import { buildChunks, type ParsedPage } from "./chunk-builder";
import { parsePdf } from "./parse";

type ParseFn = (bytes: Uint8Array) => Promise<ParsedPage[]>;
type ExtractFn = (text: string, sessionId: string) => Promise<ExtractedFact[]>;
type EmbedFn = (values: string[]) => Promise<number[][]>;

export async function ingestDocument(
  documentId: string,
  deps: { parse?: ParseFn; extract?: ExtractFn; embed?: EmbedFn } = {},
): Promise<void> {
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId));
  if (!doc) return;

  try {
    await markDocument(documentId, "parsing");

    if (!doc.blobUrl) throw new Error("Document has no stored PDF");
    const response = await fetch(doc.blobUrl);
    if (!response.ok)
      throw new Error(`Failed to download PDF: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());

    const parse = deps.parse ?? parsePdf;
    const parsedPages = await parse(bytes);
    const drafts = buildChunks(parsedPages);
    const pageCount = parsedPages.length;

    await db.delete(chunks).where(eq(chunks.documentId, documentId));
    if (drafts.length > 0) {
      await db.insert(chunks).values(drafts.map((d) => ({ documentId, ...d })));
    }

    await markDocument(documentId, "extracting");
    const extract = deps.extract ?? extractFacts;
    const embed = deps.embed ?? embedFacts;
    const pages = new Map(parsedPages.map((p) => [p.page, p.text] as const));

    const inputs: { pageStart: number; pageEnd: number; text: string }[] = [];
    for (const chunk of drafts) {
      const input = [];
      for (let page = chunk.pageStart; page <= chunk.pageEnd; page++) {
        const text = pages.get(page);
        if (text) input.push(`[page ${page}]\n${text}`);
      }
      if (input.length > 0) {
        inputs.push({
          pageStart: chunk.pageStart,
          pageEnd: chunk.pageEnd,
          text: input.join("\n\n"),
        });
      }
    }

    // ponytail: bounded pool, cap 5 — raise if the gateway tolerates more
    const EXTRACTION_CONCURRENCY = 5;
    const perChunk: ExtractedFact[][] = new Array(inputs.length);
    let next = 0;
    await Promise.all(
      Array.from(
        { length: Math.min(EXTRACTION_CONCURRENCY, inputs.length) },
        async () => {
          while (next < inputs.length) {
            const i = next++;
            const facts = await extract(inputs[i].text, documentId);
            // ponytail: clamp instead of reject — a mis-cited page within the chunk still keeps the fact usable
            perChunk[i] = facts.map((fact) => ({
              ...fact,
              pageNumber: Math.min(
                inputs[i].pageEnd,
                Math.max(inputs[i].pageStart, fact.pageNumber),
              ),
            }));
          }
        },
      ),
    );
    const extracted = perChunk.flat();

    await db.delete(facts).where(eq(facts.documentId, documentId));
    if (extracted.length > 0) {
      const vectors = await embed(extracted.map(factEmbeddingText));
      await db.insert(facts).values(
        extracted.map((fact, i) => ({
          documentId,
          entity: fact.entity,
          attribute: fact.attribute,
          value: fact.value,
          qualifiers: fact.qualifiers,
          evidenceQuote: fact.evidenceQuote,
          pageNumber: fact.pageNumber,
          confidence: fact.confidence,
          embedding: vectors[i],
        })),
      );
    }

    await db
      .update(documents)
      .set({ status: "done", pageCount, error: null, updatedAt: new Date() })
      .where(eq(documents.id, documentId));
  } catch (err) {
    await markDocument(
      documentId,
      "failed",
      err instanceof Error ? err.message : String(err),
    );
  }
}
