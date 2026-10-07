import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { createCanvas } from "@napi-rs/canvas";
import type { Carousel } from "@swiper/schema";
import postgres from "postgres";
import { cleanupTestUsers, testDatabaseUrl } from "./test-data";

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
  await page.getByRole("button", { name: "Start by hand" }).click();
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
  await page.getByRole("button", { name: "Save as format", exact: true }).click();
  await page.getByLabel("Format name", { exact: true }).fill("Launch story");
  await page.getByRole("button", { name: "Save format", exact: true }).click();
  await expect(page.getByText("“Launch story” is ready in your workspace formats.")).toBeVisible();
  const source = await state(request, id);
  await page.goto("/new");
  await page.getByRole("button", { name: "Start by hand" }).click();
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
  await page.getByLabel("What should this carousel say?").fill("Explain why a product brief should become an editable carousel before it gets published.");
  await page.getByRole("button", { name: "Generate carousel" }).click();
  await expect(page.getByTestId("slide-canvas")).toBeVisible();
  const id = page.url().split("/").at(-1)!;

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
  await page.getByRole("button", { name: "Start by hand", exact: true }).click();
  await expect(page.getByRole("radio", { name: /Start by hand/ })).toBeChecked();
  await page.getByRole("button", { name: "Generate from a brief", exact: true }).click();
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
    expect((await billing()).usage.generation).toBe(1);
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
    expect((await billing()).usage.carousel).toBe(4);
    expect((await billing()).usage.generation).toBe(1);
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
