import { eq } from "drizzle-orm";
import { DEFAULT_THEME } from "@swiper/schema";
import { schema } from "@swiper/db";
import { db } from "./db";
import { sid } from "./ids";

export async function ensureWorkspace(userId: string, name: string) {
  return db.transaction(async (tx) => {
  const [person] = await tx.select({ id: schema.user.id, disabledAt: schema.user.disabledAt, deletedAt: schema.user.deletedAt }).from(schema.user).where(eq(schema.user.id, userId)).for("update");
  if (!person || person.disabledAt || person.deletedAt) throw Object.assign(new Error("Account not found."), { status: 404, code: "NOT_FOUND" });
  const existing = await tx
    .select()
    .from(schema.membership)
    .where(eq(schema.membership.userId, userId))
    .limit(1);
  if (existing[0]) {
    const [brand] = await tx.select({ id: schema.brand.id }).from(schema.brand).where(eq(schema.brand.workspaceId, existing[0].workspaceId)).limit(1);
    if (!brand) await tx.insert(schema.brand).values({ id: sid("brd"), workspaceId: existing[0].workspaceId, name: name || "Untitled product" });
    return existing[0].workspaceId;
  }

  const workspaceId = sid("ws");
  const brandId = sid("brd");
  await tx.insert(schema.workspace).values({
    id: workspaceId,
    name: name ? `${name}'s workspace` : "Workspace",
    ownerId: userId,
  });
  await tx.insert(schema.membership).values({
    id: sid("mem"),
    workspaceId,
    userId,
    role: "owner",
  });
  await tx.insert(schema.brand).values({
    id: brandId,
    workspaceId,
    name: name || "Untitled product",
    colors: {
      background: DEFAULT_THEME.background,
      primary: DEFAULT_THEME.primary,
      secondary: DEFAULT_THEME.secondary,
      accent: DEFAULT_THEME.accent,
    },
    fonts: { heading: DEFAULT_THEME.fontFamily, body: DEFAULT_THEME.fontFamily },
  });
  return workspaceId;
  });
}

export async function getWorkspaceBrand(workspaceId: string) {
  const rows = await db
    .select()
    .from(schema.brand)
    .where(eq(schema.brand.workspaceId, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}
