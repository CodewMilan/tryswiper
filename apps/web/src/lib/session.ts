import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { schema } from "@swiper/db";
import { clerkConfigured, E2E_COOKIE, e2eEnabled, isE2eUserId } from "./auth-env";
import { db } from "./db";
import { ensureWorkspace } from "./workspace";
import { linkClerkProfile, syncClerkProfile } from "@/server/identity";

async function localUserForClerk(clerkUserId: string) {
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) return null;
  const localId = await linkClerkProfile(clerkUser);
  if (!localId || !(await syncClerkProfile(localId, clerkUser))) return null;
  return { localId, name: clerkUser.fullName || clerkUser.primaryEmailAddress?.emailAddress.split("@")[0] || "Swiper" };
}

export async function getSessionUser() {
  const host = (await headers()).get("host");
  if (e2eEnabled(host)) {
    const userId = (await cookies()).get(E2E_COOKIE)?.value;
    if (!isE2eUserId(userId)) return null;
    const [row] = await db
      .select({ id: schema.user.id, name: schema.user.name, disabledAt: schema.user.disabledAt })
      .from(schema.user)
      .where(eq(schema.user.id, userId))
      .limit(1);
    if (!row || row.disabledAt) return null;
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
