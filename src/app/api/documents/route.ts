import { put } from "@vercel/blob";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { documents, facts } from "@/lib/db/schema";
import { markDocument } from "@/lib/documents";
import { inngest } from "@/lib/inngest/client";

export async function GET() {
  const list = await db
    .select({
      id: documents.id,
      filename: documents.filename,
      status: documents.status,
      pageCount: documents.pageCount,
      factCount:
        sql<number>`(select count(*) from ${facts} where ${facts.documentId} = ${documents.id})`.mapWith(
          Number,
        ),
      error: documents.error,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .orderBy(desc(documents.createdAt));
  return Response.json(list);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
    return Response.json({ error: "Upload a PDF file" }, { status: 400 });
  }

  const [doc] = await db
    .insert(documents)
    .values({ filename: file.name, status: "uploading" })
    .returning();

  try {
    const blob = await put(`documents/${doc.id}`, file, {
      access: "public",
      contentType: "application/pdf",
    });
    await db
      .update(documents)
      .set({ blobUrl: blob.url, status: "parsing", updatedAt: new Date() })
      .where(eq(documents.id, doc.id));
    await inngest.send({
      name: "document/uploaded",
      data: { documentId: doc.id },
    });
    return Response.json(
      { id: doc.id, filename: doc.filename, status: "parsing" },
      { status: 201 },
    );
  } catch (err) {
    await markDocument(
      doc.id,
      "failed",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json({ id: doc.id, status: "failed" }, { status: 500 });
  }
}
