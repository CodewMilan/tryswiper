import { cookies, headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { schema } from "@swiper/db";
import { clerkConfigured, E2E_COOKIE, e2eEnabled, isE2eUserId } from "./auth-env";
import { db } from "./db";
import { sid } from "./ids";
import { ensureWorkspace } from "./workspace";

async function localUserForClerk(clerkUserId: string) {
  const [linked] = await db
    .select({ userId: schema.account.userId })
    .from(schema.account)
    .where(and(eq(schema.account.providerId, "clerk"), eq(schema.account.accountId, clerkUserId)))
    .limit(1);
  if (linked) return { localId: linked.userId, name: "" };

  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ?? `${clerkUserId}@users.swiper.invalid`;
  const name =
    clerkUser.fullName ||
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    email.split("@")[0] ||
    "Swiper";

  const [byEmail] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1);
  const localId = byEmail?.id ?? clerkUserId;
  if (!byEmail) {
    await db.insert(schema.user).values({
      id: localId,
      name,
      email,
      emailVerified: true,
      image: clerkUser.imageUrl || null,
    });
  }
  await db.insert(schema.account).values({
    id: sid("acc"),
    accountId: clerkUserId,
    providerId: "clerk",
    userId: localId,
  });
  return { localId, name };
}

export async function getSessionUser() {
  const host = (await headers()).get("host");
  if (e2eEnabled(host)) {
    const userId = (await cookies()).get(E2E_COOKIE)?.value;
    if (!isE2eUserId(userId)) return null;
    const [row] = await db
      .select({ id: schema.user.id, name: schema.user.name })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    if (!row) return null;
    const workspaceId = await ensureWorkspace(row.id, row.name);
    return { userId: row.id, workspaceId };
  }

  if (!clerkConfigured()) return null;
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) return null;

  const linked = await localUserForClerk(userId);
  if (!linked) return null;
  const workspaceId = await ensureWorkspace(linked.localId, linked.name);
  return { userId: linked.localId, workspaceId };
}
