import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { createCanvas } from "@napi-rs/canvas";
import type { Carousel } from "@swiper/schema";
import postgres from "postgres";
import { cleanupTestUsers, testDatabaseUrl } from "./test-data";
import { referenceContext } from "../src/server/reference-post";
import { LOCAL_GENERATION_NOTICE, REFERENCE_FALLBACK_NOTICE, THIN_BRAND_NOTICE } from "../src/lib/generation-notices";

const testUserIds: string[] = [];

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

test("Prepare files shows the Free gate upfront and preserves the Pro handoff", async ({ page }) => {
  await signUp(page.request);
  const { carousel_id: id } = await create(page.request);
  let preparations = 0;
  page.on("request", (request) => { if (request.method() === "POST" && request.url().endsWith(`/carousels/${id}/publish`)) preparations++; });
  await page.goto(`/c/${id}`);
  await page.getByRole("button", { name: "More carousel options", exact: true }).click();
  await page.getByRole("button", { name: "Prepare files", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Prepare files", exact: true });
  await expect(dialog).toContainText("Prepare files requires Pro.");
  await expect(dialog).toContainText("Swiper does not post to social accounts.");
  await expect(dialog.getByRole("link", { name: "Upgrade to Pro", exact: true })).toHaveAttribute("href", "/pricing");
  await expect(dialog.getByRole("button", { name: "Validate and prepare files", exact: true })).toHaveCount(0);
  expect(preparations).toBe(0);
  await dialog.getByRole("button", { name: "Export PNG or PDF", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ready to share", exact: true })).toBeVisible();
  expect(preparations).toBe(0);

  // Exercise the Pro UI without changing real billing or consuming file-preparation usage.
  await page.route("**/api/v1/billing", (route) => route.fulfill({ json: { plan: "pro", usage: {}, limits: { carousel: 100, generation: 250, export: 1000, publish: 100, jpg: true } } }));
  await page.route(`**/api/v1/carousels/${id}/publish`, (route) => route.fulfill({ json: { status: "ready" } }));
  await page.reload();
  await page.getByRole("button", { name: "More carousel options", exact: true }).click();
  await page.getByRole("button", { name: "Prepare files", exact: true }).click();
  await expect(dialog).toContainText("Your Pro plan includes this publishing handoff.");
  await dialog.getByRole("button", { name: "Validate and prepare files", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Ready to share", exact: true })).toBeVisible();
  await expect(page.getByText("Files ready to download. Swiper does not post to your social accounts.", { exact: true })).toBeVisible();
  expect(preparations).toBe(1);
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
    await expect(options.getByRole("button", { name: "Prepare files", exact: true })).toBeVisible();
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
  await dialog.getByRole("button", { name: "Edit slide 1", exact: true }).click();
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
