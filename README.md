# superpdf

A fact knowledge layer for PDFs. Upload documents, extract grounded facts with evidence and page numbers, then compare facts across documents for corroboration, contradiction, and context.

## Setup and Run

```bash
bun install
cp .env.example .env.local
bun db:migrate
bun dev
```

Run Inngest locally with:

```bash
bunx inngest-cli dev
```

## Video Demo

> The demo video is longer than the requested 3 minutes because my OpenAI API credits ran out before I could showcase the complete end-to-end flow. The video therefore also walks through the database, architecture, and internal pipeline.

[🎥 Demo Video](https://d1rshan.me/superjoin.mp4)

## Approach

**Pipeline.** Upload → parse per-page Markdown → chunk by page groups → extract citable facts → embed → store in pgvector.

**Resolution.** Retrieve similar facts within the selected Topic, batch candidate pairs, and use an LLM to classify them as `SAME_FACT`, `CONTRADICTS`, or `CONTEXTUALIZES`, with an explanation and confidence.

**Architecture.**

<img width="2116" height="2244" alt="archi" src="https://github.com/user-attachments/assets/2dde29be-4e4f-4f3d-b039-c3f29a59bfd6" />

* Next.js 16 + TypeScript + Tailwind v4 + Bun, deployed on Vercel
* Neon Postgres + Drizzle ORM + pgvector
* Inngest for background ingest/resolve pipelines
* Vercel Blob for raw PDFs and cited-page rendering
* Model/provider configuration through environment variables

**Key decisions and trade-offs:**

* Store facts exactly as stated; unit, period, and scope reasoning is handled during comparison.
* Use embedding similarity to filter candidate pairs and batch LLM comparisons instead of comparing every fact pair.
* Scope knowledge to each Topic and recompute on regeneration.
* End-to-end pipeline tests use real Postgres with external providers stubbed, using Vitest.

**AI tools used:** `mimo-v2.5` for extraction/comparison and OpenAI `text-embedding-3-small` for embeddings.

## Limitations and Next Steps

**Known issues:**

* **Speed.** Processing large PDFs and running batched LLM comparisons can take several minutes due to parsing and rate limits.

**Next Steps:**

Caching and incremental resolution (only re-compare facts from new/changed documents) to cut both latency and cost.
A faster or streaming gateway model; parallelized extraction with higher concurrency.

## Additional Notes

* The video is ~10 minutes instead of the requested ≤3 minutes because I ran out of OpenAI API credits and could not demonstrate the complete flow end-to-end. I therefore used the video to also explain the database, architecture, and internal pipeline.
