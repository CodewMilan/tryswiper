import { eq, and, isNull } from "drizzle-orm";
import { schema } from "@swiper/db";
import { db } from "./db";
import { hashMcpKey } from "./ids";
import { auth } from "./auth";
import { ensureWorkspace } from "./workspace";

export type AuthContext = {
  userId: string;
  workspaceId: string;
  source: "session" | "api_key";
};

async function verifyMembership(request: Request, userId: string, workspaceId: string) {
  const [member] = await db.select({ role: schema.membership.role }).from(schema.membership)
    .where(and(eq(schema.membership.userId, userId), eq(schema.membership.workspaceId, workspaceId))).limit(1);
  if (!member) throw Object.assign(new Error("Workspace access denied"), { status: 403, code: "FORBIDDEN" });
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !["owner", "admin", "editor"].includes(member.role)) {
    throw Object.assign(new Error("You need editor access to make changes."), { status: 403, code: "READ_ONLY" });
  }
}

export async function requireAuth(request: Request): Promise<AuthContext> {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    const keyHash = hashMcpKey(token);
    const rows = await db
      .select({
        userId: schema.mcpKey.userId,
        workspaceId: schema.mcpKey.workspaceId,
        id: schema.mcpKey.id,
      })
      .from(schema.mcpKey)
      .where(and(eq(schema.mcpKey.keyHash, keyHash), isNull(schema.mcpKey.revokedAt)))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw Object.assign(new Error("Invalid API key"), { status: 401, code: "UNAUTHORIZED" });
    }
    await verifyMembership(request, row.userId, row.workspaceId);
    await db
      .update(schema.mcpKey)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.mcpKey.id, row.id));
    return { userId: row.userId, workspaceId: row.workspaceId, source: "api_key" };
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    throw Object.assign(new Error("Sign in required"), { status: 401, code: "UNAUTHORIZED" });
  }

  const workspaceId = await ensureWorkspace(session.user.id, session.user.name);
  await verifyMembership(request, session.user.id, workspaceId);
  return {
    userId: session.user.id,
    workspaceId,
    source: "session",
  };
}
