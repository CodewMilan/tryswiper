import { and, eq, isNull, sql } from "drizzle-orm";
import { clerkClient, type User } from "@clerk/nextjs/server";
import { db, schema } from "@/lib/db";
import { sid } from "@/lib/ids";

type IdentityProfile = Pick<User, "id" | "fullName" | "primaryEmailAddress" | "imageUrl" | "banned" | "locked">;

/** Serialize first-time account linking by provider identity and normalized email. */
export async function linkClerkProfile(profile: IdentityProfile) {
  if (profile.banned || profile.locked) return null;
  const email = (profile.primaryEmailAddress?.emailAddress ?? `${profile.id}@users.swiper.invalid`).toLowerCase();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`clerk:${profile.id}`}, 0))`);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`email:${email}`}, 0))`);
    const [linked] = await tx.select({ userId: schema.account.userId }).from(schema.account)
      .where(and(eq(schema.account.providerId, "clerk"), eq(schema.account.accountId, profile.id))).limit(1);
    if (linked) return linked.userId;
    const [byEmail] = await tx.select({ id: schema.user.id, disabledAt: schema.user.disabledAt }).from(schema.user).where(eq(schema.user.email, email)).limit(1);
    if (byEmail?.disabledAt) throw Object.assign(new Error("This email belongs to a disabled account. Contact support before reconnecting it."), { status: 409, code: "ACCOUNT_LINK_REQUIRED" });
    const verified = profile.primaryEmailAddress?.verification?.status === "verified";
    if (byEmail && !verified) throw Object.assign(new Error("Verify your email before linking this account."), { status: 409, code: "EMAIL_VERIFICATION_REQUIRED" });
    const localId = byEmail?.id ?? profile.id;
    if (!byEmail) await tx.insert(schema.user).values({ id: localId, email, name: profile.fullName || email.split("@")[0] || "Swiper",
      emailVerified: verified, image: profile.imageUrl || null, identityCheckedAt: new Date() });
    await tx.insert(schema.account).values({ id: sid("acc"), providerId: "clerk", accountId: profile.id, userId: localId });
    return localId;
  });
}

export async function syncClerkProfile(localId: string, user: IdentityProfile) {
  return db.transaction(async (tx) => {
    const disabled = user.banned || user.locked;
    const email = user.primaryEmailAddress;
    await tx.update(schema.user).set({
      ...(email ? { email: email.emailAddress.toLowerCase(), emailVerified: email.verification?.status === "verified" } : {}),
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
