import { and, count, eq, gt, lt, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sid } from "@/lib/ids";

const BUDGETS = { generation: { global: 8, workspace: 2, perMinute: 10 }, render: { global: 4, workspace: 2, perMinute: 30 } } as const;

/** Distributed admission across app instances; leases expire after a crashed worker. */
export async function withResourceBudget<T>(workspaceId: string, kind: keyof typeof BUDGETS, work: () => Promise<T>): Promise<T> {
  const id = sid("lease");
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(872351)`);
    const now = new Date();
    await tx.delete(schema.operationLease).where(lt(schema.operationLease.expiresAt, now));
    const active = await tx.select({ workspaceId: schema.operationLease.workspaceId }).from(schema.operationLease)
      .where(and(eq(schema.operationLease.kind, kind), gt(schema.operationLease.expiresAt, now)));
    const budget = BUDGETS[kind];
    if (active.length >= budget.global || active.filter((lease) => lease.workspaceId === workspaceId).length >= budget.workspace) throw Object.assign(new Error("Swiper is busy with other work. Retry shortly with the same request ID."), { status: 429, code: "RESOURCE_BUSY", details: { retry_after_seconds: 5 } });
    const [window] = await tx.select().from(schema.resourceWindow).where(and(eq(schema.resourceWindow.workspaceId, workspaceId), eq(schema.resourceWindow.kind, kind)));
    const startedAt = new Date(Math.floor(now.getTime() / 60000) * 60000);
    const requests = window?.startedAt.getTime() === startedAt.getTime() ? window.requests + 1 : 1;
    if (requests > budget.perMinute) throw Object.assign(new Error("Too many expensive requests this minute. Retry with the same request ID after a minute."), { status: 429, code: "RATE_LIMIT" });
    await tx.insert(schema.resourceWindow).values({ workspaceId, kind, startedAt, requests }).onConflictDoUpdate({ target: [schema.resourceWindow.workspaceId, schema.resourceWindow.kind], set: { startedAt, requests } });
    await tx.insert(schema.operationLease).values({ id, workspaceId, kind, expiresAt: new Date(now.getTime() + 120000) });
  });
  try { return await work(); } finally { await db.delete(schema.operationLease).where(eq(schema.operationLease.id, id)); }
}

export async function assertAssetStorage(workspaceId: string, byteSize: number, tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) {
  await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, workspaceId)).for("no key update");
  const [usage] = await tx.select({ bytes: sql<number>`coalesce(sum(${schema.asset.byteSize}), 0)`, assets: count() }).from(schema.asset).where(eq(schema.asset.workspaceId, workspaceId));
  const [uploads] = await tx.select({ value: count() }).from(schema.asset).where(and(eq(schema.asset.workspaceId, workspaceId), gt(schema.asset.createdAt, new Date(Date.now() - 3600000))));
  if (Number(usage?.bytes) + byteSize > 200 * 1024 * 1024 || Number(usage?.assets) >= 200) throw Object.assign(new Error("This workspace reached its image-storage limit (200 images or 200 MiB). Remove unused images to make room."), { status: 413, code: "ASSET_STORAGE_LIMIT" });
  if (Number(uploads?.value) >= 30) throw Object.assign(new Error("This workspace reached 30 image uploads this hour. Try again later."), { status: 429, code: "UPLOAD_RATE_LIMIT" });
}
