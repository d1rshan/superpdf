# Fact Knowledge Layer

Status: ready-for-agent

## Problem Statement

Important facts are scattered across PDF documents — stated in different words, supported by different evidence, or contradicted elsewhere. A human reviewing two filings about the same company (or three macroeconomic reports on the same economy) has to manually find every revenue figure, directorship change, and growth estimate, work out whether two differently-worded claims actually agree, and check whether an apparent conflict is real or just a difference in period, scope, or units. There is no single place where the facts live, where their evidence can be inspected, or where agreement and disagreement are surfaced with reasoning attached.

## Solution

A web application with two zones:

**Documents zone** — a place to upload PDFs. Each upload is parsed, split into page-grouped chunks, and mined for Facts (each with a verbatim Evidence quote, page number, and Qualifiers). The document list shows extraction status and how many Facts each Document yielded.

**Topics zone** — a Topic is a named selection of Documents. Generating a Topic compares the Facts of its selected Documents and produces Relationships: Facts that corroborate each other (even when worded differently), Facts that genuinely contradict, and apparent contradictions explained by context (time, scope, or units), each with the system's explanation and confidence. Clicking any Fact opens the Evidence drawer: the verbatim quote, the page number, and a viewer showing that page of the original PDF.

The knowledge layer is scoped per Topic — never across Topics. Regenerating a Topic discards its Relationships and recomputes them.

The system must generalize: no hard-coded facts, filenames, schemas, or document-specific rules. The starter datasets (Delhivery corporate documents; India macroeconomy reports) shape the extraction prompt but are not baked into logic.

## User Stories

1. As a user, I want to upload a PDF by drag-and-drop or file picker, so that I can ingest a new Document without leaving the app.
2. As a user, I want to see the processing status of each Document (uploading, parsing, extracting, done, failed), so that I know what has been ingested and what went wrong.
3. As a user, I want to see the page count and Fact count of each ingested Document, so that I can sanity-check that extraction found meaningful content.
4. As a user, I want a failed ingestion to record an error message, so that I can tell whether parsing, extraction, or upload failed.
5. As a user, I want tables in financial and statistical PDFs to be preserved during parsing, so that Facts embedded in tabular data (revenue, growth rates, macro indicators) are not lost.
6. As a user, I want each Fact to store the verbatim quote it came from and its page number, so that I can verify any claim against the source text.
7. As a user, I want each Fact to carry Qualifiers (time period, scope, location), so that "FY24 revenue" and "Q4 FY24 revenue" are not silently treated as the same claim.
8. As a user, I want qualitative facts (e.g. "a director resigned") extracted with the same rigor as numeric facts, so that corporate-status contradictions are surfaced too.
9. As a user, I want the Fact's value stored exactly as stated in the document (number and unit, e.g. "₹8,032 crore"), so that the original phrasing is never lost to normalization.
10. As a user, I want each Document's raw PDF retained in blob storage, so that I can view original pages from the Evidence drawer.
11. As a user, I want to create a Topic with a name, so that I can group Documents belonging to one subject (e.g. "Delhivery", "India macro").
12. As a user, I want to select which ingested Documents belong to a Topic, so that the knowledge layer only reasons over what I chose.
13. As a user, I want to generate the knowledge for a Topic with one action, so that I get Relationships without manual configuration.
14. As a user, I want to see a Topic's generation status, so that I know when its Relationships are ready.
15. As a user, I want Relationships grouped into three sections — Corroborated, Contradicted, Contextualized — so that the four required reconciliation cases are directly visible.
16. As a user, I want each Relationship to show both Facts side by side with their Qualifiers, so that I can see exactly what was compared.
17. As a user, I want each Relationship to include a one-line explanation of the verdict, so that I understand why two Facts corroborate, contradict, or reconcile.
18. As a user, I want each Relationship to carry a confidence, so that I can weight how much to trust it.
19. As a user, I want corroboration detected across different phrasings and units (e.g. "₹8,032 crore" vs "₹80.3 billion"), so that worded-differently agreement still surfaces (case 1).
20. As a user, I want genuine contradictions flagged (e.g. conflicting director status or revenue figures for the same period), so that disputes are visible (case 2).
21. As a user, I want apparent contradictions reconciled through context — the explanation naming the differing period, scope, or units — so that I don't chase false conflicts (case 3).
22. As a user, I want a flat, searchable list of all Facts in a Topic, so that I can inspect extraction quality and debug failures (case 4).
23. As a user, I want to click any Fact and see its Evidence drawer — quote, page number, and the rendered PDF page — so that I can ground-truth a claim in seconds.
24. As a user, I want the PDF viewer to jump to the cited page, so that I reach the evidence without scrolling.
25. As a user, I want to regenerate a Topic, so that I can recompute its Relationships after improving extraction or adding Documents.
26. As a user, I want regeneration to replace the Topic's previous Relationships, so that the Topic always reflects its latest run.
27. As a user, I want the app to work on PDFs it has never seen, so that I can ingest new documents without rules or schemas changing.
28. As a user, I want a dark near-black + neon green interface with a light-mode toggle, so that reading dense fact lists is comfortable.
29. As a user, I want the pipeline to run in the background with the UI polling status, so that long PDFs don't block or time out the request.
30. As a developer, I want model and provider configuration in environment variables, so that a flaky LLM can be swapped with a one-line change.
31. As a developer, I want candidate Fact pairs pre-filtered by embedding similarity and threshold before LLM comparison, so that comparison cost stays bounded.
32. As a developer, I want LLM comparisons batched (multiple pairs per call), so that large Topics don't issue one request per pair.

