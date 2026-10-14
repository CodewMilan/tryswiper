import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { createCanvas } from "@napi-rs/canvas";
import type { Carousel } from "@swiper/schema";
import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import postgres from "postgres";
import { cleanupTestUsers, testDatabaseUrl } from "./test-data";
import { referenceContext } from "../src/server/reference-post";
import { LOCAL_GENERATION_NOTICE, REFERENCE_FALLBACK_NOTICE, THIN_BRAND_NOTICE } from "../src/lib/generation-notices";
import { readFile } from "node:fs/promises";

const testUserIds: string[] = [];

async function mcp(request: APIRequestContext, key: string, method: string, params: unknown = {}) {
  const response = await request.post("/mcp", { headers: { Authorization: `Bearer ${key}`, Accept: "application/json, text/event-stream", "MCP-Protocol-Version": "2025-06-18" },
    data: { jsonrpc: "2.0", id: 1, method, params } });
  const text = await response.text();
  expect(response.ok(), text).toBeTruthy();
  return response.headers()["content-type"]?.includes("text/event-stream") ? JSON.parse(text.split("\n").find((line) => line.startsWith("data: "))!.slice(6)) : JSON.parse(text);
}

test.afterEach(async () => {
  await cleanupTestUsers(testUserIds.splice(0));
});

