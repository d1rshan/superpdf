# 04: Topic generate → Relationships

**What to build:** A user creates a named Topic, selects ingested Documents for it, and hits Generate. The Resolve pipeline runs via Inngest: fetch the Topic's Facts, retrieve candidate pairs with pgvector top-k (similarity-threshold capped, restricted to the Topic's Documents), assemble comparison batches via the pure batching logic (self-pairs excluded, unit-tested), compare each batch with the LLM, and store Relationships (`SAME_FACT`, `CONTRADICTS`, `CONTEXTUALIZES`) with explanation and confidence — the comparison LLM does all unit/period/scope reasoning and its explanation is the shown output. Regenerate deletes the Topic's Relationships and reruns. A minimal Topic page shows selection, generation status (polled), and a raw Relationship list.

**Blocked by:** 03 (Facts — extraction + embedding).

**Status:** ready-for-agent

- [ ] Topic CRUD with Document selection persisted via topic_documents
- [ ] Generate triggers the Resolve pipeline; topic status polls to done/failed
- [ ] Candidate retrieval respects similarity threshold and Topic document scope
- [ ] Batching logic unit-tested (self-pair exclusion, threshold, batch assembly)
- [ ] Relationships stored with type, explanation, confidence
- [ ] Regenerate wipes prior Relationships and recomputes
- [ ] Minimal Topic page renders generation status and Relationship list
- [ ] Seam test: stubbed LLM verdicts produce correctly-typed Relationship rows; regenerate removes old rows first
- [ ] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)
