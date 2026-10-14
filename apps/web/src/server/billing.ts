import { and, eq } from "drizzle-orm";
import { schema } from "@swiper/db";
import { db } from "@/lib/db";
import { dodoConfig, retrieveDodoSubscription } from "@/lib/dodo";
import { subscriptionEntitlement, type DodoSubscription } from "@/lib/subscription";

export async function getBilling(workspaceId: string) {
  const [row] = await db
    .select()
    .from(schema.billing)
    .where(eq(schema.billing.workspaceId, workspaceId))
    .limit(1);
  if (!row) return null;
  if (row.plan === "pro" && !row.dodoSubscriptionId) return { ...row, plan: "free", status: "verification_required" };
  if (row.dodoSubscriptionId && (!row.productId || !row.lastVerifiedAt || Date.now() - row.lastVerifiedAt.getTime() > 5 * 60_000 ||
    (row.plan === "pro" && (!row.paidThrough || row.paidThrough.getTime() <= Date.now())))) {
    try {
      const verificationStartedAt = new Date();
      const subscription = await retrieveDodoSubscription(row.dodoSubscriptionId);
      if ((subscription.metadata.workspace_id ?? subscription.metadata.workspaceId) !== workspaceId) return { ...row, plan: "free", status: "verification_required" };
      const values = subscriptionEntitlement(subscription, dodoConfig().productId);
      const [fresh] = await db.update(schema.billing).set({ ...values, lastVerifiedAt: verificationStartedAt, revision: row.revision + 1, updatedAt: new Date() })
        .where(and(eq(schema.billing.workspaceId, workspaceId), eq(schema.billing.dodoSubscriptionId, row.dodoSubscriptionId), eq(schema.billing.revision, row.revision))).returning();
      if (fresh) return fresh;
      const [changed] = await db.select().from(schema.billing).where(eq(schema.billing.workspaceId, workspaceId)).limit(1);
      return changed ?? null;
    } catch {
      // Previously verified paid time can still be honored during a provider outage.
      if (!row.lastVerifiedAt || !row.productId || !row.paidThrough || row.paidThrough.getTime() <= Date.now()) return { ...row, plan: "free", status: "verification_required" };
    }
  }
  return row;
}

export async function applySubscriptionEvent(input: {
  eventId: string; type: string; occurredAt: Date; workspaceId: string; subscription: DodoSubscription;
  verificationStartedAt?: Date;
}) {
  return db.transaction(async (tx) => {
    const [workspace] = await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, input.workspaceId)).for("update");
    if (!workspace) return { applied: false, reason: "unknown_workspace" };
    const [event] = await tx.insert(schema.billingWebhook).values({ id: input.eventId, workspaceId: input.workspaceId, type: input.type, occurredAt: input.occurredAt }).onConflictDoNothing().returning();
    if (!event) return { applied: false, reason: "duplicate" };
    const [current] = await tx.select().from(schema.billing).where(eq(schema.billing.workspaceId, input.workspaceId));
    if (current?.lastEventAt && input.occurredAt < current.lastEventAt) return { applied: false, reason: "stale" };
    if (input.verificationStartedAt && current?.dodoSubscriptionId === input.subscription.subscription_id && current.lastVerifiedAt && current.lastVerifiedAt > input.verificationStartedAt) return { applied: false, reason: "newer_verification" };
    if (current?.dodoSubscriptionId && current.dodoSubscriptionId !== input.subscription.subscription_id &&
      (current.subscriptionCreatedAt && new Date(input.subscription.created_at) <= current.subscriptionCreatedAt ||
        !["active", "past_due"].includes(input.subscription.status))) return { applied: false, reason: "superseded_subscription" };
    const entitlement = subscriptionEntitlement(input.subscription, dodoConfig().productId);
    if (entitlement.productId !== dodoConfig().productId && current?.dodoSubscriptionId !== input.subscription.subscription_id) return { applied: false, reason: "unrelated_product" };
    const values = { workspaceId: input.workspaceId, ...entitlement, dodoSubscriptionId: input.subscription.subscription_id,
      dodoCustomerId: input.subscription.customer.customer_id, lastEventAt: input.occurredAt, lastVerifiedAt: input.verificationStartedAt ?? new Date(), revision: (current?.revision ?? 0) + 1, updatedAt: new Date() };
    await tx.insert(schema.billing).values(values).onConflictDoUpdate({ target: schema.billing.workspaceId, set: values });
    return { applied: true };
  });
}
