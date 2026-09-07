# 02: Upload → parse → chunks

**What to build:** A user uploads a PDF in the Documents view: the file is stored in Vercel Blob, a Document row is created, and an Inngest ingest function parses it via the Unstructured API. The pure Chunk builder groups Unstructured elements into page-grouped Chunks (small batch of pages per Chunk, tables converted to markdown) and is unit-tested directly. The Documents view lists Documents with status badges and page counts, polling while processing, and shows a recorded error when ingestion fails.

**Blocked by:** 01 (Foundations — schema + test seam).

**Status:** ready-for-agent

- [ ] Uploading a PDF stores it in Blob and creates a Document row
- [ ] Ingest parses the PDF via Unstructured and stores page-grouped Chunks, tables preserved as markdown
- [ ] Chunk builder has direct unit tests (page grouping, table markdown, empty/odd input)
- [ ] Document list shows upload/parse status (with error message on failure) and page count, updating via polling
- [ ] Seam test: stubbed parse output produces expected Chunk rows in the database
- [ ] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)
