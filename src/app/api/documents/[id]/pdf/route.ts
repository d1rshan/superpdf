import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";

function htmlError(message: string, status: number): Response {
  return new Response(
    `<!doctype html><body style="font:14px sans-serif;padding:2rem">${message}</body>`,
    { status, headers: { "Content-Type": "text/html" } },
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [doc] = await db
    .select({ blobUrl: documents.blobUrl })
    .from(documents)
    .where(eq(documents.id, id));

  if (!doc) {
    return htmlError("Document not found.", 404);
  }
  if (!doc.blobUrl) {
    return htmlError("No PDF stored for this document.", 409);
  }
  return Response.redirect(doc.blobUrl, 307);
}
