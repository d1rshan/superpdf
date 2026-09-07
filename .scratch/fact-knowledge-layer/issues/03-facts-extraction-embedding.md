# 03: Facts — extraction + embedding

**What to build:** The ingest function extends beyond parsing: each Chunk is sent to the LLM for structured Fact extraction — entity, attribute, value stored exactly as stated (raw number + unit), Qualifiers (time/scope/location), mandatory verbatim evidence quote + page number, confidence, and a low-confidence flag; qualitative Facts (e.g. "a director resigned") are first-class. Each Fact is embedded (OpenAI embeddings) and stored. The Documents view shows the Fact count per Document.

**Blocked by:** 02 (Upload → parse → chunks).

**Status:** done

- [x] Extraction produces Facts with evidence quote, page number, Qualifiers, confidence, and low-confidence flag per Chunk
- [x] Qualitative and numeric Facts both extract; value kept raw as stated (no normalization)
- [x] Facts are embedded and stored with their vector
- [x] Seam test: stubbed LLM/embedding output yields Facts with evidence and vectors in the database
- [x] Document cards display Fact counts after ingestion
- [x] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)
