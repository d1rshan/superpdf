import { UnstructuredClient } from "unstructured-client";
import { Strategy } from "unstructured-client/sdk/models/shared/partitionparameters.js";
import { env } from "../env";
import type { UnstructuredElement } from "./chunk-builder";

export async function parsePdf(
  bytes: Uint8Array,
  filename: string,
): Promise<UnstructuredElement[]> {
  const client = new UnstructuredClient({
    serverURL: process.env.UNSTRUCTURED_API_URL,
    security: { apiKeyAuth: env("UNSTRUCTURED_API_KEY") },
  });
  const response = await client.general.partition({
    partitionParameters: {
      files: { content: bytes, fileName: filename },
      strategy: Strategy.Auto,
      splitPdfPage: true,
      splitPdfAllowFailed: true,
      splitPdfConcurrencyLevel: 8,
    },
  });
  return Array.isArray(response) ? (response as UnstructuredElement[]) : [];
}
