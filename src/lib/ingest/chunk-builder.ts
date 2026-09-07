export type UnstructuredElement = {
  type?: string;
  text?: string;
  metadata?: {
    page_number?: number;
    text_as_html?: string;
  };
};

export type ChunkDraft = {
  pageStart: number;
  pageEnd: number;
  text: string;
};

// ponytail: 3 pages per chunk is a guess; revisit once extraction quality is measurable
export const PAGES_PER_CHUNK = 3;

function cells(row: string): string[] {
  return [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((m) =>
    m[1].replace(/<[^>]*>/g, "").trim(),
  );
}

export function tableToMarkdown(html: string): string {
  const table = html.match(/<table[\s\S]*?<\/table>/i)?.[0];
  if (!table) return html;
  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => cells(m[1]));
  if (rows.length === 0) return html;
  const width = Math.max(...rows.map((r) => r.length));
  const lines = rows.map((row, i) => {
    const padded = Array.from({ length: width }, (_, j) => row[j] ?? "");
    return `| ${padded.join(" | ")} |`;
  });
  const separator = `| ${Array.from({ length: width }, () => "---").join(" | ")} |`;
  return [lines[0], separator, ...lines.slice(1)].join("\n");
}

function elementText(element: UnstructuredElement): string | null {
  const text = element.text?.trim();
  if (!text) return null;
  if (element.type === "Table" && element.metadata?.text_as_html) {
    return tableToMarkdown(element.metadata.text_as_html);
  }
  return text;
}

export function buildChunks(elements: UnstructuredElement[]): ChunkDraft[] {
  const parts: { page: number; text: string }[] = [];
  let currentPage = 1;
  for (const element of elements) {
    const text = elementText(element);
    if (!text) continue;
    const page = element.metadata?.page_number ?? currentPage;
    currentPage = page;
    parts.push({ page, text });
  }
  parts.sort((a, b) => a.page - b.page);

  const byPage = new Map<number, string[]>();
  for (const { page, text } of parts) {
    const list = byPage.get(page) ?? [];
    list.push(text);
    byPage.set(page, list);
  }

  const pages = [...byPage.keys()].sort((a, b) => a - b);
  const chunks: ChunkDraft[] = [];
  for (const page of pages) {
    const last = chunks[chunks.length - 1];
    if (last && Math.floor((last.pageStart - 1) / PAGES_PER_CHUNK) === Math.floor((page - 1) / PAGES_PER_CHUNK)) {
      last.pageEnd = page;
      last.text = `${last.text}\n\n${byPage.get(page)!.join("\n\n")}`;
    } else {
      chunks.push({ pageStart: page, pageEnd: page, text: byPage.get(page)!.join("\n\n") });
    }
  }
  return chunks;
}
