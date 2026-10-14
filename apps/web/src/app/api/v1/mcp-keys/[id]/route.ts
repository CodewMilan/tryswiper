import { and, eq, isNull } from "drizzle-orm";
import { requireAccountManagement } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { apiError, fromUnknownError, json } from "@/lib/http";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authContext = await requireAccountManagement(request);
    const { id } = await context.params;
    const [revoked] = await db
      .update(schema.mcpKey)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(schema.mcpKey.id, id),
          eq(schema.mcpKey.workspaceId, authContext.workspaceId),
          isNull(schema.mcpKey.revokedAt),
        ),
      )
      .returning({ id: schema.mcpKey.id });
    if (!revoked) return apiError("NOT_FOUND", "That active key was not found.", 404);
    return json({ id: revoked.id, revoked: true });
  } catch (error) {
    return fromUnknownError(error);
  }
}
