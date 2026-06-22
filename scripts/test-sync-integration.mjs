import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import syncWorker from "../sync-worker/src/index.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const guideUrl = pathToFileURL(path.join(rootDir, "index.html")).href;
const pnpmDir = path.join(rootDir, "node_modules", ".pnpm");
const playwrightPackage = (await fs.readdir(pnpmDir)).find((name) => name.startsWith("playwright@"));
const { chromium } = await import(
  pathToFileURL(path.join(pnpmDir, playwrightPackage, "node_modules", "playwright", "index.mjs")).href
);
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const values = new Map();
const metadata = new Map();
const env = {
  ALLOWED_ORIGINS: "null",
  SAVES: {
    get: async (key) => values.get(key) ?? null,
    put: async (key, value, options = {}) => {
      values.set(key, value);
      metadata.set(key, options.metadata);
    },
    delete: async (key) => {
      values.delete(key);
      metadata.delete(key);
    },
    list: async ({ prefix }) => ({
      keys: [...values.keys()]
        .filter((key) => key.startsWith(prefix))
        .map((name) => ({ name, metadata: metadata.get(name) })),
    }),
  },
};

const createDevice = async () => {
  const context = await browser.newContext({ viewport: { width: 900, height: 1000 } });
  await context.route("**/sync-config.js", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: 'window.DREAMSTONE_SYNC_ENDPOINT = "https://sync.test";',
    }),
  );
  await context.route("https://sync.test/**", async (route) => {
    const incoming = route.request();
    const requestHeaders = new Headers(incoming.headers());
    requestHeaders.set("Origin", "null");
    const workerRequest = new Request(incoming.url(), {
      method: incoming.method(),
      headers: requestHeaders,
      body: ["GET", "HEAD"].includes(incoming.method()) ? undefined : incoming.postData(),
    });
    const response = await syncWorker.fetch(workerRequest, env);
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(guideUrl);
  return { context, page, errors };
};

const waitForStatus = (page, status) =>
  page.waitForFunction((expected) => document.querySelector("#sync-freshness-title")?.textContent === expected, status);
const code = "12345678-1234-4123-8123-123456789abc";
const one = await createDevice();
await one.page.locator(".view-tab[data-view='save']").click();
await one.page.locator("#sync-code").fill(code);
assert.equal(await one.page.locator("#upload-cloud-save").isEnabled(), true);
await one.page.evaluate(() => markCaught(pokemonByNumber.get(1)));
await one.page.locator("#upload-cloud-save").click();
await waitForStatus(one.page, "In sync");

const two = await createDevice();
await two.page.locator(".view-tab[data-view='save']").click();
await two.page.locator("#sync-code").fill(code);
await two.page.locator("#check-cloud-save").click();
await waitForStatus(two.page, "Cloud save is newer");
two.page.once("dialog", (dialog) => dialog.accept());
await two.page.locator("#download-cloud-save").click();
await waitForStatus(two.page, "In sync");
assert.equal(await two.page.evaluate(() => state.caught.has(dexId(pokemonByNumber.get(1)))), true);
assert.equal(await two.page.evaluate(() => readLocalBackups().length), 1);

await one.page.evaluate(() => markCaught(pokemonByNumber.get(2)));
await two.page.evaluate(() => markCaught(pokemonByNumber.get(3)));
await two.page.locator("#upload-cloud-save").click();
await waitForStatus(two.page, "In sync");
await one.page.locator("#check-cloud-save").click();
await waitForStatus(one.page, "Changes on both copies");
assert.equal(await one.page.locator("#sync-conflict-actions").isVisible(), true);
one.page.once("dialog", (dialog) => dialog.accept());
await one.page.locator("#use-local-save").click();
await waitForStatus(one.page, "In sync");
await one.page.locator(".sync-recovery summary").click();
await one.page.locator("#refresh-sync-history").click();
await one.page.waitForFunction(() => document.querySelectorAll("[data-restore-cloud]").length >= 2);
assert.ok((await one.page.locator("[data-restore-cloud]").count()) >= 2);
assert.deepEqual([...one.errors, ...two.errors], []);

await one.context.close();
await two.context.close();
await browser.close();
console.log("Two-device sync integration test passed");
