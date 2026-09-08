import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, topicDocuments, topics } from "@/lib/db/schema";

export async function GET() {
  const list = await db.select().from(topics).orderBy(desc(topics.createdAt));
  return Response.json(list);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const documentIds: unknown = body?.documentIds;
  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  if (
    !Array.isArray(documentIds) ||
    documentIds.some((id) => typeof id !== "string")
  ) {
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

  const [topic] = await db.insert(topics).values({ name }).returning();
  if (existing.length > 0) {
    await db
      .insert(topicDocuments)
      .values(existing.map((d) => ({ topicId: topic.id, documentId: d.id })));
  }
  return Response.json(
    { id: topic.id, name: topic.name, status: topic.status },
    { status: 201 },
  );
}
