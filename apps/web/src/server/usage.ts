import { and, count, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sid } from "@/lib/ids";
import { getBilling } from "@/server/billing";

export type UsageKind = "carousel" | "generation" | "export" | "publish";
export type Plan = "free" | "pro";

export const PLAN_LIMITS = {
  free: { carousel: 5, generation: 10, export: 20, publish: 0, jpg: false },
  pro: { carousel: 100, generation: 250, export: 1000, publish: 100, jpg: true },
} as const;

function periodStart() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function workspacePlan(workspaceId: string): Promise<Plan> {
  const billing = await getBilling(workspaceId);
  return billing?.plan === "pro" && billing.status === "active" ? "pro" : "free";
}

export async function usageFor(workspaceId: string) {
  const rows = await db
    .select({ kind: schema.usageEvent.kind, value: count() })
    .from(schema.usageEvent)
    .where(and(eq(schema.usageEvent.workspaceId, workspaceId), gte(schema.usageEvent.createdAt, periodStart())))
    .groupBy(schema.usageEvent.kind);
  return Object.fromEntries(rows.map((row) => [row.kind, Number(row.value)])) as Partial<Record<UsageKind, number>>;
}

export async function assertUsage(workspaceId: string, kind: UsageKind) {
  const plan = await workspacePlan(workspaceId);
  const limits = PLAN_LIMITS[plan];
  const usage = await usageFor(workspaceId);
  const used = usage[kind] ?? 0;
  const limit = limits[kind];
  if (used >= limit) {
    throw Object.assign(
      new Error(plan === "free" ? `Free includes ${limit} ${kind}s per month. Upgrade to continue.` : `This workspace reached its monthly ${kind} limit.`),
      { status: 429, code: "USAGE_LIMIT", details: { kind, used, limit, plan } },
    );
  }
  return { plan, used, limit };
}

export async function recordUsage(workspaceId: string, kind: UsageKind) {
  await db.insert(schema.usageEvent).values({ id: sid("use"), workspaceId, kind });
}

export async function requireFeature(workspaceId: string, feature: "jpg" | "publish") {
  const plan = await workspacePlan(workspaceId);
  if (feature === "jpg" ? !PLAN_LIMITS[plan].jpg : PLAN_LIMITS[plan].publish === 0) {
    throw Object.assign(new Error(`${feature === "jpg" ? "JPG export" : "Publishing"} is included with Pro.`), {
      status: 403,
      code: "UPGRADE_REQUIRED",
      details: { feature, plan },
    });
  }
  return plan;
}
