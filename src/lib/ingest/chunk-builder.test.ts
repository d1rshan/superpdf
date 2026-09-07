import { describe, expect, test } from "vitest";
import { buildChunks, tableToMarkdown, type UnstructuredElement } from "./chunk-builder";

function el(
  text: string,
  pageNumber?: number,
  type = "NarrativeText",
  textAsHtml?: string,
): UnstructuredElement {
  return { type, text, metadata: { page_number: pageNumber, text_as_html: textAsHtml } };
}

describe("buildChunks", () => {
  test("empty input yields no chunks", () => {
    expect(buildChunks([])).toEqual([]);
  });

  test("elements without text are skipped", () => {
    expect(buildChunks([el("", 1), el("  ", 2)])).toEqual([]);
  });

  test("single page of elements becomes one chunk", () => {
    const chunks = buildChunks([el("Revenue grew.", 1), el("Margins improved.", 1)]);
    expect(chunks).toEqual([{ pageStart: 1, pageEnd: 1, text: "Revenue grew.\n\nMargins improved." }]);
  });

  test("pages are grouped in batches of PAGES_PER_CHUNK", () => {
    const elements = [1, 2, 3, 4, 5].map((p) => el(`page ${p}`, p));
    const chunks = buildChunks(elements);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ pageStart: 1, pageEnd: 3 });
    expect(chunks[0].text).toContain("page 1");
    expect(chunks[0].text).toContain("page 3");
    expect(chunks[0].text).not.toContain("page 4");
    expect(chunks[1]).toMatchObject({ pageStart: 4, pageEnd: 5 });
  });

  test("tables are preserved as markdown within the chunk", () => {
    const html = "<table><tr><th>Item</th></tr><tr><td>₹8,032 crore</td></tr></table>";
    const chunks = buildChunks([el("Revenue", 1, "Table", html)]);
    expect(chunks[0].text).toContain("| Item |");
    expect(chunks[0].text).toContain("| ₹8,032 crore |");
  });

  test("table without text_as_html falls back to raw text", () => {
    const chunks = buildChunks([el("plain table text", 1, "Table")]);
    expect(chunks[0].text).toBe("plain table text");
  });

  test("elements missing page_number continue the previous page", () => {
    const chunks = buildChunks([el("first", 2), el("no page"), el("still page 2", 2)]);
    expect(chunks).toEqual([{ pageStart: 2, pageEnd: 2, text: "first\n\nno page\n\nstill page 2" }]);
  });

  test("leading element without page_number is treated as page 1", () => {
    const chunks = buildChunks([el("orphan")]);
    expect(chunks).toEqual([{ pageStart: 1, pageEnd: 1, text: "orphan" }]);
  });

  test("unsorted page numbers still produce ordered chunks", () => {
    const chunks = buildChunks([el("later", 4), el("earlier", 1)]);
    expect(chunks.map((c) => [c.pageStart, c.pageEnd])).toEqual([
      [1, 1],
      [4, 4],
    ]);
  });
});

describe("tableToMarkdown", () => {
  test("converts header and body rows", () => {
    const html = "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>";
    expect(tableToMarkdown(html)).toBe("| A | B |\n| --- | --- |\n| 1 | 2 |");
  });

  test("returns input unchanged when there is no table", () => {
    expect(tableToMarkdown("just text")).toBe("just text");
  });
});
