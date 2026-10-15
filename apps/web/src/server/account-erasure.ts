import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { cancelDodoSubscription } from "@/lib/dodo";

/** Remove active workspace content before waiting on any billing provider. */
export async function eraseAccountContent(userId: string) {
  await db.transaction(async (tx) => {
    const [person] = await tx.select({ deletedAt: schema.user.deletedAt }).from(schema.user).where(eq(schema.user.id, userId)).for("no key update");
    if (!person || person.deletedAt) return;
    const workspaces = await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.ownerId, userId)).orderBy(schema.workspace.id).for("update");
    const ids = workspaces.map((workspace) => workspace.id);
    const subscriptions = ids.length ? await tx.select({ id: schema.billing.dodoSubscriptionId }).from(schema.billing).where(inArray(schema.billing.workspaceId, ids)) : [];
    await tx.insert(schema.accountErasure).values({ userId, subscriptionIds: [...new Set(subscriptions.flatMap((subscription) => subscription.id ? [subscription.id] : []))] }).onConflictDoNothing();
    // Cascades remove carousels/history, assets (including bytes), formats, brand,
    // request receipts, events, leases, billing and every member's workspace keys.
    // Removing the workspace also fences already-running writes at their FK commit.
    await tx.delete(schema.workspace).where(eq(schema.workspace.ownerId, userId));
    await tx.delete(schema.membership).where(eq(schema.membership.userId, userId));
    await tx.delete(schema.mcpKey).where(eq(schema.mcpKey.userId, userId));
    await tx.delete(schema.session).where(eq(schema.session.userId, userId));
    await tx.delete(schema.accountIdentityArchive).where(eq(schema.accountIdentityArchive.userId, userId));
    await tx.update(schema.account).set({ accessToken: null, refreshToken: null, idToken: null, password: null, scope: null, accessTokenExpiresAt: null, refreshTokenExpiresAt: null }).where(eq(schema.account.userId, userId));
    // Keep only an anonymized local identity and provider mapping as a permanent
    // fence against delayed profile events or an old session recreating content.
    const hash = createHash("sha256").update(userId).digest("hex");
    await tx.update(schema.user).set({ name: "Deleted account", email: `${hash}@deleted.swiper.invalid`, emailVerified: false, image: null, disabledAt: sql`clock_timestamp()`, deletedAt: sql`clock_timestamp()`, identityCheckedAt: sql`clock_timestamp()`, updatedAt: new Date() }).where(eq(schema.user.id, userId));
  });
}

export async function finishAccountErasure(userId: string) {
  const [job] = await db.select().from(schema.accountErasure).where(eq(schema.accountErasure.userId, userId));
  if (!job || job.completedAt) return;
  for (const id of job.subscriptionIds) {
    await cancelDodoSubscription(id);
    // Atomic subtraction makes duplicate webhook/retry deliveries safe.
    await db.update(schema.accountErasure).set({ subscriptionIds: sql`${schema.accountErasure.subscriptionIds} - ${id}` }).where(eq(schema.accountErasure.userId, userId));
  }
  await db.update(schema.accountErasure).set({ completedAt: new Date() }).where(and(eq(schema.accountErasure.userId, userId), sql`jsonb_array_length(${schema.accountErasure.subscriptionIds}) = 0`));
}

export async function eraseClerkIdentity(clerkId: string) {
  const [account] = await db.select({ userId: schema.account.userId }).from(schema.account).where(and(eq(schema.account.providerId, "clerk"), eq(schema.account.accountId, clerkId))).limit(1);
  if (!account) return;
  await eraseAccountContent(account.userId);
  // Failure leaves durable billing work and causes a webhook retry, never restores content.
  await finishAccountErasure(account.userId);
}
