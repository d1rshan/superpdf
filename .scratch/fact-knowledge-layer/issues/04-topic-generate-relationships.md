# 04: Topic generate → Relationships

**What to build:** A user creates a named Topic, selects ingested Documents for it, and hits Generate. The Resolve pipeline runs via Inngest: fetch the Topic's Facts, retrieve candidate pairs with pgvector top-k (similarity-threshold capped, restricted to the Topic's Documents), assemble comparison batches via the pure batching logic (self-pairs excluded, unit-tested), compare each batch with the LLM, and store Relationships (`SAME_FACT`, `CONTRADICTS`, `CONTEXTUALIZES`) with explanation and confidence — the comparison LLM does all unit/period/scope reasoning and its explanation is the shown output. Regenerate deletes the Topic's Relationships and reruns. A minimal Topic page shows selection, generation status (polled), and a raw Relationship list.

**Blocked by:** 03 (Facts — extraction + embedding).

**Status:** done

- [x] Topic CRUD with Document selection persisted via topic_documents
- [x] Generate triggers the Resolve pipeline; topic status polls to done/failed
- [x] Candidate retrieval respects similarity threshold and Topic document scope
- [x] Batching logic unit-tested (self-pair exclusion, threshold, batch assembly)
- [x] Relationships stored with type, explanation, confidence
- [x] Regenerate wipes prior Relationships and recomputes
- [x] Minimal Topic page renders generation status and Relationship list
- [x] Seam test: stubbed LLM verdicts produce correctly-typed Relationship rows; regenerate removes old rows first
- [x] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)

## Comments

- Implemented as `src/lib/resolve/` (`batching.ts` pure pair/batch logic, `resolve.ts` pipeline with `retrieve`/`compare` DI seams). `MAX_COSINE_DISTANCE = 0.3`, `TOP_K = 5`, `BATCH_SIZE = 10` as code constants.
- `compareFactPairs` added to `src/lib/llm.ts`: batched structured-output comparison; `UNRELATED` verdict is an LLM-only escape hatch filtered before insert so the `fact_relationships.type` enum stays clean.
- Seam test exercises real pgvector retrieval (topic-scope restriction, near-pair found) plus stubbed verdicts; regenerate test asserts old rows are gone first. Facts/qualifiers jsonb column now `$type`d.
- API: `/api/topics` (GET/POST), `/api/topics/[id]` (GET/PATCH/DELETE), `/api/topics/[id]/generate` (POST → Inngest `topic/generate`), `/api/topics/[id]/results` (relationships + flat fact list). UI: `/topics` list, `/topics/[id]` with document selection, polled status (2s running / 10s idle), raw relationship list. Grouped sections/fact browser left for ticket 05.
