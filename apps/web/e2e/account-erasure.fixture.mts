import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/lib/db";
import { eraseAccountContent, finishAccountErasure } from "../src/server/account-erasure";
import { ensureWorkspace } from "../src/lib/workspace";
import { syncClerkProfile } from "../src/server/identity";

const userId = process.argv[2]!;
const [workspace] = await db.select().from(schema.workspace).where(eq(schema.workspace.ownerId, userId));
assert.ok(workspace);
const subscriptionId = `sub_erasure_${crypto.randomUUID()}`;
await db.insert(schema.billing).values({ workspaceId: workspace.id, plan: "pro", status: "active", dodoSubscriptionId: subscriptionId }).onConflictDoUpdate({ target: schema.billing.workspaceId, set: { dodoSubscriptionId: subscriptionId, plan: "pro", status: "active" } });
process.env.DODO_PAYMENTS_API_KEY = "erasure_fixture_never_charge";
process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
const originalFetch = globalThis.fetch;
let unavailable = true;
let status = "active";
let mutations = 0;
globalThis.fetch = async (url, init) => {
  assert.equal(String(url), `https://test.dodopayments.com/subscriptions/${subscriptionId}`);
  if (init?.method === "PATCH") {
    mutations += 1;
    assert.deepEqual(JSON.parse(String(init.body)), { status: "cancelled" });
    if (unavailable) return Response.json({ message: "Temporary outage" }, { status: 503 });
    status = "cancelled";
  }
  return Response.json({ subscription_id: subscriptionId, status });
};
try {
  await eraseAccountContent(userId);
  await assert.rejects(finishAccountErasure(userId), (error: unknown) => (error as { code?: string }).code === "CANCELLATION_PENDING");
  assert.equal((await db.select().from(schema.workspace).where(eq(schema.workspace.ownerId, userId))).length, 0);
  const [pending] = await db.select().from(schema.accountErasure).where(eq(schema.accountErasure.userId, userId));
  assert.deepEqual(pending!.subscriptionIds, [subscriptionId]); assert.equal(pending!.completedAt, null);
  assert.equal(await syncClerkProfile(userId, { id: "old-provider-profile", fullName: "Old profile", primaryEmailAddress: null, imageUrl: "", banned: false, locked: false }, new Date(Date.now() + 60000)), false);
  await assert.rejects(ensureWorkspace(userId, "Must not recreate"));
  await assert.rejects(db.insert(schema.project).values({ id: `prj_${crypto.randomUUID()}`, workspaceId: workspace.id, name: "Late in-flight write", createdBy: userId }), (error: unknown) => (error as { cause?: { code?: string } }).cause?.code === "23503");
  unavailable = false;
  await Promise.all([finishAccountErasure(userId), finishAccountErasure(userId)]);
  await eraseAccountContent(userId);
  const [finished] = await db.select().from(schema.accountErasure).where(eq(schema.accountErasure.userId, userId));
  assert.deepEqual(finished!.subscriptionIds, []); assert.ok(finished!.completedAt);
  const previousMutations = mutations;
  await finishAccountErasure(userId);
  assert.equal(mutations, previousMutations);
} finally { globalThis.fetch = originalFetch; await db.$client.end(); }
