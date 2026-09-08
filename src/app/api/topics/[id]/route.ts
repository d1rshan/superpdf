import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, facts, topicDocuments, topics } from "@/lib/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [topic] = await db.select().from(topics).where(eq(topics.id, id));
  if (!topic) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }
  const selectedDocuments = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      status: documents.status,
      factCount: db.$count(facts, eq(facts.documentId, documents.id)),
    })
    .from(topicDocuments)
    .innerJoin(documents, eq(topicDocuments.documentId, documents.id))
    .where(eq(topicDocuments.topicId, id));
  return Response.json({ ...topic, documents: selectedDocuments });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [topic] = await db.select().from(topics).where(eq(topics.id, id));
  if (!topic) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  const body = await request.json();
  const name =
    typeof body?.name === "string" && body.name.trim()
      ? body.name.trim()
      : topic.name;
  const documentIds: unknown = body?.documentIds;

  const updates: { name: string } = { name };
  if (Array.isArray(documentIds)) {
    if (documentIds.some((did) => typeof did !== "string")) {
      return Response.json(
        { error: "documentIds must be strings" },
        { status: 400 },
      );
    }
    const ids = [...new Set(documentIds as string[])];
    const existing =
      ids.length > 0
        ? await db
            .select({ id: documents.id })
            .from(documents)
            .where(inArray(documents.id, ids))
        : [];
    await db.delete(topicDocuments).where(eq(topicDocuments.topicId, id));
    if (existing.length > 0) {
      await db
        .insert(topicDocuments)
        .values(existing.map((d) => ({ topicId: id, documentId: d.id })));
    }
  }

  await db
    .update(topics)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(topics.id, id));
  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  await db.delete(topics).where(eq(topics.id, id));
  return Response.json({ ok: true });
}
