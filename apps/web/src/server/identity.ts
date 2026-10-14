import { and, eq, isNull } from "drizzle-orm";
import { clerkClient, type User } from "@clerk/nextjs/server";
import { db, schema } from "@/lib/db";

export async function syncClerkProfile(localId: string, user: Pick<User, "id" | "fullName" | "primaryEmailAddress" | "imageUrl" | "banned" | "locked">) {
  return db.transaction(async (tx) => {
    const disabled = user.banned || user.locked;
    const email = user.primaryEmailAddress;
    await tx.update(schema.user).set({
      ...(email ? { email: email.emailAddress, emailVerified: email.verification?.status === "verified" } : {}),
      name: user.fullName || email?.emailAddress.split("@")[0] || "Swiper", image: user.imageUrl || null,
      disabledAt: disabled ? new Date() : null, identityCheckedAt: new Date(), updatedAt: new Date(),
    }).where(eq(schema.user.id, localId));
    if (disabled) await tx.update(schema.mcpKey).set({ revokedAt: new Date() }).where(and(eq(schema.mcpKey.userId, localId), isNull(schema.mcpKey.revokedAt)));
    return !disabled;
  });
}

export async function disableClerkIdentity(clerkId: string) {
  const [account] = await db.select({ userId: schema.account.userId }).from(schema.account)
    .where(and(eq(schema.account.providerId, "clerk"), eq(schema.account.accountId, clerkId))).limit(1);
  if (!account) return;
  await db.transaction(async (tx) => {
    await tx.update(schema.user).set({ disabledAt: new Date(), identityCheckedAt: new Date(), updatedAt: new Date() }).where(eq(schema.user.id, account.userId));
    await tx.update(schema.mcpKey).set({ revokedAt: new Date() }).where(and(eq(schema.mcpKey.userId, account.userId), isNull(schema.mcpKey.revokedAt)));
  });
}

export async function refreshClerkIdentity(clerkId: string) {
  const [account] = await db.select({ userId: schema.account.userId }).from(schema.account)
    .where(and(eq(schema.account.providerId, "clerk"), eq(schema.account.accountId, clerkId))).limit(1);
  if (!account) return;
  try {
    const provider = await clerkClient();
    const profile = await provider.users.getUser(clerkId);
    return await syncClerkProfile(account.userId, profile);
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 404) {
      await disableClerkIdentity(clerkId);
      return false;
    }
    throw Object.assign(new Error("Account verification is temporarily unavailable. Please try again.", { cause: error }), { status: 503, code: "IDENTITY_UNAVAILABLE" });
  }
}

export async function assertActiveIdentity(localId: string) {
  const [user] = await db.select({ disabledAt: schema.user.disabledAt, checkedAt: schema.user.identityCheckedAt }).from(schema.user).where(eq(schema.user.id, localId)).limit(1);
  if (!user || user.disabledAt) throw Object.assign(new Error("This account no longer has access."), { status: 403, code: "ACCOUNT_DISABLED" });
  if (!user.checkedAt || Date.now() - user.checkedAt.getTime() > 2 * 60_000) {
    const [account] = await db.select({ clerkId: schema.account.accountId }).from(schema.account)
      .where(and(eq(schema.account.providerId, "clerk"), eq(schema.account.userId, localId))).limit(1);
    if (account && !(await refreshClerkIdentity(account.clerkId))) throw Object.assign(new Error("This account no longer has access."), { status: 403, code: "ACCOUNT_DISABLED" });
  }
}
