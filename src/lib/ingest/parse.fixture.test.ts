import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";
import { parsePdf } from "./parse";

const FIXTURE =
  ".data/delhivery/03-delhivery-q4-fy24-earnings-presentation.pdf";

describe("parsePdf against a real PDF", () => {
  const available = existsSync(FIXTURE);

  test.skipIf(!available)(
    "yields consecutive 1-indexed pages with markdown text",
    async () => {
      const bytes = new Uint8Array(await readFile(FIXTURE));
      const pages = await parsePdf(bytes);

      expect(pages.length).toBeGreaterThan(0);
      expect(pages.map((p) => p.page)).toEqual(
        Array.from({ length: pages.length }, (_, i) => i + 1),
      );
      expect(pages.some((p) => p.text.trim().length > 0)).toBe(true);
    },
  );
});
