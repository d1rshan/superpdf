import { createOpenAI } from "@ai-sdk/openai";
import { embedMany, generateObject } from "ai";
import { z } from "zod";
import { env, llmModel } from "./env";

const extractedFactSchema = z.object({
  entity: z.string().describe("Who or what the claim is about"),
  attribute: z.string().describe("What is being claimed about the entity"),
  value: z
    .string()
    .describe(
      'The value exactly as stated in the document, number and unit verbatim (e.g. "₹8,032 crore"). For qualitative claims, the stated outcome (e.g. "resigned").',
    ),
  qualifiers: z.object({
    time: z
      .string()
      .nullable()
      .describe('Time period the claim covers, e.g. "Q4 FY24"'),
    scope: z
      .string()
      .nullable()
      .describe('Scope of the claim, e.g. "consolidated" vs "standalone"'),
    location: z.string().nullable().describe("Geographic scope, if stated"),
  }),
  evidenceQuote: z
    .string()
    .describe("Verbatim quote from the document supporting this fact"),
  pageNumber: z
    .number()
    .int()
    .describe("Page number of the evidence, as marked in the text"),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("How certain the extraction is, 0 to 1"),
});

export type ExtractedFact = z.infer<typeof extractedFactSchema>;

// ponytail: flag is derived from confidence, not stored as a column (spec schema has none) — surface in results UI (ticket 05) if needed
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

export function isLowConfidence(fact: { confidence: number }): boolean {
  return fact.confidence < LOW_CONFIDENCE_THRESHOLD;
}

// ponytail: chat (mimo etc.) hits /chat/completions, responses (muse) hits /responses — pick via LLM_API_STYLE
function gateway() {
  const openai = createOpenAI({
    baseURL: env("LLM_BASE_URL"),
    apiKey: env("LLM_API_KEY"),
  });
  return process.env.LLM_API_STYLE === "responses"
    ? (model: string) => openai.responses(model)
    : (model: string) => openai.chat(model);
}

const EXTRACTION_PROMPT = `You extract meaningful factual claims from a slice of a document. The text is prefixed with page markers like "[page 3]".

Return only material facts a reader would cite when summarizing or fact-checking the document:
- headline metrics (revenue, profit, margins, volumes, growth, market share) and their period-over-period changes
- corporate status changes (appointments, resignations, board changes, approvals, acquisitions, partnerships)
- stated targets, guidance, forecasts, and notable commitments

Skip layout noise, boilerplate, and repeated restatements of the same metric. When a table shows one metric across several periods, keep the periods that carry the story (current, prior year, change) rather than every row.

For each fact:
- entity: who or what the claim is about.
- attribute: the specific property claimed.
- value: exactly as stated in the document — keep the original number and unit (e.g. "₹8,032 crore"); never convert, round, or normalize. For qualitative claims, the stated outcome.
- qualifiers: time period, scope (e.g. standalone vs consolidated), and location, only when stated; use null otherwise.
- evidenceQuote: a verbatim quote from the text supporting this fact.
- pageNumber: the page whose marker the evidence appears under.
- confidence: 0 to 1.

Do not invent facts, infer values, or restate the same fact twice. Prefer fewer, higher-confidence facts over an exhaustive list.`;

export async function extractFacts(
  text: string,
  sessionId: string,
): Promise<ExtractedFact[]> {
  const model = llmModel();
  const { object } = await generateObject({
    model: gateway()(model),
    schema: z.object({ facts: z.array(extractedFactSchema) }),
    prompt: `${EXTRACTION_PROMPT}\n\nDocument text:\n\n${text}`,
    headers: { "x-opencode-session": sessionId },
  });
  const sample = object.facts[0];
  console.log(
    `[extract ${model}] ${object.facts.length} facts from ${text.length} chars${sample ? ` — first: ${JSON.stringify(sample).slice(0, 300)}` : ""}`,
  );
  return object.facts;
}

export function factEmbeddingText(fact: {
  entity: string;
  attribute: string;
  value: string;
  qualifiers: {
    time: string | null;
    scope: string | null;
    location: string | null;
  };
}): string {
  const { time, scope, location } = fact.qualifiers;
  return [
    fact.entity,
    fact.attribute,
    fact.value,
    time && `time: ${time}`,
    scope && `scope: ${scope}`,
    location && `location: ${location}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

export type ComparisonFact = {
  entity: string;
  attribute: string;
  value: unknown;
  qualifiers: {
    time: string | null;
    scope: string | null;
    location: string | null;
  };
  evidenceQuote: string;
  pageNumber: number;
};

const COMPARISON_PROMPT = `You compare factual claims extracted from documents. Each pair shows two facts with their entity, attribute, value (exactly as stated, with its unit), qualifiers, and the evidence quote.

Judge whether the two facts refer to the same underlying claim, accounting for units, periods, and scope yourself:
- SAME_FACT: they state the same fact, even in different wording, units, or currencies (e.g. "₹8,032 crore" vs "₹80.3 billion").
- CONTRADICTS: they genuinely conflict for the same period, scope, and subject.
- CONTEXTUALIZES: they look contradictory but are reconciled by differing time period, scope, or units — the explanation must name the differing qualifier(s).
- UNRELATED: they are not claims about the same thing and say nothing relevant about each other.

explanation: one line a reader can use directly. confidence: 0 to 1.`;

function renderFact(fact: ComparisonFact, label: string): string {
  const { time, scope, location } = fact.qualifiers;
  const qualifiers = [
    time && `time=${time}`,
    scope && `scope=${scope}`,
    location && `location=${location}`,
  ]
    .filter(Boolean)
    .join(", ");
  return `${label}: entity=${fact.entity} | attribute=${fact.attribute} | value=${String(fact.value)}${qualifiers ? ` | qualifiers: ${qualifiers}` : ""} | evidence (p.${fact.pageNumber}): "${fact.evidenceQuote}"`;
}

export async function compareFactPairs(
  pairs: { a: ComparisonFact; b: ComparisonFact }[],
  sessionId: string,
): Promise<{ type: string; explanation: string; confidence: number }[]> {
  if (pairs.length === 0) return [];
  const model = llmModel();
  const { object } = await generateObject({
    model: gateway()(model),
    schema: z.object({
      verdicts: z.array(
        z.object({
          type: z.enum([
            "SAME_FACT",
            "CONTRADICTS",
            "CONTEXTUALIZES",
            "UNRELATED",
          ]),
          explanation: z.string().describe("One-line reason for the verdict"),
          confidence: z.number().min(0).max(1),
        }),
      ),
    }),
    prompt: `${COMPARISON_PROMPT}\n\nPairs:\n\n${pairs
      .map(
        ({ a, b }, i) =>
          `Pair ${i + 1}\n${renderFact(a, "Fact A")}\n${renderFact(b, "Fact B")}`,
      )
      .join("\n\n")}`,
    headers: { "x-opencode-session": sessionId },
  });
  console.log(`[compare ${model}] ${object.verdicts.length} verdicts`);
  return object.verdicts;
}

// ponytail: embedding provider fixed to OpenAI text-embedding-3-small (1536-dim default, matches the pgvector column); env-swap the model string if it changes
export async function embedFacts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const openai = createOpenAI({ apiKey: env("OPENAI_API_KEY") });
  const start = Date.now();
  const { embeddings } = await embedMany({
    model: openai.textEmbeddingModel(
      envOr("EMBEDDING_MODEL", "text-embedding-3-small"),
    ),
    values,
  });
  console.log(
    `[embed] ${embeddings.length} facts in ${((Date.now() - start) / 1000).toFixed(1)}s`,
  );
  return embeddings;
}

function envOr(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}