function fixtureImage(color: string) {
  const canvas = createCanvas(120, 60);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color; ctx.fillRect(0, 0, 120, 60);
  return { name: "test-image.png", mimeType: "image/png", buffer: canvas.toBuffer("image/png") };
}
async function signUp(request: APIRequestContext) {
  const response = await request.post("/api/auth/sign-up/email", {
    data: { name: "Editor QA", email: `swiper-qa-${crypto.randomUUID()}@example.test`, password: crypto.randomUUID() },
    headers: { Origin: "http://localhost:3101" },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  const body = await response.json() as { user: { id: string } };
  testUserIds.push(body.user.id);
  return body.user.id;
}
async function create(request: APIRequestContext, format = "freeform") {
  const response = await request.post("/api/v1/carousels", { data: { format_id: format, title: "A better way to tell your story" } });
  expect(response.status(), await response.text()).toBe(201);
  return await response.json() as { carousel_id: string; carousel: Carousel };
}
async function saved(page: Page) {
  await expect(page.getByText("All changes saved", { exact: true })).toBeVisible();
}
async function state(request: APIRequestContext, id: string) {
  return await (await request.get(`/api/v1/carousels/${id}`)).json() as { carousel: Carousel; version: number; undo_count: number };
}

test("brand visuals, manual creation, editor gestures, format reuse, and downloads", async ({ page }, testInfo) => {
  const request = page.request;
  await signUp(request);
  await page.goto("/brand");
  await page.locator("#color-background").fill("#F3EEE5");
  await page.locator("#color-primary").fill("#20352C");
  await page.locator("#font-heading").selectOption("Lora");
  await page.locator("#font-body").selectOption("IBM Plex Mono");
  await page.locator("#logo").setInputFiles(fixtureImage("#B64831"));
  await expect(page.getByRole("button", { name: "Replace", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save brand", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("#font-heading")).toHaveValue("Lora");
  await expect(page.locator("#color-background")).toHaveValue("#F3EEE5");
  await page.goto("/new");
  await page.getByRole("tab", { name: "Start by hand" }).click();
  await page.getByLabel("Carousel title", { exact: true }).fill("A better way to tell your story");
  await page.getByRole("button", { name: "Open in editor" }).click();
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  const id = page.url().split("/").at(-1)!;
  let current = await state(request, id);
  expect(current.carousel.theme.fontFamily).toBe("Lora");
  expect(current.carousel.theme.bodyFontFamily).toBe("IBM Plex Mono");
  expect(current.carousel.slides[0]!.elements.some((element) => element.type === "logo")).toBeTruthy();
  const headline = page.getByTestId("slide-canvas").getByRole("button", { name: "headline element", exact: true });
  await headline.click();
  await page.locator("#element-text").fill("Good stories deserve a better canvas.");
  await saved(page);
  const xBefore = Number(await page.locator("#box-x").inputValue());
  const bounds = (await headline.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down(); await page.mouse.move(bounds.x + bounds.width / 2 + 18, bounds.y + bounds.height / 2 + 18, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => Number(await page.locator("#box-x").inputValue())).toBeGreaterThan(xBefore);
  await saved(page);
  const wBefore = Number(await page.locator("#box-width").inputValue());
  const handle = page.getByRole("button", { name: "Resize right", exact: true });
  const hb = (await handle.boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down(); await page.mouse.move(hb.x - 20, hb.y + hb.height / 2, { steps: 6 }); await page.mouse.up();
  await expect.poll(async () => Number(await page.locator("#box-width").inputValue())).toBeLessThan(wBefore);
  await saved(page);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("#box-width")).toHaveValue(String(wBefore));
  await page.getByRole("button", { name: "Move hook later", exact: true }).click();
  await saved(page);
  current = await state(request, id);
  expect(current.carousel.slides[1]!.role).toBe("hook");
  await page.getByRole("button", { name: "Move hook earlier", exact: true }).click();
  await saved(page);
  await page.getByLabel("Add image file").setInputFiles(fixtureImage("#173FA3"));
  await expect(page.getByRole("button", { name: "Replace image", exact: true })).toBeVisible();
  await saved(page);
  await page.locator('aside[aria-label="Element properties"] input[type=file]').setInputFiles(fixtureImage("#D45935"));
  await expect(page.getByRole("button", { name: "Replace image", exact: true })).toBeEnabled();
  await saved(page);
  await page.reload();
  await expect(page.getByTestId("slide-canvas").getByText("Good stories deserve a better canvas.")).toBeVisible();
  await page.getByRole("button", { name: "More carousel options", exact: true }).click();
  await page.getByRole("button", { name: "Save as format", exact: true }).click();
  await page.getByLabel("Format name", { exact: true }).fill("Launch story");
  await page.getByRole("button", { name: "Save format", exact: true }).click();
  await expect(page.getByText("“Launch story” is ready. Use it under Start by hand on New carousel.")).toBeVisible();
  const source = await state(request, id);
  await page.goto("/new");
  await page.getByRole("tab", { name: "Start by hand" }).click();
  await page.getByText("Launch story", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /Launch story/ })).toBeChecked();
  await page.getByRole("button", { name: "Open in editor" }).click();
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  const copyId = page.url().split("/").at(-1)!;
  const copy = await state(request, copyId);
  expect(copyId).not.toBe(id);
  expect(copy.carousel.slides[0]!.id).not.toBe(source.carousel.slides[0]!.id);
  expect(copy.carousel.slides[0]!.elements[0]!.id).not.toBe(source.carousel.slides[0]!.elements[0]!.id);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  for (const name of ["PNG images", "PDF document"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: new RegExp(name) }).click();
    const file = await download;
    expect(await file.failure()).toBeNull();
    await file.saveAs(testInfo.outputPath(file.suggestedFilename()));
    if (name === "PNG images") await page.getByRole("button", { name: "Export", exact: true }).click();
  }
  for (const width of [1440, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByTestId("slide-canvas")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true });
  }
});

test("pending edits survive refresh and saves reject stale or unauthorized writes", async ({ page, browser }) => {
  const request = page.request;
  await signUp(request);
  const { carousel_id: id } = await create(request);
  await page.goto(`/c/${id}`);
  await page.getByTestId("slide-canvas").getByRole("button", { name: "headline element", exact: true }).click();
  await page.route(`**/api/v1/carousels/${id}`, async (route) => {
    if (route.request().method() === "PATCH") await route.abort(); else await route.continue();
  });
  await page.locator("#element-text").fill("This draft survives a failed network request.");
  await page.reload();
  await expect(page.getByTestId("slide-canvas").getByText("This draft survives a failed network request.")).toBeVisible();
  await page.unroute(`**/api/v1/carousels/${id}`);
  await expect.poll(async () => (await state(request, id)).carousel.slides[0]!.elements.find((e) => e.role === "headline")!.text, { timeout: 20000 }).toBe("This draft survives a failed network request.");
  const initial = await state(request, id);
  const mutation = crypto.randomUUID();
  const payload = { expected_version: initial.version, mutation_id: mutation, operations: [{ op: "rename", title: "A safe retry" }] };
  const first = await request.patch(`/api/v1/carousels/${id}`, { data: payload });
  expect(first.status()).toBe(200);
  const retry = await request.patch(`/api/v1/carousels/${id}`, { data: payload });
  expect(retry.status()).toBe(200);
  expect((await retry.json()).version).toBe(initial.version + 1);
  const stale = await request.patch(`/api/v1/carousels/${id}`, { data: { ...payload, mutation_id: crypto.randomUUID() } });
  expect(stale.status()).toBe(409);
  const savedFormat = await request.post("/api/v1/formats", { data: { carousel_id: id, name: "Private format" } });
  expect(savedFormat.status()).toBe(201);
  const fmt = (await savedFormat.json()).format.id;
  const other = await browser.newContext({ baseURL: "http://localhost:3101" });
  await signUp(other.request);
  expect((await other.request.get(`/api/v1/carousels/${id}`)).status()).toBe(404);
  expect((await other.request.get(`/api/v1/carousels/${id}/export?format=png`)).status()).toBe(404);
  expect((await other.request.post("/api/v1/carousels", { data: { format_id: fmt } })).status()).toBe(400);
  expect((await other.request.post("/api/v1/formats", { data: { carousel_id: id, name: "Stolen" } })).status()).toBe(404);
  await other.close();
});

test("library, web generation, key revocation, plan gates, and branded 404", async ({ page }) => {
  const request = page.request;
  await signUp(request);

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Your carousels" })).toBeVisible();
  await expect(page.getByText("Turn one sentence into an editable carousel.")).toBeVisible();

  await page.goto("/new");
  await expect(page.getByText("Your brand kit is incomplete")).toBeVisible();
  await page.getByLabel("What should this carousel say?").fill("Explain why a product brief should become an editable carousel before it gets published.");
  await page.getByRole("button", { name: "Generate carousel" }).click();
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  await expect(page.getByText(LOCAL_GENERATION_NOTICE)).toBeVisible();
  await expect(page.getByText(THIN_BRAND_NOTICE)).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").at(-1)!;

  await page.getByRole("link", { name: "Back to library" }).click();
  await expect(page.getByRole("link", { name: /Explain why a product brief/ })).toBeVisible();

  const minted = await request.post("/api/v1/mcp-keys", { data: { name: "Test agent" } });
  expect(minted.status()).toBe(200);
  const key = await minted.json() as { id: string };
  expect((await request.delete(`/api/v1/mcp-keys/${key.id}`)).status()).toBe(200);
  const keys = await (await request.get("/api/v1/mcp-keys")).json() as { keys: { id: string; revokedAt: string | null }[] };
  expect(keys.keys.find((item) => item.id === key.id)?.revokedAt).not.toBeNull();

  expect((await request.get(`/api/v1/carousels/${id}/export?format=jpg`)).status()).toBe(403);
  expect((await request.post(`/api/v1/carousels/${id}/publish`, { headers: { "Idempotency-Key": crypto.randomUUID() } })).status()).toBe(403);

  await page.goto("/a-page-that-does-not-exist");
  await expect(page.getByRole("heading", { name: "This page is not in the deck." })).toBeVisible();
});

test("landing copy and generate mode follow the web creation path", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").getByRole("link", { name: "Start for free", exact: true }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByText("Generate an editable carousel from a brief right here on the web.", { exact: false })).toBeVisible();

  await signUp(page.request);
  await page.goto("/");
  await expect(page.locator("main").getByRole("link", { name: "New carousel", exact: true }).first()).toHaveAttribute("href", "/new");
  await expect(page.locator("main").getByRole("link", { name: "Start for free", exact: true })).toHaveCount(0);

  await page.goto("/new");
  await expect(page.getByLabel("Story shape", { exact: true })).toHaveValue("problem-insight-product");
  await expect(page.getByText("Blank canvas", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Your workspace formats", { exact: true })).toHaveCount(0);
  await expect(page.locator("#story-shape option[value=freeform]")).toHaveCount(0);
  await page.getByLabel("Story shape", { exact: true }).selectOption("before-after");
  await page.getByRole("tab", { name: "Start by hand", exact: true }).click();
  await expect(page.getByRole("radio", { name: /Start by hand/ })).toBeChecked();
  await page.getByRole("tab", { name: "Generate from a brief", exact: true }).click();
  await expect(page.getByLabel("Story shape", { exact: true })).toHaveValue("before-after");
  await expect(page.getByText("Blank canvas", { exact: true })).toHaveCount(0);
});

test("confirmed deletion releases quota, preserves formats, and rejects other workspaces", async ({ page, browser }) => {
  const request = page.request;
  const userId = await signUp(request);
  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });
  try {
    const { carousel_id: oldId } = await create(request);
    const generated = await request.post("/api/v1/carousels", {
      data: { format_id: "problem-insight-product", brief: "Explain why a product brief should become a draft people can edit.", title: "A better way to tell your story" },
    });
    expect(generated.status()).toBe(201);
    const { carousel_id: id } = await generated.json() as { carousel_id: string };
    // An older draft must never release one of this month's slots.
    await sql`update carousel set created_at = date_trunc('month', now() at time zone 'UTC') - interval '1 day' where id = ${oldId}`;
    for (let index = 0; index < 4; index++) await create(request);
    const billing = async () => await (await request.get("/api/v1/billing")).json() as { usage: { carousel: number; generation?: number } };
    expect((await billing()).usage.carousel).toBe(5);
    expect((await billing()).usage.generation ?? 0).toBe(0);
    const full = await request.post("/api/v1/carousels", { data: { format_id: "freeform" } });
    expect(full.status()).toBe(429);

    const other = await browser.newContext({ baseURL: "http://localhost:3101" });
    try {
      await signUp(other.request);
      expect((await other.request.delete(`/api/v1/carousels/${id}`)).status()).toBe(404);
      expect((await request.get(`/api/v1/carousels/${id}`)).status()).toBe(200);
    } finally {
      await other.close();
    }

    const savedFormat = await request.post("/api/v1/formats", { data: { carousel_id: id, name: "Surviving format" } });
    expect(savedFormat.status()).toBe(201);
    const { format } = await savedFormat.json() as { format: { id: string } };

    await page.goto("/library");
    await expect(page.getByRole("region", { name: "Monthly allowance" })).toContainText("0 of 5 carousels remaining");
    await expect(page.getByRole("region", { name: "Monthly allowance" })).toContainText("10 of 10 AI generations remaining");
    await page.getByRole("button", { name: "Delete A better way to tell your story", exact: true }).first().click();
    await expect(page.getByRole("dialog", { name: "Delete this carousel?" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    expect((await billing()).usage.carousel).toBe(5);

    expect((await request.delete(`/api/v1/carousels/${oldId}`)).status()).toBe(200);
    expect((await billing()).usage.carousel).toBe(5);
    // Give the chosen draft a distinct title so the confirmation is unambiguous.
    await request.patch(`/api/v1/carousels/${id}`, { data: { operations: [{ op: "rename", title: "Draft to discard" }] } });
    await page.reload();
    await page.getByRole("button", { name: "Delete Draft to discard", exact: true }).click();
    await page.getByRole("button", { name: "Delete carousel", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Draft to discard/ })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Monthly allowance" })).toContainText("1 of 5 carousels remaining");
    expect((await billing()).usage.carousel).toBe(4);
    expect((await billing()).usage.generation ?? 0).toBe(0);
    expect((await request.get(`/api/v1/carousels/${id}`)).status()).toBe(404);
    expect((await request.delete(`/api/v1/carousels/${id}`)).status()).toBe(404);
    expect((await billing()).usage.carousel).toBe(4);
    await create(request, format.id);
    expect((await billing()).usage.carousel).toBe(5);

    const [{ remaining }] = await sql<{ remaining: number }[]>`
      select count(*)::int as remaining from carousel c
      join project p on p.id = c.project_id
      join workspace w on w.id = p.workspace_id where w.owner_id = ${userId}
    `;
    expect(remaining).toBe(5);
  } finally {
    await sql.end();
  }
});

test("Connect keeps one-time-secret setup templates after refresh", async ({ page }) => {
  await signUp(page.request);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/connect");
  await expect(page.getByRole("heading", { name: "Mint a key to connect your agent" })).toBeVisible();
  const minted = page.waitForResponse((response) => response.url().endsWith("/api/v1/mcp-keys") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Mint API key", exact: true }).click();
  const { key } = await (await minted).json() as { key: string };
  await expect(page.getByLabel("New key", { exact: true })).toHaveValue(key);
  await page.getByRole("tab", { name: "ChatGPT", exact: true }).click();
  const chatgpt = page.locator("section").filter({ has: page.getByRole("heading", { name: "ChatGPT", exact: true }) });
  await expect(chatgpt).toContainText("Keep this URL private: the ?key= value is your secret.");
  await chatgpt.getByRole("button", { name: "Copy ChatGPT URL", exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`http://localhost:3101/mcp?key=${encodeURIComponent(key)}`);
  await page.getByRole("tab", { name: "Cursor", exact: true }).click();
  await expect(page.getByRole("link", { name: "Add to Cursor", exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Mint a new key", exact: true })).toBeVisible();
  await expect(page.getByText(/its secret was shown only once/)).toBeVisible();
  await expect(page.getByLabel("New key", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Add to Cursor", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Cursor", exact: true }).click();
  const cursor = page.locator("section").filter({ has: page.getByRole("heading", { name: "Cursor", exact: true }) });
  await expect(cursor.locator("pre")).toContainText("http://localhost:3101/mcp");
  await expect(cursor.locator("pre")).toContainText("Authorization");
  await expect(cursor.locator("pre")).toContainText("YOUR_SAVED_KEY");
  await expect(page.locator("main")).not.toContainText(key);
  await cursor.getByRole("button", { name: "Copy Cursor template", exact: true }).click();
  const template = JSON.parse(await page.evaluate(() => navigator.clipboard.readText())) as { mcpServers: { swiper: { headers: { Authorization: string } } } };
  expect(template.mcpServers.swiper.headers.Authorization).toBe("Bearer YOUR_SAVED_KEY");
  await page.getByRole("tab", { name: "ChatGPT", exact: true }).click();
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(chatgpt.getByRole("button", { name: "Copy ChatGPT URL template", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  }
  await page.getByRole("button", { name: "Mint a new key", exact: true }).click();
  await expect(page.getByLabel("New key", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Revoke", exact: true }).last().click();
  await page.getByRole("button", { name: "Revoke key", exact: true }).click();
  await expect(page.getByRole("button", { name: "Revoke", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await page.getByRole("button", { name: "Revoke key", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mint a key to connect your agent" })).toBeVisible();
});

test("Export includes Free quality checks and Pro JPG without a separate preparation upsell", async ({ page }) => {
  await signUp(page.request);
  const { carousel_id: id } = await create(page.request);
  await page.goto(`/c/${id}`);
  await page.getByRole("button", { name: "More carousel options", exact: true }).click();
  await expect(page.getByRole("button", { name: "Prepare files", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ready to share", exact: true });
  await expect(dialog.getByRole("button", { name: "Check carousel", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "PNG images", exact: false })).toBeVisible();
  await page.route("**/api/v1/billing", (route) => route.fulfill({ json: { plan: "pro", usage: {}, limits: { carousel: 100, generation: 250, export: 1000, publish: 100, jpg: true } } }));
  await page.reload();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "JPG images · Pro", exact: false })).toBeVisible();
});

test("monthly allowances guide creation and usage errors preserve the brief", async ({ page }) => {
  await signUp(page.request);
  const limits = { carousel: 5, generation: 10, export: 20, publish: 0, jpg: false };
  let usage = { carousel: 2, generation: 10 };
  await page.route("**/api/v1/billing", (route) => route.fulfill({ json: { plan: "free", usage, limits } }));
  await page.goto("/library");
  await expect(page.getByRole("region", { name: "Monthly allowance" })).toContainText("3 of 5 carousels remaining");
  await page.goto("/new");
  await expect(page.getByRole("region", { name: "Monthly allowance" })).toContainText("0 of 10 AI generations remaining");
  const brief = "Explain how a concise brief becomes a useful editable draft.";
  await page.getByLabel("What should this carousel say?").fill(brief);
  await expect(page.getByRole("button", { name: "Generate carousel", exact: true })).toBeDisabled();
  await expect(page.getByText(/Start by hand without an AI generation/)).toBeVisible();
  await page.getByRole("tab", { name: "Start by hand", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open in editor", exact: true })).toBeEnabled();

  usage = { carousel: 5, generation: 0 };
  await page.reload();
  await expect(page.getByText(/Delete a carousel created this month to free a slot/)).toBeVisible();
  await page.getByRole("tab", { name: "Start by hand", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open in editor", exact: true })).toBeDisabled();

  usage = { carousel: 0, generation: 0 };
  await page.reload();
  await expect(page.getByText("Your unfinished brief was restored in this tab.")).toBeVisible();
  await page.getByRole("tab", { name: "Generate from a brief", exact: true }).click();
  await page.getByLabel("What should this carousel say?").fill(brief);
  await page.route("**/api/v1/carousels", (route) => route.fulfill({ status: 429, json: { code: "USAGE_LIMIT", message: "Raw server message", details: { kind: "generation", used: 10, limit: 10, plan: "free" } } }));
  await page.getByRole("button", { name: "Generate carousel", exact: true }).click();
  const error = page.getByRole("alert").filter({ hasText: "You’ve used all 10 AI generations" });
  await expect(error).toBeVisible();
  await expect(error).toContainText("first of next month (UTC)");
  await expect(error.getByRole("link", { name: "View plans and limits" })).toHaveAttribute("href", "/pricing");
  await expect(page.getByLabel("What should this carousel say?")).toHaveValue(brief);
});

test("404 recovery links respect guest and signed-in sessions", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");
  const main = page.locator("main");
  await expect(main.getByRole("link", { name: "Start for free", exact: true })).toHaveAttribute("href", "/signup");
  await expect(main.getByRole("link", { name: "Go home", exact: true })).toHaveAttribute("href", "/");
  await expect(main.getByRole("link", { name: "Open library", exact: true })).toHaveCount(0);
  await signUp(page.request);
  await page.reload();
  await expect(main.getByRole("link", { name: "Open library", exact: true })).toHaveAttribute("href", "/library");
  await expect(main.getByRole("link", { name: "Start for free", exact: true })).toHaveCount(0);
});

test("new carousel cards and editor overflow match the light workspace", async ({ page }, testInfo) => {
  await signUp(page.request);
  await page.goto("/new");
  await page.getByRole("tab", { name: "Start by hand", exact: true }).click();
  const cards = page.locator("label:has(input[name=format])");
  await expect(cards.first()).toBeVisible();
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const styles = await cards.evaluateAll((elements) => elements.map((element) => {
      const style = getComputedStyle(element);
      return { radius: style.borderRadius, shadow: style.boxShadow, background: style.backgroundColor };
    }));
    expect(styles.length).toBeGreaterThan(1);
    for (const style of styles) expect(style).toEqual({ radius: "24px", shadow: "none", background: "rgb(255, 255, 255)" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`new-${width}.png`) });
  }
  await page.getByRole("button", { name: "Open in editor", exact: true }).click();
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  const header = page.locator("header.editor-header");
  const more = header.getByRole("button", { name: "More carousel options", exact: true });
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(header.getByRole("link", { name: "Back to library", exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
    await expect(header.getByRole("button", { name: "Export", exact: true })).toBeVisible();
    expect((await header.boundingBox())!.height).toBeLessThanOrEqual(80);
    await expect(header.getByRole("button", { name: "Save as format", exact: true })).toHaveCount(0);
    await expect(header.getByRole("button", { name: "Prepare files", exact: true })).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Workspace", exact: true })).toHaveCount(0);
    await more.focus();
    await page.keyboard.press("Enter");
    const options = page.getByRole("region", { name: "Carousel options", exact: true });
    await expect(options.getByRole("button", { name: "Save as format", exact: true })).toBeVisible();
    await expect(options.getByRole("button", { name: "Prepare files", exact: true })).toHaveCount(0);
    await expect(options.getByRole("link", { name: "Brand", exact: true })).toHaveAttribute("href", "/brand");
    await expect(options.getByRole("link", { name: "Connect", exact: true })).toHaveAttribute("href", "/connect");
    await page.keyboard.press("Tab");
    await expect(options.getByRole("button", { name: "Save as format", exact: true })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath(`editor-overflow-${width}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.keyboard.press("Escape");
    await expect(options).toHaveCount(0);
    await expect(more).toBeFocused();
  }
});

test("footer follows session and auth pages never offer Start for free", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.getByRole("link", { name: "Create account", exact: true })).toHaveAttribute("href", "/signup");
  await expect(footer.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
  for (const path of ["/signup", "/login"]) {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Start for free", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeVisible();
  }
  await expect(page.getByRole("link", { name: "Create an account", exact: true })).toHaveAttribute("href", "/signup");
  await signUp(page.request);
  for (const path of ["/", "/pricing"]) {
    await page.goto(path);
    await expect(footer.getByRole("link", { name: "Carousel library", exact: true })).toHaveAttribute("href", "/library");
    await expect(footer.getByRole("link", { name: "Create account", exact: true })).toHaveCount(0);
    await expect(footer.getByRole("link", { name: "Sign in", exact: true })).toHaveCount(0);
  }
});

test("reference metadata failures are non-fatal while unsafe URLs still fail validation", async () => {
  const url = "https://www.linkedin.com/posts/qa";
  const failures: (typeof fetch)[] = [
    async () => new Response("Unauthorized", { status: 401 }),
    async () => new Response("Forbidden", { status: 403 }),
    async () => new Response("<html><body>No metadata</body></html>"),
    async () => { throw new TypeError("Network unavailable"); },
    async () => { throw new DOMException("Timed out", "TimeoutError"); },
  ];
  for (const fetchPost of failures) {
    expect(await referenceContext(url, fetchPost)).toEqual({ context: null, warning: { code: "REFERENCE_UNAVAILABLE", message: REFERENCE_FALLBACK_NOTICE } });
  }
  const success = await referenceContext(url, async () => new Response('<meta property="og:title" content="Useful &amp; original"><meta content="A clear structure" name="og:description">'));
  expect(success.warning).toBeNull();
  expect(success.context).toContain("Useful & original");
  expect(success.context).toContain("A clear structure");
  let fetched = false;
  const forbiddenFetch: typeof fetch = async () => { fetched = true; throw new Error("Should not fetch"); };
  for (const value of ["not a URL", "http://linkedin.com/posts/qa", "https://localhost/", "https://linkedin.com.evil.example/posts/qa"]) {
    await expect(referenceContext(value, forbiddenFetch)).rejects.toMatchObject({ status: 400 });
  }
  expect(fetched).toBe(false);
});

test("unreadable reference posts still create drafts through both generation endpoints", async ({ page }) => {
  await signUp(page.request);
  // Fetch rejects port 1 before network I/O: a deterministic unreadable reference.
  const reference = "https://www.linkedin.com:1/posts/swiper-qa-unavailable";
  const brief = "Explain why a short brief should become an editable draft before a team shares it.";
  await page.goto("/new");
  await page.getByLabel("What should this carousel say?").fill(brief);
  await page.getByLabel("Reference post URL", { exact: false }).fill(reference);
  const created = page.waitForResponse((response) => response.url().endsWith("/api/v1/carousels") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Generate carousel", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(201);
  const body = await response.json() as { carousel_id: string; editor_url: string; warnings: { code: string; message: string }[] };
  expect(body.warnings).toEqual(expect.arrayContaining([
    { code: "LOCAL_GENERATION", message: LOCAL_GENERATION_NOTICE },
    { code: "THIN_BRAND", message: THIN_BRAND_NOTICE },
    { code: "REFERENCE_UNAVAILABLE", message: REFERENCE_FALLBACK_NOTICE },
  ]));
  expect(body.editor_url).toContain("reference=unavailable");
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  await expect(page.getByText(REFERENCE_FALLBACK_NOTICE)).toBeVisible();
  await expect(page.getByText(LOCAL_GENERATION_NOTICE)).toBeVisible();
  expect((await page.request.get(`/api/v1/carousels/${body.carousel_id}`)).status()).toBe(200);
  const generated = await page.request.post("/api/v1/carousels/generate", { data: { brief, reference_url: reference, format_id: "before-after" } });
  expect(generated.status()).toBe(201);
  expect((await generated.json()).warnings).toEqual(expect.arrayContaining(body.warnings));
  const invalid = await page.request.post("/api/v1/carousels", { data: { brief, reference_url: "https://localhost/" } });
  expect(invalid.status()).toBe(400);
  const billing = await (await page.request.get("/api/v1/billing")).json() as { usage: { carousel: number; generation?: number } };
  expect(billing.usage.carousel).toBe(2);
  expect(billing.usage.generation ?? 0).toBe(0);
});

test("onboarding reflects real progress, brand load failures recover, and unsaved edits are protected", async ({ page }, testInfo) => {
  await signUp(page.request);
  await page.goto("/library");
  const journey = page.getByRole("region", { name: "Getting started", exact: true });
  await expect(journey).toContainText("Your first post starts here");
  await expect(journey.getByText("Done", { exact: true })).toHaveCount(0);
  await expect(journey.getByRole("link", { name: "How Swiper works" })).toHaveAttribute("href", "/guide");

  let failBrand = true;
  await page.route("**/api/v1/brand", async (route) => {
    if (failBrand && route.request().method() === "GET") await route.fulfill({ status: 503, json: { message: "Brand service unavailable" } });
    else await route.continue();
  });
  await page.goto("/brand");
  await expect(page.getByRole("heading", { name: "Your brand kit didn’t load" })).toBeVisible();
  await expect(page.getByLabel("Product name", { exact: true })).toHaveCount(0);
  failBrand = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await page.getByLabel("Product name", { exact: true }).fill("Fieldnotes");
  await page.getByLabel("What it is", { exact: true }).fill("A writing tool that turns customer conversations into practical product stories.");
  await page.getByLabel("Audience", { exact: true }).fill("Founders at small software teams");
  await expect(page.getByLabel("Positioning", { exact: true })).not.toBeVisible();
  await page.getByRole("link", { name: "Create", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Leave without saving?" })).toBeVisible();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await expect(page.getByLabel("Product name", { exact: true })).toHaveValue("Fieldnotes");
  await page.getByRole("button", { name: "Save brand", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved", exact: true })).toBeVisible();
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`brand-${width}.png`) });
  }
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(journey.getByText("Done", { exact: true })).toHaveCount(1);
});

test("unfinished briefs survive refresh, creation tabs work with a keyboard, and successful creation clears the brief", async ({ page }, testInfo) => {
  await signUp(page.request);
  await page.goto("/new");
  await expect(page.getByLabel("Story shape", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(sessionStorage).some((key) => key.startsWith("swiper:brief:")))).toBeTruthy();
  const brief = "Explain why founders should turn customer feedback into specific product stories.";
  await page.getByLabel("What should this carousel say?", { exact: true }).fill(brief);
  await page.getByLabel("Carousel title", { exact: true }).fill("Customer stories");
  await page.getByLabel("Story shape", { exact: true }).selectOption("before-after");
  await page.reload();
  await expect(page.getByText("Your unfinished brief was restored in this tab.")).toBeVisible();
  await expect(page.getByLabel("What should this carousel say?", { exact: true })).toHaveValue(brief);
  await expect(page.getByLabel("Story shape", { exact: true })).toHaveValue("before-after");
  await page.getByRole("tab", { name: "Generate from a brief", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Start by hand", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByLabel("What should this carousel say?", { exact: true })).toHaveValue(brief);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`brief-${width}.png`) });
  }
  await page.getByRole("button", { name: "Generate carousel", exact: true }).click();
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  await page.goto("/new");
  await expect(page.getByLabel("What should this carousel say?", { exact: true })).toHaveValue("");
});

test("library previews, search, sorting, and no-results recovery work across screen sizes", async ({ page }, testInfo) => {
  await signUp(page.request);
  const first = await create(page.request);
  await page.request.patch(`/api/v1/carousels/${first.carousel_id}`, { data: { operations: [{ op: "rename", title: "Zebra launch" }] } });
  const second = await create(page.request);
  await page.request.patch(`/api/v1/carousels/${second.carousel_id}`, { data: { operations: [{ op: "rename", title: "Audience insights" }] } });
  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Saved carousels" })).toBeVisible();
  await page.getByLabel("Sort carousels", { exact: true }).selectOption("title");
  await expect(page.locator("article h3").first()).toHaveText("Audience insights");
  await page.getByLabel("Search carousels", { exact: true }).fill("zebra");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Zebra launch/ })).toBeVisible();
  await page.getByLabel("Search carousels", { exact: true }).fill("missing draft");
  await expect(page.getByRole("heading", { name: "No matching carousels" })).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(page.locator("article")).toHaveCount(2);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`library-${width}.png`) });
  }
  await page.goto("/guide");
  await expect(page.getByRole("heading", { name: "Export and share", exact: true })).toBeVisible();
  await expect(page.locator("main")).toContainText("Swiper does not post to your social accounts.");
  await page.screenshot({ path: testInfo.outputPath("guide-mobile.png"), fullPage: true });
});

test("Free export checks flag copy issues, lead back to the slide, and gate JPG before a request", async ({ page }) => {
  await signUp(page.request);
  const { carousel_id: id, carousel } = await create(page.request);
  const slide = carousel.slides[0]!;
  const headline = slide.elements.find((element) => element.role === "headline")!;
  const update = await page.request.patch(`/api/v1/carousels/${id}`, { data: { operations: [{ op: "update_text", slideId: slide.id, elementId: headline.id, text: "A revolutionary way to tell your product story." }] } });
  expect(update.ok()).toBeTruthy();
  let jpgRequests = 0;
  page.on("request", (request) => { if (request.url().includes(`/carousels/${id}/export?format=jpg`)) jpgRequests++; });
  await page.goto(`/c/${id}`);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Ready to share", exact: true });
  await expect(dialog.getByRole("link", { name: /Upgrade for JPG images/ })).toHaveAttribute("href", "/pricing");
  await expect(dialog.getByRole("button", { name: /JPG images/ })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Check carousel", exact: true }).click();
  await expect(dialog).toContainText("uses generic AI phrasing");
  await dialog.getByRole("listitem").filter({ hasText: "uses generic AI phrasing" }).getByRole("button", { name: "Edit slide 1", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByTestId("slide-canvas").getByRole("button", { name: "headline element", exact: true }).click();
  await page.locator("#element-text").fill("Good product stories start with a real customer problem.");
  await saved(page);
  await page.getByRole("button", { name: "Export", exact: true }).click();
  await expect(dialog).not.toContainText("uses generic AI phrasing");
  await dialog.getByRole("button", { name: "Check carousel", exact: true }).click();
  await expect(dialog).not.toContainText("uses generic AI phrasing");
  expect(jpgRequests).toBe(0);
});

test("authentication recovery preserves a safe destination when the provider is unavailable", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() => sessionStorage.setItem("swiper-next", "/connect"));
  for (const path of ["/sso-callback", "/login/continue"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: "We couldn’t finish signing you in", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to sign in", exact: true })).toHaveAttribute("href", "/login?next=%2Fconnect");
    await expect(page.getByRole("link", { name: "Start for free", exact: true })).toHaveCount(0);
  }
  await page.evaluate(() => sessionStorage.setItem("swiper-next", "https://outside.example/"));
  await page.reload();
  await expect(page.getByRole("link", { name: "Return to sign in", exact: true })).toHaveAttribute("href", "/login?next=%2Flibrary");
});

test("generation notices appear once, dismiss, and survive saved edits without URL signals", async ({ page }) => {
  await signUp(page.request);
  await page.goto("/new");
  await expect(page.getByText("Your brand kit is incomplete", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Add brand details", exact: true })).toHaveAttribute("href", "/brand");
  await page.getByLabel("What should this carousel say?", { exact: true }).fill("Explain why a founder should review every line before sharing a customer story.");
  await page.getByRole("button", { name: "Generate carousel", exact: true }).click();
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  const url = new URL(page.url());
  expect(url.searchParams.get("generation")).toBe("local");
  expect(url.searchParams.get("brand")).toBe("thin");
  for (const message of [LOCAL_GENERATION_NOTICE, THIN_BRAND_NOTICE]) {
    await expect(page.getByText(message, { exact: true })).toHaveCount(1);
  }
  await expect(page.getByRole("link", { name: "Open brand kit", exact: true })).toHaveAttribute("href", "/brand");
  await page.getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(page.getByText(LOCAL_GENERATION_NOTICE, { exact: true })).toHaveCount(0);
  await expect(page.getByText(THIN_BRAND_NOTICE, { exact: true })).toHaveCount(0);
  await page.getByTestId("slide-canvas").getByRole("button", { name: "headline element", exact: true }).click();
  await page.locator("#element-text").fill("Review the story before sharing it");
  await saved(page);
  await expect(page.getByText(LOCAL_GENERATION_NOTICE, { exact: true })).toHaveCount(0);
  await page.goto(url.pathname);
  await expect(page.getByText(LOCAL_GENERATION_NOTICE, { exact: true })).toHaveCount(1);
  await expect(page.getByText(THIN_BRAND_NOTICE, { exact: true })).toHaveCount(1);
  const draft = await state(page.request, url.pathname.split("/").at(-1)!);
  expect(draft.carousel.metadata.generationSource).toBe("local");
  expect(draft.carousel.metadata.thinBrand).toBe(true);
  expect((await (await page.request.get("/api/v1/billing")).json()).usage.generation ?? 0).toBe(0);
});

test("complete brand context clears the warning and local slide revision stays free", async ({ page }) => {
  await signUp(page.request);
  const brand = await page.request.patch("/api/v1/brand", { data: {
    description: "A writing tool that turns customer conversations into product stories.",
    audience: "Founders at small software teams",
  } });
  expect(brand.ok()).toBeTruthy();
  await page.goto("/new");
  await expect(page.getByLabel("Story shape", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(sessionStorage).some((key) => key.startsWith("swiper:brief:")))).toBeTruthy();
  await expect(page.getByText("Your brand kit is incomplete", { exact: true })).toHaveCount(0);
  const generated = await page.request.post("/api/v1/carousels/generate", { data: { brief: "Explain how customer stories help founders write specific product copy." } });
  expect(generated.status()).toBe(201);
  const draft = await generated.json() as { carousel_id: string; carousel: Carousel; warnings: { code: string }[] };
  expect(draft.warnings.some((warning) => warning.code === "THIN_BRAND")).toBe(false);
  expect(draft.carousel.metadata.thinBrand).toBeUndefined();
  const revised = await page.request.post(`/api/v1/carousels/${draft.carousel_id}/slides/${draft.carousel.slides[0]!.id}/regenerate`, {
    data: { instruction: "Make Customer stories help founders write specific copy" },
  });
  expect(revised.ok()).toBeTruthy();
  const result = await revised.json() as { source: string; editor_url: string; carousel: Carousel; warnings: { code: string }[] };
  expect(result.source).toBe("local");
  expect(result.warnings).toEqual([{ code: "LOCAL_GENERATION", message: LOCAL_GENERATION_NOTICE }]);
  expect(new URL(result.editor_url).searchParams.get("generation")).toBe("local");
  expect(result.carousel.metadata.generationSource).toBe("local");
  expect(result.carousel.slides[0]!.elements.find((element) => element.role === "headline")?.text).toBe("Customer stories help founders write specific copy");
  const billing = await (await page.request.get("/api/v1/billing")).json();
  expect(billing.usage.generation ?? 0).toBe(0);
});

test("marketing logos follow the session and signed-in navigation shows Pricing once", async ({ page }) => {
  for (const path of ["/", "/pricing", "/this-page-does-not-exist"]) {
    await page.goto(path);
    await expect(page.locator("header").getByRole("link", { name: "Swiper home", exact: true })).toHaveAttribute("href", "/");
  }
  await signUp(page.request);
  for (const path of ["/", "/pricing", "/this-page-does-not-exist"]) {
    await page.goto(path);
    const header = page.locator("header");
    await expect(header.getByRole("link", { name: "Swiper library", exact: true })).toHaveAttribute("href", "/library");
    await expect(header.getByRole("link", { name: "Pricing", exact: true })).toHaveCount(1);
    await header.getByRole("link", { name: "Swiper library", exact: true }).click();
    await expect(page).toHaveURL(/\/library$/);
  }
});

test("MCP generation carries the same local and thin-brand signals into the editor", async ({ page }) => {
  await signUp(page.request);
  const minted = await page.request.post("/api/v1/mcp-keys", { data: { name: "Generation QA" } });
  expect(minted.ok()).toBeTruthy();
  const { key } = await minted.json() as { key: string };
  const response = await page.request.post("/mcp", {
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: "application/json, text/event-stream",
      "MCP-Protocol-Version": "2025-06-18",
    },
    data: {
      jsonrpc: "2.0", id: 1, method: "tools/call",
      params: { name: "swiper.generate_carousel", arguments: { brief: "Explain how customer conversations help founders write specific product stories." } },
    },
  });
  const text = await response.text();
  expect(response.ok(), text).toBeTruthy();
  const message = response.headers()["content-type"]?.includes("text/event-stream")
    ? JSON.parse(text.split("\n").find((line) => line.startsWith("data: "))!.slice(6))
    : JSON.parse(text);
  expect(message.error).toBeUndefined();
  expect(message.result.isError).not.toBe(true);
  const draft = JSON.parse(message.result.content[0].text) as { carousel_id: string; editor_url: string; source: string; carousel: Carousel; warnings: { code: string }[] };
  const url = new URL(draft.editor_url);
  expect(draft.source).toBe("local");
  expect(url.searchParams.get("generation")).toBe("local");
  expect(url.searchParams.get("brand")).toBe("thin");
  expect(draft.warnings.map((warning) => warning.code)).toEqual(["LOCAL_GENERATION", "THIN_BRAND"]);
  const persisted = await state(page.request, draft.carousel_id);
  expect(persisted.carousel.metadata.generationSource).toBe("local");
  expect(persisted.carousel.metadata.thinBrand).toBe(true);
  await page.goto(url.pathname);
  await expect(page.getByText(LOCAL_GENERATION_NOTICE, { exact: true })).toHaveCount(1);
  await expect(page.getByText(THIN_BRAND_NOTICE, { exact: true })).toHaveCount(1);
  expect((await (await page.request.get("/api/v1/billing")).json()).usage.generation ?? 0).toBe(0);
});

test("AI credits follow model success for both drafts and slide revisions", async ({ page }) => {
  const userId = await signUp(page.request);
  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });
  try {
    const [workspace] = await sql<{ id: string }[]>`select id from workspace where owner_id = ${userId}`;
    // A Node ESM process preserves the renderer's import.meta while mocking only provider calls.
    await promisify(execFile)(process.execPath, [
      "--import", require.resolve("tsx", { paths: [resolve(__dirname, "../../mcp")] }),
      resolve(__dirname, "model-usage.fixture.mts"), userId, workspace!.id,
    ], { env: {
      ...process.env, DATABASE_URL: testDatabaseUrl, ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "sk_test_mock_only",
      TSX_TSCONFIG_PATH: resolve(__dirname, "../tsconfig.json"),
    } });
    expect((await (await page.request.get("/api/v1/billing")).json()).usage.generation).toBe(2);
  } finally {
    await sql.end();
  }
});

test("slide revisions preserve saved design, assets, current copy, and template IDs", async ({ page }) => {
  const request = page.request;
  await signUp(request);
  const assetResponse = await request.post("/api/v1/assets", { multipart: { file: fixtureImage("#B64831") } });
  const asset = await assetResponse.json() as { id: string; url: string };
  expect((await request.patch("/api/v1/brand", { data: { description: "Customer research for founders", audience: "Product founders", logoAssetId: asset.id } })).ok()).toBeTruthy();
  const generated = await request.post("/api/v1/carousels/generate", { data: { brief: "Explain how customer interviews lead to better product decisions." } });
  const { carousel_id: id, carousel } = await generated.json() as { carousel_id: string; carousel: Carousel };
  const target = carousel.slides[0]!; const other = carousel.slides[1]!;
  const targetHeadline = target.elements.find((element) => element.role === "headline")!;
  const otherHeadline = other.elements.find((element) => element.role === "headline")!;
  const patch = await request.patch(`/api/v1/carousels/${id}`, { data: { expected_version: 1, operations: [
    { op: "rename", title: "The approved research launch" },
    { op: "update_text", slideId: target.id, elementId: targetHeadline.id, text: "These are my latest approved words from a customer interview, which should be shortened." },
    { op: "set_text_style", slideId: target.id, elementId: targetHeadline.id, style: { fontSize: 50, fontWeight: 600, align: "center", color: "#20352C" } },
    { op: "set_element_box", slideId: target.id, elementId: targetHeadline.id, x: 130, y: 250, width: 700, height: 350 },
    { op: "update_text", slideId: other.id, elementId: otherHeadline.id, text: "Keep the customer's approved statement." },
    { op: "set_background", slideId: other.id, background: { type: "solid", value: "#cc1122" } },
    { op: "add_element", slideId: target.id, element: { id: "custom-photo", type: "image", assetId: asset.id, src: asset.url, x: 100, y: 900, width: 300, height: 200 } },
    { op: "reorder_slide", slideId: target.id, toIndex: 2 },
    { op: "delete_slide", slideId: carousel.slides[3]!.id },
    { op: "insert_slide", index: 1, slide: { ...target, id: "inserted-slide", elements: target.elements.map((element) => ({ ...element, id: `inserted-${element.id}` })) } },
  ] } });
  expect(patch.status(), await patch.text()).toBe(200);
  const before = await state(request, id);
  const revised = await request.post(`/api/v1/carousels/${id}/slides/${target.id}/regenerate`, { data: { instruction: "Make the headline shorter" } });
  expect(revised.status(), await revised.text()).toBe(200);
  const after = await state(request, id);
  expect(after.carousel.slides.filter((slide) => slide.id !== target.id)).toEqual(before.carousel.slides.filter((slide) => slide.id !== target.id));
  expect(after.carousel.metadata).toEqual(before.carousel.metadata);
  const revisedTarget = after.carousel.slides.find((slide) => slide.id === target.id)!;
  const originalTarget = before.carousel.slides.find((slide) => slide.id === target.id)!;
  expect(revisedTarget.elements.find((element) => element.id === targetHeadline.id)!.text).toBe("These are my latest approved words from");
  const designOnly = (elements: typeof target.elements) => elements.map((element) => ({ ...element, text: undefined }));
  expect(designOnly(revisedTarget.elements)).toEqual(designOnly(originalTarget.elements));
  const inserted = after.carousel.slides.find((slide) => slide.id === "inserted-slide")!;
  expect((await request.post(`/api/v1/carousels/${id}/slides/${inserted.id}/regenerate`, { data: { instruction: "Make the headline shorter" } })).ok()).toBeTruthy();
  const format = await request.post("/api/v1/formats", { data: { carousel_id: id, name: "Research launch" } });
  const formatId = (await format.json()).format.id;
  const copy = await create(request, formatId);
  const beforeCopy = await state(request, copy.carousel_id);
  expect((await request.post(`/api/v1/carousels/${copy.carousel_id}/slides/${beforeCopy.carousel.slides[0]!.id}/regenerate`, { data: { instruction: "Make the headline shorter" } })).ok()).toBeTruthy();
  const afterCopy = await state(request, copy.carousel_id);
  expect(afterCopy.carousel.slides.map((slide) => slide.id)).toEqual(beforeCopy.carousel.slides.map((slide) => slide.id));
  expect(afterCopy.carousel.slides.slice(1)).toEqual(beforeCopy.carousel.slides.slice(1));
  expect(afterCopy.carousel.slides.every((slide) => slide.elements.some((element) => element.type === "logo"))).toBeTruthy();
});

test("delayed model revisions reject edits, undo, another revision, and deletion without adding history or credits", async ({ page }) => {
  const userId = await signUp(page.request);
  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });
  try {
    const [workspace] = await sql<{ id: string }[]>`select id from workspace where owner_id = ${userId}`;
    await promisify(execFile)(process.execPath, ["--import", require.resolve("tsx", { paths: [resolve(__dirname, "../../mcp")] }), resolve(__dirname, "slide-revision.fixture.mts"), userId, workspace!.id], { env: {
      ...process.env, DATABASE_URL: testDatabaseUrl, ANTHROPIC_API_KEY: "", OPENAI_API_KEY: "sk_test_mock_only", TSX_TSCONFIG_PATH: resolve(__dirname, "../tsconfig.json"),
    } });
  } finally { await sql.end(); }
});

test("recovery keeps the complete offline document after remote deletion and restores it with undo", async ({ page }) => {
  const request = page.request;
  await signUp(request);
  const { carousel_id: id } = await create(request);
  await page.goto(`/c/${id}`);
  await page.getByTestId("slide-canvas").getByRole("button", { name: "headline element", exact: true }).click();
  await page.route(`**/api/v1/carousels/${id}`, async (route) => { if (route.request().method() === "PATCH") await route.abort(); else await route.continue(); });
  const original = await state(request, id);
  await page.locator("#element-text").fill("These offline customer words must remain recoverable.");
  await expect.poll(() => page.evaluate((carouselId) => localStorage.getItem(`swiper:draft:${carouselId}`), id)).toContain("These offline customer words");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.locator("#element-text").fill("These offline customer words must remain recoverable. Second batch.");
  const offline = JSON.parse((await page.evaluate((carouselId) => localStorage.getItem(`swiper:draft:${carouselId}`), id))!).carousel as Carousel;
  const remote = await request.patch(`/api/v1/carousels/${id}`, { data: { expected_version: original.version, operations: [{ op: "delete_slide", slideId: original.carousel.slides[0]!.id }] } });
  expect(remote.status()).toBe(200);
  const latest = await state(request, id);
  await page.reload();
  await expect(page.getByRole("button", { name: "Download local draft", exact: true })).toBeVisible();
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download local draft", exact: true }).click();
  const download = await downloading;
  const backup = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(backup.carousel).toEqual(offline);
  expect(backup.batches.length).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Load latest version", exact: true }).click();
  await expect(page.getByTestId("slide-canvas").getByText("These offline customer words", { exact: false })).toHaveCount(0);
  await page.unroute(`**/api/v1/carousels/${id}`);
  await page.locator('input[aria-label="Recovery JSON file"]').setInputFiles({ name: "backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole("button", { name: "Restore backup", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Restore this local draft?" })).toHaveCount(0);
  await saved(page);
  expect((await state(request, id)).carousel).toEqual(offline);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await saved(page);
  expect((await state(request, id)).carousel).toEqual(latest.carousel);
});

test("content keys cannot manage credentials or billing, and revocation removes their access", async ({ page }) => {
  const request = page.request;
  await signUp(request);
  const first = await request.post("/api/v1/mcp-keys", { data: { name: "Content access" } });
  const parent = await first.json() as { id: string; key: string };
  const second = await request.post("/api/v1/mcp-keys", { data: { name: "Another client" } });
  const other = await second.json() as { id: string; key: string };
  const headers = { Authorization: `Bearer ${parent.key}` };
  expect((await request.get("/api/v1/brand", { headers })).status()).toBe(200);
  expect((await request.get("/api/v1/mcp-keys", { headers })).status()).toBe(403);
  const replacement = await request.post("/api/v1/mcp-keys", { headers, data: { name: "Replacement" } });
  expect(replacement.status()).toBe(403);
  expect((await replacement.json()).code).toBe("SESSION_REQUIRED");
  expect((await request.delete(`/api/v1/mcp-keys/${other.id}`, { headers })).status()).toBe(403);
  expect((await request.post("/api/v1/billing/checkout", { headers })).status()).toBe(403);
  expect((await request.delete(`/api/v1/mcp-keys/${parent.id}`)).status()).toBe(200);
  expect((await request.get("/api/v1/brand", { headers })).status()).toBe(401);
  expect((await request.get("/api/v1/brand", { headers: { Authorization: `Bearer ${other.key}` } })).status()).toBe(200);
  expect((await (await request.get("/api/v1/mcp-keys")).json()).keys).toHaveLength(2);
});

test("billing verifies subscriptions, deduplicates stale events, and respects lifecycle states", async ({ page }) => {
  const userId = await signUp(page.request);
  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });
  try {
    const [workspace] = await sql<{ id: string }[]>`select id from workspace where owner_id = ${userId}`;
    await promisify(execFile)(process.execPath, ["--import", require.resolve("tsx", { paths: [resolve(__dirname, "../../mcp")] }), resolve(__dirname, "billing-lifecycle.fixture.mts"), workspace!.id], { env: {
      ...process.env, DATABASE_URL: testDatabaseUrl, TSX_TSCONFIG_PATH: resolve(__dirname, "../tsconfig.json"),
    } });
  } finally { await sql.end(); }
});

test("Clerk lifecycle sync updates profiles and revoked or deleted identities lose key access", async ({ page }) => {
  const userId = await signUp(page.request);
  const minted = await page.request.post("/api/v1/mcp-keys", { data: { name: "Identity lifecycle" } });
  const { key } = await minted.json() as { key: string };
  await promisify(execFile)(process.execPath, ["--import", require.resolve("tsx", { paths: [resolve(__dirname, "../../mcp")] }), resolve(__dirname, "identity-lifecycle.fixture.mts"), userId], { env: {
    ...process.env, DATABASE_URL: testDatabaseUrl, CLERK_SECRET_KEY: "sk_test_fixture_only", TSX_TSCONFIG_PATH: resolve(__dirname, "../tsconfig.json"),
  } });
  expect((await page.request.get("/api/v1/brand", { headers: { Authorization: `Bearer ${key}` } })).status()).toBe(401);
  expect((await page.request.post("/api/v1/mcp-keys", { data: { name: "Should not work" } })).status()).toBe(401);
});

test("concurrent creation and exports cannot overrun the last Free allowance", async ({ page }) => {
  const userId = await signUp(page.request);
  const request = page.request;
  for (let i = 0; i < 4; i++) await create(request);
  const parallel = await Promise.all(Array.from({ length: 4 }, (_, index) => request.post("/api/v1/carousels", { data: { format_id: "freeform", title: `Parallel ${index}` } })));
  expect(parallel.map((response) => response.status()).sort()).toEqual([201, 429, 429, 429]);
  expect((await (await request.get("/api/v1/billing")).json()).usage.carousel).toBe(5);
  const created = await parallel.find((response) => response.status() === 201)!.json();
  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });
  try {
    const [workspace] = await sql<{ id: string }[]>`select id from workspace where owner_id = ${userId}`;
    for (let i = 0; i < 19; i++) await sql`insert into usage_event(id,workspace_id,kind) values(${`use_${crypto.randomUUID()}`},${workspace!.id},'export')`;
    const exports = await Promise.all(Array.from({ length: 3 }, () => request.get(`/api/v1/carousels/${created.carousel_id}/export?format=png&slide=1`)));
    expect(exports.map((response) => response.status()).sort()).toEqual([200, 429, 429]);
    expect((await (await request.get("/api/v1/billing")).json()).usage.export).toBe(20);
  } finally { await sql.end(); }
});

test("first-login provisioning serializes identity and workspace creation and repairs missing brand data", async ({ page }) => {
  const userId = await signUp(page.request);
  await promisify(execFile)(process.execPath, ["--import", require.resolve("tsx", { paths: [resolve(__dirname, "../../mcp")] }), resolve(__dirname, "provisioning.fixture.mts"), userId], { env: {
    ...process.env, DATABASE_URL: testDatabaseUrl, TSX_TSCONFIG_PATH: resolve(__dirname, "../tsconfig.json"),
  } });
});

test("creation and slide revision retries return the original result without consuming allowances twice", async ({ page }) => {
  await signUp(page.request);
  const request = page.request;
  const key = crypto.randomUUID(); const data = { format_id: "freeform", title: "One intended draft" };
  const parallel = await Promise.all(Array.from({ length: 3 }, () => request.post("/api/v1/carousels", { data, headers: { "Idempotency-Key": key } })));
  expect(parallel.every((response) => response.status() === 201)).toBeTruthy();
  const bodies = await Promise.all(parallel.map((response) => response.json()));
  expect(new Set(bodies.map((body) => body.carousel_id)).size).toBe(1);
  expect((await (await request.get("/api/v1/billing")).json()).usage.carousel).toBe(1);
  const draft = bodies[0] as { carousel_id: string; carousel: Carousel };
  const revisionUrl = `/api/v1/carousels/${draft.carousel_id}/slides/${draft.carousel.slides[0]!.id}/regenerate`;
  const revisionHeaders = { "Idempotency-Key": crypto.randomUUID() };
  const first = await request.post(revisionUrl, { data: { instruction: "Make the headline shorter" }, headers: revisionHeaders });
  expect(first.status()).toBe(200);
  const original = await first.json();
  const repeated = await request.post(revisionUrl, { data: { instruction: "Make the headline shorter" }, headers: revisionHeaders });
  expect(repeated.status()).toBe(200);
  expect(await repeated.json()).toEqual(original);
  expect((await state(request, draft.carousel_id)).undo_count).toBe(1);
  for (let i = 0; i < 4; i++) await create(request);
  expect((await request.post("/api/v1/carousels", { data, headers: { "Idempotency-Key": key } })).status()).toBe(201);
  expect((await request.post("/api/v1/carousels", { data: { ...data, title: "Different request" }, headers: { "Idempotency-Key": key } })).status()).toBe(409);
  await request.delete(`/api/v1/carousels/${draft.carousel_id}`);
  expect((await request.post("/api/v1/carousels", { data, headers: { "Idempotency-Key": key } })).status()).toBe(410);
});

test("malformed generation, revision, brand and key inputs return readable client errors", async ({ page }) => {
  await signUp(page.request);
  for (const data of [null, { brief: 123 }, { brief: "A valid brief for a carousel.", title: 123 }, { brief: "x".repeat(10001) }, { brief: "A valid brief for a carousel.", slide_count: 999 }]) {
    const response = await page.request.post("/api/v1/carousels/generate", { data });
    expect(response.status()).toBe(400);
    expect((await response.json()).message).toBeTruthy();
  }
  const draft = await create(page.request);
  const revision = await page.request.post(`/api/v1/carousels/${draft.carousel_id}/slides/${draft.carousel.slides[0]!.id}/regenerate`, { data: { instruction: 42 } });
  expect(revision.status()).toBe(400);
  expect((await page.request.patch("/api/v1/brand", { data: { guidelines: "x".repeat(10001) } })).status()).toBe(400);
  expect((await page.request.post("/api/v1/mcp-keys", { data: { name: 42 } })).status()).toBe(400);
});

test("generation honors supported slide counts and rejects unknown or incompatible formats", async ({ page }) => {
  await signUp(page.request);
  const request = page.request;
  const brief = "Explain how product founders can turn customer interviews into clear marketing.";
  const three = await request.post("/api/v1/carousels/generate", { data: { brief, slide_count: 3 } });
  expect(three.status()).toBe(201);
  expect((await three.json()).carousel.slides).toHaveLength(3);
  const eight = await request.post("/api/v1/carousels/generate", { data: { brief, slide_count: 8, format_id: "problem-insight-product" } });
  expect(eight.status()).toBe(201);
  const result = await eight.json();
  expect(result.carousel.slides).toHaveLength(8);
  expect(result.format_id).toBe("problem-insight-product");
  expect(result.carousel.slides.at(-1).role).toBe("cta");
  const invalidFormat = await request.post("/api/v1/carousels/generate", { data: { brief, format_id: "does-not-exist" } });
  expect(invalidFormat.status()).toBe(400);
  expect((await invalidFormat.json()).code).toBe("UNKNOWN_FORMAT");
  const incompatible = await request.post("/api/v1/carousels/generate", { data: { brief, slide_count: 3, format_id: "five-things" } });
  expect(incompatible.status()).toBe(400);
  expect((await incompatible.json()).code).toBe("INVALID_SLIDE_COUNT");
  expect((await (await request.get("/api/v1/billing")).json()).usage.carousel).toBe(2);
});

test("production migrations preserve duplicate identity data, reject conflicting mappings and can run twice", async () => {
  test.skip(!["localhost", "127.0.0.1"].includes(new URL(testDatabaseUrl).hostname), "Migration fixtures require a local test database.");
  await promisify(execFile)(process.execPath, ["--import", require.resolve("tsx", { paths: [resolve(__dirname, "../../mcp")] }), resolve(__dirname, "migrations.fixture.mts"), testDatabaseUrl], { env: process.env });
});

test("export checks catch clipped text and reject unsupported visuals", async ({ page }) => {
  await signUp(page.request);
  const request = page.request;
  const draft = await create(request);
  const slide = draft.carousel.slides[0]!;
  const headline = slide.elements.find((element) => element.role === "headline")!;
  for (const operation of [
    { op: "set_background", slideId: slide.id, background: { type: "gradient", value: "linear-gradient(red, blue)" } },
    { op: "add_element", slideId: slide.id, element: { id: "remote", type: "image", src: "https://example.test/photo.jpg", x: 0, y: 0, width: 200, height: 200 } },
  ]) expect((await request.patch(`/api/v1/carousels/${draft.carousel_id}`, { data: { expected_version: 1, operations: [operation] } })).status()).toBe(400);
  expect((await request.patch(`/api/v1/carousels/${draft.carousel_id}`, { data: { expected_version: 1, operations: [{ op: "set_element_box", slideId: slide.id, elementId: headline.id, x: headline.x, y: headline.y, width: headline.width, height: 10 }] } })).status()).toBe(200);
  const validation = await (await request.post(`/api/v1/carousels/${draft.carousel_id}/validate`)).json();
  expect(validation.ok).toBe(false);
  expect(validation.errors.some((issue: { code: string }) => issue.code === "TEXT_OVERFLOW")).toBe(true);
  expect((await request.patch("/api/v1/brand", { data: { proofPoints: [""] } })).status()).toBe(400);
});

test("preparation is bound to a version and retries survive the quota boundary", async ({ page }) => {
  const userId = await signUp(page.request);
  const request = page.request;
  const draft = await create(request);
  const id = draft.carousel_id;
  const sql = postgres(testDatabaseUrl, { max: 1, prepare: false });
  try {
    const [workspace] = await sql<{ id: string }[]>`select id from workspace where owner_id = ${userId}`;
    await sql`insert into billing(workspace_id, plan, status, paid_through) values(${workspace!.id},'pro','active',${new Date(Date.now() + 3600000)})`;
    for (let i = 0; i < 99; i++) await sql`insert into usage_event(id,workspace_id,kind) values(${`use_${crypto.randomUUID()}`},${workspace!.id},'publish')`;
    const headers = { "Idempotency-Key": crypto.randomUUID() };
    const responses = await Promise.all(Array.from({ length: 3 }, () => request.post(`/api/v1/carousels/${id}/publish`, { headers, data: { expected_version: 1 } })));
    expect(responses.every((response) => response.ok())).toBe(true);
    const body = await responses[0]!.json();
    expect(body.version).toBe(1);
    expect(body.downloads.png).toContain("version=1");
    expect((await (await request.get("/api/v1/billing")).json()).usage.publish).toBe(100);
    expect((await request.post(`/api/v1/carousels/${id}/publish`, { headers })).status()).toBe(200);
    const slide = draft.carousel.slides[0]!;
    const element = slide.elements[0]!;
    expect((await request.patch(`/api/v1/carousels/${id}`, { data: { expected_version: 1, operations: [{ op: "set_element_box", slideId: slide.id, elementId: element.id, x: -10, y: element.y, width: element.width, height: element.height }] } })).status()).toBe(200);
    expect((await request.post(`/api/v1/carousels/${id}/publish`, { headers })).status()).toBe(409);
    expect((await request.post(`/api/v1/carousels/${id}/publish`, { headers: { "Idempotency-Key": crypto.randomUUID() } })).status()).toBe(422);
    expect((await request.get(`/api/v1/carousels/${id}/export?format=png&version=1`)).status()).toBe(409);
    const [row] = await sql`select status from carousel where id=${id}`;
    expect(row!.status).toBe("draft");
    expect((await (await request.get("/api/v1/billing")).json()).usage.publish).toBe(100);
  } finally { await sql.end(); }
});

test("local fallback drafts stay on topic and identify incomplete scaffolding", async ({ page }) => {
  await signUp(page.request);
  for (const brief of ["Explain why our bakery uses a long sourdough fermentation.", "Explain how a consultant prepares discovery interviews.", "Explain how our software backs up customer records.", "Teach students how the water cycle works."]) {
    const response = await page.request.post("/api/v1/carousels/generate", { data: { brief } });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.source).toBe("local");
    const copy = body.carousel.slides.flatMap((slide: Carousel["slides"][number]) => slide.elements.map((element) => element.text ?? "")).join(" ");
    expect(copy).not.toMatch(/agents|typed carousel|design tool|stitch tools|settings panel/i);
    expect(copy).toContain(brief.replace(/\.$/, ""));
    expect(body.validation.warnings.some((issue: { code: string }) => issue.code === "UNFINISHED_COPY")).toBe(true);
  }
});

test("agent tools discover typed edits, reuse saved designs, inspect images and read protected exports", async ({ page }) => {
  await signUp(page.request);
  const request = page.request;
  const { key } = await (await request.post("/api/v1/mcp-keys", { data: { name: "Agent workflow QA" } })).json();
  const discovery = await mcp(request, key, "tools/list");
  expect(discovery.error).toBeUndefined();
  const tools = discovery.result.tools as { name: string; annotations: Record<string, boolean>; inputSchema: { properties: Record<string, unknown>; required?: string[] } }[];
  expect(tools).toHaveLength(17);
  for (const tool of tools) expect(Object.keys(tool.annotations)).toEqual(expect.arrayContaining(["readOnlyHint", "destructiveHint", "idempotentHint", "openWorldHint"]));
  const editTool = tools.find((tool) => tool.name === "swiper.update_carousel")!;
  expect(editTool.inputSchema.required).toEqual(expect.arrayContaining(["expected_version", "mutation_id"]));
  expect(JSON.stringify(editTool.inputSchema.properties.operations)).toContain("set_element_box");
  const call = async (name: string, args: unknown) => (await mcp(request, key, "tools/call", { name: `swiper.${name}`, arguments: args })).result;
  const upload = await call("upload_asset", { mime_type: "image/png", data_base64: fixtureImage("#B64831").buffer.toString("base64") });
  expect(upload.isError).not.toBe(true);
  const asset = JSON.parse(upload.content[0].text);
  expect((await call("update_brand", { name: "Hearth", guidelines: "Use plain language", logoAssetId: asset.id })).isError).not.toBe(true);
  const source = await create(request);
  const slide = source.carousel.slides[0]!;
  const headline = slide.elements.find((element) => element.role === "headline")!;
  const editId = crypto.randomUUID();
  const edit = { carousel_id: source.carousel_id, expected_version: 1, mutation_id: editId, operations: [
    { op: "update_text", slideId: slide.id, elementId: headline.id, text: "Old template topic that must be replaced" },
    { op: "set_element_box", slideId: slide.id, elementId: headline.id, x: 130, y: 240, width: 750, height: 420 },
  ] };
  expect((await call("update_carousel", edit)).isError).not.toBe(true);
  expect((await call("update_carousel", edit)).isError).not.toBe(true);
  expect((await state(request, source.carousel_id)).version).toBe(2);
  const stale = await call("update_carousel", { ...edit, mutation_id: crypto.randomUUID() });
  expect(stale.isError).toBe(true);
  expect(JSON.parse(stale.content[0].text).details.current_version).toBe(2);
  const savedFormat = JSON.parse((await call("save_format", { carousel_id: source.carousel_id, name: "Hearth story" })).content[0].text).format;
  const requestId = crypto.randomUUID();
  const generated = JSON.parse((await call("generate_carousel", { brief: "Explain why our bakery ferments sourdough slowly.", format_id: savedFormat.id, request_id: requestId })).content[0].text);
  expect(generated.format_id).toBe(savedFormat.id);
  expect(generated.carousel.slides).toHaveLength(source.carousel.slides.length);
  expect(generated.carousel.slides[0].elements.find((element: { role: string }) => element.role === "headline")).toMatchObject({ x: 130, y: 240, width: 750, height: 420 });
  expect(JSON.stringify(generated.carousel)).not.toContain("Old template topic");
  expect(generated.carousel.slides[0].elements.some((element: { assetId: string }) => element.assetId === asset.id)).toBe(true);
  const recovered = JSON.parse((await call("get_request_status", { request_id: requestId })).content[0].text);
  expect(recovered.status).toBe("completed");
  expect(recovered.result.carousel_id).toBe(generated.carousel_id);
  const preview = await call("render_preview", { carousel_id: generated.carousel_id, slide_number: 1 });
  expect(preview.isError).not.toBe(true);
  expect(preview.content[1].type).toBe("image");
  expect(Buffer.from(preview.content[1].data, "base64").subarray(1, 4).toString()).toBe("PNG");
  const metadata = JSON.parse((await call("export_carousel", { carousel_id: generated.carousel_id })).content[0].text);
  const resource = await mcp(request, key, "resources/read", { uri: metadata.resources.find((resource: { name: string }) => resource.name.endsWith(".pdf")).uri });
  expect(resource.error).toBeUndefined();
  expect(Buffer.from(resource.result.contents[0].blob, "base64").subarray(0, 4).toString()).toBe("%PDF");
  expect(JSON.stringify(metadata)).not.toContain(key);
  expect((await call("undo_carousel", { carousel_id: source.carousel_id, expected_version: 2 })).isError).not.toBe(true);
  expect((await call("undo_carousel", { carousel_id: source.carousel_id, expected_version: 2 })).isError).toBe(true);
  expect((await call("delete_carousel", { carousel_id: generated.carousel_id, expected_version: 1 })).isError).not.toBe(true);
  await page.goto("/new");
  await expect(page.getByLabel("Story shape").getByRole("option", { name: "Hearth story" })).toHaveCount(1);
  expect((await request.post("/api/v1/billing/portal", { headers: { Authorization: `Bearer ${key}` } })).status()).toBe(403);
});

test("the real account menu view supports keyboard focus, dismissal, navigation and sign-out", async ({ page }) => {
  await signUp(page.request);
  await page.goto("/library");
  const trigger = page.getByRole("button", { name: "Editor QA", exact: true });
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "Account actions" });
  await expect(menu.getByRole("menuitem", { name: "How to use Swiper", exact: true })).toBeFocused();
  await page.keyboard.press("End");
  await expect(menu.getByRole("menuitem", { name: "Sign out", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "How to use Swiper", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Pricing", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem", { name: "Sign out", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(menu).toHaveCount(0);
  await trigger.click();
  await page.getByRole("heading", { name: "Your carousels" }).click();
  await expect(menu).toHaveCount(0);
  await trigger.click();
  await menu.getByRole("menuitem", { name: "Pricing", exact: true }).click();
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(page.getByRole("link", { name: "Email support", exact: true })).toHaveAttribute("href", "mailto:milan@cassettelabs.in");
  await page.getByRole("button", { name: "Editor QA", exact: true }).click();
  await menu.getByRole("menuitem", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get("/api/v1/brand")).status()).toBe(401);
});
