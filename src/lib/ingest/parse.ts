import { env } from "../env";
import type { UnstructuredElement } from "./chunk-builder";

// ponytail: Transform jobs API processes server-side; 15min ceiling covers ~100-page PDFs at hi_res (~2.5min measured with vlm)
const JOB_TIMEOUT_MS = 15 * 60_000;
const POLL_INTERVAL_MS = 5_000;

type TransformElement = {
  type?: string;
  text?: string;
  metadata?: {
    page_number?: number;
    text_as_html?: string | null;
  };
};

export async function parsePdf(
  bytes: Uint8Array,
  filename: string,
): Promise<UnstructuredElement[]> {
  const base = env("UNSTRUCTURED_API_URL");
  const key = env("UNSTRUCTURED_API_KEY");
  const headers = { "unstructured-api-key": key, accept: "application/json" };

  const form = new FormData();
  form.append(
    "input_files",
    new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
    filename,
  );
  form.append(
    "request_data",
    JSON.stringify({
      job_nodes: [
        {
          name: "Partitioner",
          type: "partition",
          // ponytail: vlm+dynamic is the only subtype this Transform account accepts (auto/hi_res/fast return "Failed to process template workflow"); is_dynamic+allow_fast routes simple pages to fast, so latency ~2.5min/100pp
          subtype: process.env.UNSTRUCTURED_PARTITION_SUBTYPE ?? "vlm",
          settings: { is_dynamic: true, allow_fast: true },
        },
      ],
    }),
  );

  const createRes = await fetch(`${base}/jobs/`, {
    method: "POST",
    headers,
    body: form,
  });
  if (!createRes.ok) {
    throw new Error(
      `Unstructured job creation failed: HTTP ${createRes.status}`,
    );
  }
  const job = (await createRes.json()) as { id: string };

  const deadline = Date.now() + JOB_TIMEOUT_MS;
  let status = "SCHEDULED";
  let fileId: string | undefined;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const pollRes = await fetch(`${base}/jobs/${job.id}`, { headers });
    if (!pollRes.ok) {
      throw new Error(`Unstructured job poll failed: HTTP ${pollRes.status}`);
    }
    const polled = (await pollRes.json()) as {
      status: string;
      output_node_files?: { file_id: string }[];
    };
    status = polled.status;
    if (status === "COMPLETED") {
      fileId = polled.output_node_files?.[0]?.file_id;
      break;
    }
    if (status === "FAILED" || status === "STOPPED") {
      throw new Error(`Unstructured job ${status.toLowerCase()}`);
    }
  }
  if (status !== "COMPLETED") {
    throw new Error("Unstructured job timed out");
  }
  if (!fileId) throw new Error("Unstructured job produced no output");

  const downloadRes = await fetch(
    `${base}/jobs/${job.id}/download?file_id=${encodeURIComponent(fileId)}`,
    { headers },
  );
  if (!downloadRes.ok) {
    throw new Error(
      `Unstructured output download failed: HTTP ${downloadRes.status}`,
    );
  }
  const elements = (await downloadRes.json()) as TransformElement[];
  if (!Array.isArray(elements)) {
    throw new Error("Unexpected response from Unstructured API");
  }
  return elements.map((element) => ({
    type: element.type,
    text: element.text,
    metadata: {
      page_number: element.metadata?.page_number,
      text_as_html: element.metadata?.text_as_html ?? undefined,
    },
  }));
}
