import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { topics } from "@/lib/db/schema";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [topic] = await db.select().from(topics).where(eq(topics.id, id));
  if (!topic) {
    return Response.json({ error: "Topic not found" }, { status: 404 });
  }

  await db
    .update(topics)
    .set({ status: "running", updatedAt: new Date() })
    .where(eq(topics.id, id));
  try {
    await inngest.send({
      name: "topic/generate",
      data: { topicId: id },
    });
  } catch (err) {
    await db
      .update(topics)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(topics.id, id));
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
  return Response.json({ status: "running" }, { status: 202 });
}
