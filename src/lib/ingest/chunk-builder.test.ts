import { describe, expect, test } from "vitest";
import { buildChunks, PAGES_PER_CHUNK, type ParsedPage } from "./chunk-builder";

function mkPage(n: number, text: string): ParsedPage {
  return { page: n, text };
}

describe("buildChunks", () => {
  test("empty input yields no chunks", () => {
    expect(buildChunks([])).toEqual([]);
  });

  test("blank pages are skipped", () => {
    expect(buildChunks([mkPage(1, ""), mkPage(2, "  ")])).toEqual([]);
  });

  test("single page becomes one chunk", () => {
    expect(buildChunks([mkPage(1, "Revenue grew.")])).toEqual([
      { pageStart: 1, pageEnd: 1, text: "Revenue grew." },
    ]);
  });

  test("pages are grouped in batches of PAGES_PER_CHUNK", () => {
    const count = PAGES_PER_CHUNK + 2;
    const pages = Array.from({ length: count }, (_, i) =>
      mkPage(i + 1, `page ${i + 1}`),
    );
    const chunks = buildChunks(pages);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({ pageStart: 1, pageEnd: PAGES_PER_CHUNK });
    expect(chunks[0].text).toContain("page 1");
    expect(chunks[0].text).toContain(`page ${PAGES_PER_CHUNK}`);
    expect(chunks[0].text).not.toContain(`page ${PAGES_PER_CHUNK + 1}`);
    expect(chunks[1]).toMatchObject({
      pageStart: PAGES_PER_CHUNK + 1,
      pageEnd: count,
    });
  });

  test("a blank page inside a group does not split the chunk", () => {
    const chunks = buildChunks([
      mkPage(1, "one"),
      mkPage(2, ""),
      mkPage(3, "three"),
    ]);
    expect(chunks).toEqual([
      { pageStart: 1, pageEnd: 3, text: "one\n\nthree" },
    ]);
  });

  test("unsorted pages still produce ordered chunks", () => {
    const chunks = buildChunks([
      mkPage(PAGES_PER_CHUNK + 1, "later"),
      mkPage(1, "earlier"),
    ]);
    expect(chunks.map((c) => [c.pageStart, c.pageEnd])).toEqual([
      [1, 1],
      [PAGES_PER_CHUNK + 1, PAGES_PER_CHUNK + 1],
    ]);
  });
});