## Implementation Decisions

**Stack**: Next.js 16 (App Router) with Bun; TypeScript; Tailwind CSS v4. Deployment target is Vercel. Neon Postgres via Drizzle ORM with pgvector. Inngest for background pipelines (cloud on Vercel, dev server locally). Vercel Blob for raw PDFs. Vitest for tests.

**LLM providers**: All LLM work (extraction, pairwise comparison) uses the opencode Go gateway with `muse-spark-1.3-contributor` (opencode Go gateway, `x-opencode-session` header required) as the default model, configured via environment variables and called with non-streaming structured-output requests (the gateway's muse streaming is unreliable). Any model must be swappable by env change. Embeddings use Google `gemini-embedding-001` truncated to 1536 dimensions to match the pgvector column (swapped by env change; no OpenAI key required).

**Parsing**: `@firecrawl/pdf-inspector` parses uploads locally (Rust engine behind Firecrawl's anydoc, prebuilt native bindings) into per-page Markdown: one string per page with 1-indexed page attribution, tables detected natively and emitted as GitHub-Flavored Markdown. Pages are grouped into page-grouped Chunks (a small batch of pages per Chunk) — the Chunk builder is a pure function. Scanned/image-only pages are flagged `needsOcr` and yield thin text (no local OCR).

**Schema** (six tables, Drizzle + pgvector):

- `documents`: id, filename, blob_url, status, page_count, error, timestamps
- `chunks`: id, document_id, page_start, page_end, text
- `facts`: id, document_id, entity, attribute, value (jsonb), qualifiers (jsonb: time/scope/location), evidence_quote, page_number, confidence, embedding (vector), timestamps
- `topics`: id, name, status, timestamps
- `topic_documents`: topic_id, document_id
- `fact_relationships`: id, topic_id, fact_a_id, fact_b_id, type (`SAME_FACT` | `CONTRADICTS` | `CONTEXTUALIZES`), explanation, confidence, timestamps

Fact `value` is stored raw as stated (number + unit string); no normalized-value column. Unit/period/scope reasoning happens entirely in the comparison LLM, which sees both Facts with all Qualifiers — its verdict explanation is the output shown to users.

**Ingest pipeline** (Inngest function, per upload): parse via pdf-inspector → build Chunks (pure function) → extract Facts per Chunk via LLM structured output (Evidence quote + page number mandatory; qualitative Facts first-class; low-confidence Facts flagged) → embed each Fact → insert. Runs automatically on upload; the Documents list polls status. Extraction happens at ingest, so Topics are a pure resolution step.

**Resolve pipeline** (Inngest function, per Topic run): fetch the Topic's Facts → pgvector top-k candidate retrieval per Fact, similarity-threshold capped, restricted to the Topic's Documents → assemble comparison batches (pure function; self-pairs excluded) → batched LLM pairwise comparison → store Relationships with type, explanation, confidence. Regenerate = delete the Topic's Relationships and rerun. Comparison scope is the Topic's selected Documents only; there is no global or cross-topic resolution.

**API routes**: upload (accepts PDF, stores to Blob, creates Document row, kicks Ingest), document status list, topic CRUD + generate/regenerate, topic results (relationships grouped by type + flat fact list). Ingest/Resolve run as background functions; UI polls.

**UI**: two top-level views — Documents (dropzone + cards with status badge, pages, fact count) and Topics (cards → topic page with document selection grid, generate action, and results). Results: three expandable sections (Corroborated / Contradicted / Contextualized) plus an all-Facts browser. Row click opens the Evidence drawer: verbatim quote, page number, and a simple PDF page viewer from Blob (jump-to-page; no quote highlighting). Visual style: minimalist, dark near-black + neon green with a light-mode toggle (apply the minimalist-ui skill at implementation time).

**AI tooling note for README**: development uses agentic coding tools; extraction/comparison inference uses the gateway LLM.

## Testing Decisions

**What makes a good test here**: tests assert on externally observable behavior — database state after pipeline runs, returned API payloads — never on internal call ordering or prompt text. External providers are stubbed at the provider boundary (parse output, LLM verdicts, embedding vectors), so tests are deterministic and offline.

**One seam**: the two pipeline entry points (Ingest, Resolve) run end-to-end against a real Postgres (Neon via `DATABASE_URL`, with pgvector) with the four external providers stubbed. Assertions land on database state: Facts carry Evidence quote + page number + Qualifiers; Relationships get the correct type, explanation, and confidence; Regenerate removes prior Relationships before recomputing.

**Pure helpers tested directly at the same seam, without mocking**: the Chunk builder (parsed pages → page-grouped Chunks, parser-provided Markdown tables passed through unchanged) and the candidate-batching logic (similarity results → comparison batches, self-pairs excluded, threshold respected). These are the decision-dense pieces; everything else around them is I/O glue. The real parser additionally gets one fixture-based smoke check against a starter PDF (skipped when the fixture is absent).

**Runner**: Vitest (`bun test` rejected by user choice). No prior art in the repo — this establishes the first test setup. No UI tests, no Inngest-server tests: pipeline functions are plain async functions; Inngest merely invokes them.

**Model contract check**: one live smoke test (skipped when no API key is present) that exercises the real gateway with a minimal structured-output call, so gateway/model breakage is caught before the demo, not during it.

## Out of Scope

- Incremental knowledge (Relationships are recomputed per Topic run; new Documents do not update existing Topics automatically).
- Global or cross-topic knowledge; the knowledge layer is per-Topic.
- Editing or manually correcting Facts or Relationships.
- Quote highlighting inside the PDF viewer (page jump only).
- Authentication / multi-user support.
- Incremental ingestion as a brownie point, streaming progress, queues beyond Inngest, and a schema-evolution mechanism beyond jsonb fields.
- Hard-coded datasets: the starter PDFs shape prompts and demo content only.

## Further Notes

- Commit at relevant checkpoints throughout implementation (schema, pipelines, UI slices), using conventional commit messages (`feat:`, `fix:`, `chore:`, `docs:`, `test:`). Never bundle unrelated changes into one commit.
- The glossary in `CONTEXT.md` is the canonical vocabulary (Document, Chunk, Fact, Qualifier, Evidence, Topic, Relationship, Corroboration, Reconciliation, Regenerate); use these names in code and UI.
- Starter datasets live in `.data/delhivery/` and `.data/india-macroeconomy/` (six curated ~100-page PDFs, table-heavy) for demo and manual verification; they are not committed app fixtures.
- Known gateway risk: muse models on opencode Go have exhibited region gating and intermittent errors — hence env-swappable model config and the smoke test.
- README must document: setup/run, a ≤3-minute demo video, approach and trade-offs, limitations and next steps (per assignment requirements).
