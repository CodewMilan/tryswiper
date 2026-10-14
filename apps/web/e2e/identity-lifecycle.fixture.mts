import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db, schema } from "../src/lib/db";
import { sid } from "../src/lib/ids";

const localId = process.argv[2]!;
const clerkId = `user_identity_${crypto.randomUUID()}`;
const [original] = await db.select().from(schema.user).where(eq(schema.user.id, localId));
await db.insert(schema.account).values({ id: sid("acc"), providerId: "clerk", accountId: clerkId, userId: localId });
const oldFetch = globalThis.fetch;
let banned = false; let deleted = false;
globalThis.fetch = async () => deleted ? Response.json({ errors: [{ code: "resource_not_found", message: "User not found" }] }, { status: 404 }) : Response.json({
  id: clerkId, object: "user", first_name: "Renamed", last_name: "QA", image_url: "https://example.test/profile.png", banned, locked: false,
  primary_email_address_id: "email_test", email_addresses: [{ id: "email_test", object: "email_address", email_address: `swiper-qa-${crypto.randomUUID()}@example.test`, verification: { status: "verified", strategy: "email_code" }, linked_to: [] }],
  phone_numbers: [], web3_wallets: [], external_accounts: [], public_metadata: {}, private_metadata: {}, unsafe_metadata: {}, created_at: Date.now(), updated_at: Date.now(),
});
try {
  // Clerk captures its fetch implementation at import time.
  const { assertActiveIdentity, refreshClerkIdentity } = await import("../src/server/identity");
  const { POST } = await import("../src/app/api/webhooks/clerk/route");
  await assertActiveIdentity(localId);
  const [updated] = await db.select().from(schema.user).where(eq(schema.user.id, localId));
  assert.equal(updated!.name, "Renamed QA"); assert.equal(updated!.emailVerified, true); assert.notEqual(updated!.email, original!.email);
  banned = true;
  assert.equal(await refreshClerkIdentity(clerkId), false);
  assert.ok((await db.select().from(schema.user).where(eq(schema.user.id, localId)))[0]!.disabledAt);
  assert.ok((await db.select().from(schema.mcpKey).where(eq(schema.mcpKey.userId, localId))).every((key) => key.revokedAt));
  await assert.rejects(assertActiveIdentity(localId), (error: unknown) => (error as { code: string }).code === "ACCOUNT_DISABLED");
  banned = false;
  assert.equal(await refreshClerkIdentity(clerkId), true);
  // Re-enabling the account must not re-enable previously revoked content keys.
  assert.ok((await db.select().from(schema.mcpKey).where(eq(schema.mcpKey.userId, localId))).every((key) => key.revokedAt));
  const secret = "identity-test-signature-only";
  process.env.CLERK_WEBHOOK_SIGNING_SECRET = `whsec_${Buffer.from(secret).toString("base64")}`;
  const body = JSON.stringify({ object: "event", type: "user.deleted", data: { object: "user", deleted: true, id: clerkId }, timestamp: Date.now() });
  const messageId = `msg_${crypto.randomUUID()}`; const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", Buffer.from(secret)).update(`${messageId}.${timestamp}.${body}`).digest("base64");
  const headers = { "svix-id": messageId, "svix-timestamp": timestamp, "svix-signature": "v1,invalid" };
  assert.equal((await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST", headers, body }))).status, 401);
  headers["svix-signature"] = `v1,${signature}`;
  assert.equal((await POST(new NextRequest("http://localhost/api/webhooks/clerk", { method: "POST", headers, body }))).status, 200);
  deleted = true;
  assert.equal(await refreshClerkIdentity(clerkId), false);
  await assert.rejects(assertActiveIdentity(localId), (error: unknown) => (error as { code: string }).code === "ACCOUNT_DISABLED");
} finally {
  globalThis.fetch = oldFetch;
  await db.update(schema.user).set({ name: original!.name, email: original!.email }).where(eq(schema.user.id, localId));
  await db.$client.end();
}
