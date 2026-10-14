import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { fromUnknownError, json } from "@/lib/http";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request); const { id } = await context.params;
    return await db.transaction(async (tx) => {
      await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, auth.workspaceId)).for("no key update");
      const [deleted] = await tx.delete(schema.workspaceFormat).where(and(eq(schema.workspaceFormat.id, id), eq(schema.workspaceFormat.workspaceId, auth.workspaceId))).returning({ id: schema.workspaceFormat.id });
      if (!deleted) throw Object.assign(new Error("Saved format not found."), { status: 404, code: "NOT_FOUND" });
      return json({ format_id: id, deleted: true, note: "Existing carousel copies remain editable." });
    });
  } catch (error) { return fromUnknownError(error); }
}
