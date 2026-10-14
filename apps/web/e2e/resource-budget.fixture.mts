import assert from "node:assert/strict";
import { and, eq, sql } from "drizzle-orm";
import { createCanvas } from "@napi-rs/canvas";
import { db, schema } from "../src/lib/db";
import { withResourceBudget } from "../src/server/resource-budget";
import { imageDimensions } from "../src/lib/image-dimensions";
import { createDodoPortal } from "../src/lib/dodo";

const workspaceId = process.argv[2]!;
const priorFetch = globalThis.fetch;
const previousEnv = { key: process.env.DODO_PAYMENTS_API_KEY, product: process.env.DODO_PAYMENTS_PRODUCT_ID, secret: process.env.DODO_PAYMENTS_WEBHOOK_SECRET };
try {
  const canvas = createCanvas(120, 60);
  for (const mime of ["image/png", "image/jpeg", "image/webp"] as const) {
    const size = imageDimensions(mime === "image/png" ? canvas.toBuffer("image/png") : canvas.toBuffer(mime));
    assert.deepEqual(size, { width: 120, height: 60, mimeType: mime });
  }
  const releases: (() => void)[] = [];
  const entered: Promise<void>[] = [];
  const work = Array.from({ length: 2 }, () => {
    let signal!: () => void; entered.push(new Promise<void>((resolve) => { signal = resolve; }));
    return withResourceBudget(workspaceId, "render", async () => { signal(); await new Promise<void>((resolve) => releases.push(resolve)); });
  });
  await Promise.all(entered);
  await assert.rejects(withResourceBudget(workspaceId, "render", async () => {}), (error: unknown) => (error as { code: string }).code === "RESOURCE_BUSY");
  releases.forEach((release) => release()); await Promise.all(work);
  await assert.rejects(withResourceBudget(workspaceId, "render", async () => { throw new Error("Failed render"); }), /Failed render/);
  const [leases] = await db.execute(sql`select count(*) as count from operation_lease where workspace_id=${workspaceId}`);
  assert.equal(Number(leases!.count), 0);
  await db.insert(schema.operationLease).values({ id: `lease_expired_${workspaceId}`, workspaceId, kind: "render", expiresAt: new Date(Date.now() - 1000) });
  await withResourceBudget(workspaceId, "render", async () => {});
  await db.update(schema.resourceWindow).set({ startedAt: new Date(Math.floor(Date.now() / 60000) * 60000), requests: 30 }).where(and(eq(schema.resourceWindow.workspaceId, workspaceId), eq(schema.resourceWindow.kind, "render")));
  await assert.rejects(withResourceBudget(workspaceId, "render", async () => {}), (error: unknown) => (error as { code: string }).code === "RATE_LIMIT");
  await db.delete(schema.resourceWindow).where(eq(schema.resourceWindow.workspaceId, workspaceId));

  process.env.DODO_PAYMENTS_API_KEY = "fixture_only"; process.env.DODO_PAYMENTS_PRODUCT_ID = "fixture_product"; process.env.DODO_PAYMENTS_WEBHOOK_SECRET = "fixture_secret";
  globalThis.fetch = async (url, init) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, "/customers/customer_fixture/customer-portal/session");
    assert.equal(parsed.searchParams.get("send_email"), "false");
    assert.ok(parsed.searchParams.get("return_url")?.endsWith("/pricing"));
    assert.equal(init?.method, "POST");
    assert.ok(init?.signal);
    return Response.json({ link: "https://billing.example.test/customer-fixture" });
  };
  assert.equal(await createDodoPortal("customer_fixture"), "https://billing.example.test/customer-fixture");
  globalThis.fetch = async () => Response.json({ link: "http://insecure.example.test" });
  await assert.rejects(createDodoPortal("customer_fixture"), /Could not open/);
  console.log("Image headers, distributed concurrency/rate recovery, and portal-provider contract passed.");
} finally {
  globalThis.fetch = priorFetch;
  for (const [name, value] of Object.entries({ DODO_PAYMENTS_API_KEY: previousEnv.key, DODO_PAYMENTS_PRODUCT_ID: previousEnv.product, DODO_PAYMENTS_WEBHOOK_SECRET: previousEnv.secret })) if (value === undefined) delete process.env[name]; else process.env[name] = value;
  await db.$client.end();
}
