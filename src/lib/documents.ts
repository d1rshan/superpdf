import { eq } from "drizzle-orm";
import { db } from "./db";
import { type DocumentStatus, documents } from "./db/schema";

export async function markDocument(
  id: string,
  status: DocumentStatus,
  error?: string | null,
): Promise<void> {
  await db
    .update(documents)
    .set({ status, error: error ?? null, updatedAt: new Date() })
    .where(eq(documents.id, id));
}
