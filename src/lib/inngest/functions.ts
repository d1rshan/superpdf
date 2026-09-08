import { ingestDocument } from "../ingest/ingest";
import { resolveTopic } from "../resolve/resolve";
import { inngest } from "./client";

export const ingestFn = inngest.createFunction(
  {
    id: "ingest-document",
    name: "Ingest Document",
    triggers: [{ event: "document/uploaded" }],
  },
  ({ event }) => ingestDocument(event.data.documentId),
);

export const resolveFn = inngest.createFunction(
  {
    id: "resolve-topic",
    name: "Resolve Topic",
    triggers: [{ event: "topic/generate" }],
  },
  ({ event }) => resolveTopic(event.data.topicId),
);
