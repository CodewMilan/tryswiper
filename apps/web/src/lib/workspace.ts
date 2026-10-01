import { eq } from "drizzle-orm";
import { DEFAULT_THEME } from "@swiper/schema";
import { schema } from "@swiper/db";
import { db } from "./db";
import { sid } from "./ids";

export async function ensureWorkspace(userId: string, name: string) {
  const existing = await db
    .select()
    .from(schema.membership)
    .where(eq(schema.membership.userId, userId))
    .limit(1);
  if (existing[0]) {
    return existing[0].workspaceId;
  }

  const workspaceId = sid("ws");
  const brandId = sid("brd");
  await db.insert(schema.workspace).values({
    id: workspaceId,
    name: name ? `${name}'s workspace` : "Workspace",
    ownerId: userId,
  });
  await db.insert(schema.membership).values({
    id: sid("mem"),
    workspaceId,
    userId,
    role: "owner",
  });
  await db.insert(schema.brand).values({
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
}

export async function getWorkspaceBrand(workspaceId: string) {
  const rows = await db
    .select()
    .from(schema.brand)
    .where(eq(schema.brand.workspaceId, workspaceId))
    .limit(1);
  return rows[0] ?? null;
}
