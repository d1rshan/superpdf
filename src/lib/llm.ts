import { createGoogleGenerativeAI } from "@ai-sdk/google";
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

const EXTRACTION_PROMPT = `You extract factual claims from a slice of a document. The text is prefixed with page markers like "[page 3]".

Return every distinct fact stated, both numeric (revenue, growth rates, counts) and qualitative (appointments, resignations, approvals, status changes). For each fact:
- entity: who or what the claim is about.
- attribute: the specific property claimed.
- value: exactly as stated in the document — keep the original number and unit (e.g. "₹8,032 crore"); never convert, round, or normalize. For qualitative claims, the stated outcome.
- qualifiers: time period, scope (e.g. standalone vs consolidated), and location, only when stated; use null otherwise.
- evidenceQuote: a verbatim quote from the text supporting the fact.
- pageNumber: the page whose marker the evidence appears under.
- confidence: 0 to 1.

Do not invent facts, infer values, or restate the same fact twice.`;

export async function extractFacts(
  text: string,
  sessionId: string,
): Promise<ExtractedFact[]> {
  const { object } = await generateObject({
    model: gateway()(llmModel()),
    schema: z.object({ facts: z.array(extractedFactSchema) }),
    prompt: `${EXTRACTION_PROMPT}\n\nDocument text:\n\n${text}`,
    headers: { "x-opencode-session": sessionId },
  });
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

// ponytail: embedding provider fixed to Gemini at 1536 dims to match the vector column; env-swap the model string if it changes
export const EMBEDDING_DIMENSIONS = 1536;

export async function embedFacts(values: string[]): Promise<number[][]> {
  if (values.length === 0) return [];
  const google = createGoogleGenerativeAI({ apiKey: env("GOOGLE_API_KEY") });
  const { embeddings } = await embedMany({
    model: google.textEmbeddingModel(
      envOr("EMBEDDING_MODEL", "gemini-embedding-001"),
    ),
    values,
    providerOptions: {
      google: { outputDimensionality: EMBEDDING_DIMENSIONS },
    },
  });
  return embeddings;
}

function envOr(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}
