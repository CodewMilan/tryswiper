import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/api-auth";
import { db, schema } from "@/lib/db";
import { fromUnknownError, json, readJson } from "@/lib/http";

const detailsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(240).optional(),
}).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(request);
    const { id } = await context.params;
    const parsed = detailsSchema.safeParse(await readJson(request));
    if (!parsed.success) throw Object.assign(new Error("Use a name of 2–80 characters and a description of up to 240 characters."), { status: 400, code: "INVALID_FORMAT_DETAILS" });
    return await db.transaction(async (tx) => {
      // Serialize metadata changes with format creation/deletion in this workspace.
      await tx.select({ id: schema.workspace.id }).from(schema.workspace).where(eq(schema.workspace.id, auth.workspaceId)).for("no key update");
      const [existing] = await tx.select({ id: schema.workspaceFormat.id }).from(schema.workspaceFormat).where(and(eq(schema.workspaceFormat.id, id), eq(schema.workspaceFormat.workspaceId, auth.workspaceId))).limit(1);
      if (!existing) throw Object.assign(new Error("Saved format not found."), { status: 404, code: "NOT_FOUND" });
      const [duplicate] = await tx.select({ id: schema.workspaceFormat.id }).from(schema.workspaceFormat).where(and(eq(schema.workspaceFormat.workspaceId, auth.workspaceId), eq(schema.workspaceFormat.name, parsed.data.name), ne(schema.workspaceFormat.id, id))).limit(1);
      if (duplicate) throw Object.assign(new Error("A workspace format with this name already exists."), { status: 409, code: "FORMAT_NAME_TAKEN" });
      const [updated] = await tx.update(schema.workspaceFormat).set({ name: parsed.data.name, ...(parsed.data.description !== undefined ? { description: parsed.data.description || null } : {}), updatedAt: new Date() }).where(and(eq(schema.workspaceFormat.id, id), eq(schema.workspaceFormat.workspaceId, auth.workspaceId))).returning({ id: schema.workspaceFormat.id, name: schema.workspaceFormat.name, description: schema.workspaceFormat.description });
      return json({ format: updated });
    });
  } catch (error) { return fromUnknownError(error); }
}

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
