import { desc, eq } from "drizzle-orm";
import { requireAccountManagement } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { apiError, fromUnknownError, json } from "@/lib/http";
import { createMcpKey, sid } from "@/lib/ids";

export async function GET(request: Request) {
  try {
    const authContext = await requireAccountManagement(request);
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
    const authContext = await requireAccountManagement(request);
    const body = (await request.json().catch(() => ({}))) as { name?: string };
    if (!body || (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80))) {
      return apiError("INVALID_KEY_NAME", "Agent key names must be between 1 and 80 characters.");
    }
    const minted = createMcpKey();
    const id = sid("key");
    await db.insert(schema.mcpKey).values({
      id,
      workspaceId: authContext.workspaceId,
      userId: authContext.userId,
      name: body.name?.trim() || "Cursor",
      keyHash: minted.keyHash,
      keyPrefix: minted.keyPrefix,
    });
    return json({
      id,
      key: minted.key,
      prefix: minted.keyPrefix,
      warning: "Copy this key now. Swiper will not show it again.",
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
