# 01: Foundations — schema + test seam

**What to build:** The project substrate every later slice stands on: install all dependencies (Drizzle ORM with pgvector, Inngest, Vercel Blob client, @firecrawl/pdf-inspector, AI SDK, OpenAI embeddings, Vitest), wire environment configuration, define the full Drizzle schema (documents, chunks, facts, topics, topic_documents, fact_relationships — facts carrying an embedding vector column), run migrations against the Neon database, and establish the Vitest harness connecting to Neon. Not user-demoable; this is the prefactor that makes every later slice land green.

**Blocked by:** None (can start immediately).

**Status:** done

- [x] All dependencies installed and configured via environment variables (DB URL, Blob, gateway LLM model/key, OpenAI embeddings key)
- [x] Drizzle schema for all six tables defined; facts.embedding is a pgvector column; migrations applied to Neon
- [x] Vitest configured and a smoke test connects to the database and reads/writes successfully
- [x] `lint` and `typecheck` pass; committed in relevant checkpoints with conventional commit messages (multiple commits as work progresses, not one lump commit)
