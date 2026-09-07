import {
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  blobUrl: text("blob_url"),
  status: text("status").notNull().default("uploading"),
  pageCount: integer("page_count"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  pageStart: integer("page_start").notNull(),
  pageEnd: integer("page_end").notNull(),
  text: text("text").notNull(),
});

export const facts = pgTable("facts", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  entity: text("entity").notNull(),
  attribute: text("attribute").notNull(),
  value: jsonb("value").notNull(),
  qualifiers: jsonb("qualifiers").notNull(),
  evidenceQuote: text("evidence_quote").notNull(),
  pageNumber: integer("page_number").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const topics = pgTable("topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  status: text("status").notNull().default("idle"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const topicDocuments = pgTable(
  "topic_documents",
  {
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.topicId, t.documentId] })],
);

export const factRelationships = pgTable("fact_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  factAId: uuid("fact_a_id")
    .notNull()
    .references(() => facts.id, { onDelete: "cascade" }),
  factBId: uuid("fact_b_id")
    .notNull()
    .references(() => facts.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  explanation: text("explanation").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type RelationshipType = "SAME_FACT" | "CONTRADICTS" | "CONTEXTUALIZES";
export type DocumentStatus =
  | "uploading"
  | "parsing"
  | "extracting"
  | "done"
  | "failed";
