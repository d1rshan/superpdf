import { extractPagesMarkdownAsync } from "@firecrawl/pdf-inspector";
import type { ParsedPage } from "./chunk-builder";

// ponytail: no local OCR — scanned pages come back needsOcr with thin text; add pdf-inspector's OCR runtime if scanned PDFs matter
export async function parsePdf(bytes: Uint8Array): Promise<ParsedPage[]> {
  const { pages } = await extractPagesMarkdownAsync(Buffer.from(bytes));
  return pages.map((p) => ({ page: p.page + 1, text: p.markdown }));
}
