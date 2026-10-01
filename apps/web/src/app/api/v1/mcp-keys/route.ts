import { desc, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { fromUnknownError, json } from "@/lib/http";
import { createMcpKey, sid } from "@/lib/ids";

export async function GET(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const keys = await db
      .select({
        id: schema.mcpKey.id,
        name: schema.mcpKey.name,
        keyPrefix: schema.mcpKey.keyPrefix,
        lastUsedAt: schema.mcpKey.lastUsedAt,
        createdAt: schema.mcpKey.createdAt,
        revokedAt: schema.mcpKey.revokedAt,
      })
      .from(schema.mcpKey)
      .where(eq(schema.mcpKey.workspaceId, authContext.workspaceId))
      .orderBy(desc(schema.mcpKey.createdAt));
    return json({ keys });
  } catch (error) {
    return fromUnknownError(error);
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await requireAuth(request);
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    const minted = createMcpKey();
    await db.insert(schema.mcpKey).values({
      id: sid("key"),
      workspaceId: authContext.workspaceId,
      userId: authContext.userId,
      name: body.name?.trim() || "Cursor",
      keyHash: minted.keyHash,
      keyPrefix: minted.keyPrefix,
    });
    return json({
      key: minted.key,
      prefix: minted.keyPrefix,
      warning: "Copy this key now. Swiper will not show it again.",
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
