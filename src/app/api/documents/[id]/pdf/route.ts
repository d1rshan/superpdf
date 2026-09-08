import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [doc] = await db
    .select({ blobUrl: documents.blobUrl, status: documents.status })
    .from(documents)
    .where(eq(documents.id, id));

  if (!doc) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }
  if (!doc.blobUrl) {
    return Response.json({ error: "No PDF stored yet" }, { status: 409 });
  }
  return Response.redirect(doc.blobUrl, 307);
}
