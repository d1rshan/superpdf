import { ingestDocument } from "../ingest/ingest";
import { inngest } from "./client";

export const ingestFn = inngest.createFunction(
  {
    id: "ingest-document",
    name: "Ingest Document",
    triggers: [{ event: "document/ingested" }],
  },
  ({ event }) => ingestDocument(event.data.documentId),
);
