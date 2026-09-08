export type ParsedPage = {
  page: number;
  text: string;
};

export type ChunkDraft = {
  pageStart: number;
  pageEnd: number;
  text: string;
};

// ponytail: 10 pages per chunk trades extraction pinning (wider page clamp) for fewer LLM calls; revisit once extraction quality is measurable
export const PAGES_PER_CHUNK = 10;

export function buildChunks(pages: ParsedPage[]): ChunkDraft[] {
  const chunks: ChunkDraft[] = [];
  const sorted = [...pages].sort((a, b) => a.page - b.page);
  for (const { page, text } of sorted) {
    if (!text.trim()) continue;
    const last = chunks[chunks.length - 1];
    if (
      last &&
      Math.floor((last.pageStart - 1) / PAGES_PER_CHUNK) ===
        Math.floor((page - 1) / PAGES_PER_CHUNK)
    ) {
      last.pageEnd = page;
      last.text = `${last.text}\n\n${text}`;
    } else {
      chunks.push({ pageStart: page, pageEnd: page, text });
    }
  }
  return chunks;
}
