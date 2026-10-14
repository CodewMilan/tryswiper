import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { ensureWorkspace } from "../src/lib/workspace";
import { linkClerkProfile } from "../src/server/identity";

const userId = process.argv[2]!;
try {
  const [person] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
  assert.equal(person!.name, "Editor QA");
  assert.match(person!.email, /^swiper-qa-/);
  const clerkId = `user_provision_${crypto.randomUUID()}`;
  const profile = { id: clerkId, fullName: "Editor QA", imageUrl: "", banned: false, locked: false,
    primaryEmailAddress: { emailAddress: person!.email.toUpperCase(), verification: { status: "verified" } } } as Parameters<typeof linkClerkProfile>[0];
  const links = await Promise.all(Array.from({ length: 6 }, () => linkClerkProfile(profile)));
  assert.deepEqual(new Set(links), new Set([userId]));
  const accounts = await db.select().from(schema.account).where(eq(schema.account.accountId, clerkId));
  assert.equal(accounts.length, 1);
  await db.delete(schema.workspace).where(eq(schema.workspace.ownerId, userId));
  const workspaces = await Promise.all(Array.from({ length: 6 }, () => ensureWorkspace(userId, "Editor QA")));
  assert.equal(new Set(workspaces).size, 1);
  const workspaceId = workspaces[0]!;
  assert.equal((await db.select().from(schema.brand).where(eq(schema.brand.workspaceId, workspaceId))).length, 1);
  // Recover the partial state an older provisioning attempt could leave behind.
  await db.delete(schema.brand).where(eq(schema.brand.workspaceId, workspaceId));
  assert.equal(await ensureWorkspace(userId, "Editor QA"), workspaceId);
  assert.equal((await db.select().from(schema.brand).where(eq(schema.brand.workspaceId, workspaceId))).length, 1);
  await assert.rejects(linkClerkProfile({ ...profile, id: `user_unverified_${crypto.randomUUID()}`, primaryEmailAddress: {
    ...profile.primaryEmailAddress!, verification: { ...profile.primaryEmailAddress!.verification!, status: "unverified" },
  } }), (error: unknown) => (error as { code: string }).code === "EMAIL_VERIFICATION_REQUIRED");
} finally { await db.$client.end(); }
