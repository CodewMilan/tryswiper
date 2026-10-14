import { and, count, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sid } from "@/lib/ids";
import type { UsageTransaction } from "./usage";

export type ProductEventKind = "created" | "edited" | "revised" | "checked" | "exported" | "feedback";

/** Local operational data only: no brief text, email, images, keys, or third-party analytics. */
export async function recordProductEvent(workspaceId: string, kind: ProductEventKind, carouselId: string, fields: { source?: string; value?: string } = {}, writer: UsageTransaction | typeof db = db): Promise<void> {
  if (writer === db) return db.transaction((tx) => recordProductEvent(workspaceId, kind, carouselId, fields, tx));
  await writer.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId)).for("no key update");
  await writer.insert(schema.productEvent).values({ id: sid("evt"), workspaceId, carouselId, kind, ...fields, createdAt: new Date() });
  await writer.delete(schema.productEvent).where(and(eq(schema.productEvent.workspaceId, workspaceId), lt(schema.productEvent.createdAt, new Date(Date.now() - 90 * 86400000))));
  const old = await writer.select({ id: schema.productEvent.id }).from(schema.productEvent).where(eq(schema.productEvent.workspaceId, workspaceId)).orderBy(desc(schema.productEvent.createdAt)).offset(10000);
  if (old.length) await writer.delete(schema.productEvent).where(inArray(schema.productEvent.id, old.map((row) => row.id)));
}

export async function productMetrics(workspaceId: string) {
  const rows = await db.select({ kind: schema.productEvent.kind, source: schema.productEvent.source, value: schema.productEvent.value,
    events: count(), drafts: sql<number>`count(distinct ${schema.productEvent.carouselId})` }).from(schema.productEvent)
    .where(and(eq(schema.productEvent.workspaceId, workspaceId), sql`${schema.productEvent.createdAt} >= ${new Date(Date.now() - 90 * 86400000)}`))
    .groupBy(schema.productEvent.kind, schema.productEvent.source, schema.productEvent.value);
  return { period_days: 90, stages: rows, note: "Observed product events since instrumentation began. These are stage counts, not a user-cohort conversion rate; source and feedback help compare model and local drafts." };
}
