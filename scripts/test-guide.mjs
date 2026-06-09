import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "tmp");
const guideUrl = pathToFileURL(path.join(rootDir, "index.html")).href;
const pnpmDir = path.join(rootDir, "node_modules", ".pnpm");
const playwrightPackage = (await fs.readdir(pnpmDir)).find((name) => name.startsWith("playwright@"));
if (!playwrightPackage) throw new Error("Playwright package is unavailable");
const { chromium } = await import(
  pathToFileURL(path.join(pnpmDir, playwrightPackage, "node_modules", "playwright", "index.mjs")).href
);
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
await page.addInitScript(() => localStorage.clear());
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`Console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`Page: ${error.message}`));

const check = async (condition, message) => {
  const passed = typeof condition === "function" ? await condition() : condition;
  if (!passed) throw new Error(message);
};

await page.goto(guideUrl);
await check((await page.title()) === "Dreamstone Field Guide", "Unexpected page title");
await check((await page.locator(".pokemon-card").count()) === 315, "Expected all 315 Pokémon cards");
await check(
  (await page.locator(".pokemon-card[data-number='1'] .type-badge").allTextContents()).includes("psychic"),
  "Gothita is missing its Psychic type badge",
);
await check(
  (await page.locator(".region-badge:not([hidden])").count()) === 38,
  "Unexpected visible regional badge count",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .region-badge").evaluate(
    (element) => getComputedStyle(element).display,
  )) === "none",
  "Empty regional badge is visible",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .evolves-to .evolution-link").allTextContents()).some(
    (text) => text.includes("Gothorita"),
  ),
  "Gothita is missing its Gothorita evolution link",
);
await check(
  (await page.locator(".sticky-search").evaluate((element) => getComputedStyle(element).position)) === "sticky",
  "Search bar is not sticky",
);
await check((await page.locator(".quick-location").count()) === 36, "Unexpected quick-location count");
await check((await page.locator(".collection-card").count()) === 327, "Expected all 327 collection cards");
await check((await page.locator("#total-count").textContent()) === "327", "Capture total did not include Pokerex wild entries");
await check((await page.locator("#caught-tab-count").textContent()) === "0", "Caught tab did not start at zero");

await page.locator(".pokemon-card[data-number='1'] .caught-button").click();
await check((await page.locator("#caught-tab-count").textContent()) === "1", "Caught tab count did not update");
await check((await page.locator("#collection-caught-count").textContent()) === "1", "Collection summary did not update");

await page.locator(".view-tab[data-view='caught']").click();
await check(await page.locator("#view-caught").evaluate((element) => element.classList.contains("is-active")), "Caught view did not open");
await page.locator("[data-collection-status='caught']").click();
await check((await page.locator(".collection-card").count()) === 1, "Caught filter did not show one caught Pokémon");
await check(
  (await page.locator(".collection-card__copy strong").textContent()) === "Gothita",
  "Caught filter showed the wrong Pokémon",
);
await page.locator("[data-collection-status='missing']").click();
await check((await page.locator(".collection-card").count()) === 326, "Missing filter did not exclude caught Pokémon");
await page.locator("#collection-search").fill("Raticate");
await check((await page.locator(".collection-card").count()) === 1, "Collection search did not find Raticate");
await page.locator(".collection-card__jump").click();
await page.waitForTimeout(500);
await check(page.url().endsWith("#pokemon-11"), "Collection jump did not open the full card");

await page.locator(".view-tab[data-view='caught']").click();
await page.locator("[data-collection-status='all']").click();
await page.locator("#collection-search").fill("Smoliv");
await check((await page.locator(".collection-card").count()) === 1, "Pokerex-only Smoliv entry is missing");
await page.locator(".collection-card__toggle").click();
await check((await page.locator("#caught-tab-count").textContent()) === "2", "Pokerex-only caught entry did not update progress");
await page.locator(".collection-card__jump").click();
await page.waitForTimeout(500);
await check(
  await page.locator("#view-locations").evaluate((element) => element.classList.contains("is-active")),
  "Pokerex-only collection entry did not open encounter details",
);

await page.locator(".view-tab[data-view='dex']").click();
await page.locator("#type-filter").selectOption("psychic");
await check(
  (await page.locator(".pokemon-card .pokemon-types").allTextContents()).every((text) =>
    text.toLowerCase().includes("psychic"),
  ),
  "Type filter included a non-Psychic Pokémon",
);
await page.locator("#clear-filters").click();

await page.locator(".quick-location", { hasText: /^Route 1$/ }).click();
await check((await page.locator("#location-filter").inputValue()) === "Route 1", "Quick location did not sync filter");
await check(
  (await page.locator(".pokemon-card .pokemon-location").allTextContents()).every((text) => text.includes("Route 1")),
  "Quick location showed a Pokémon from another location",
);

await page.locator(".view-tab[data-view='locations']").click();
await page.locator("#location-search").fill("");
await check((await page.locator(".location-card").count()) === 38, "Expected 38 Pokerex encounter maps");
await page.locator("#location-search").fill("Route 1");
await check((await page.locator(".location-card").count()) === 1, "Location search did not isolate Route 1");
await check((await page.locator(".location-map img").count()) === 1, "Route 1 map image is missing");
await check((await page.locator(".encounter-method").count()) === 1, "Route 1 encounter method is missing");
await check(
  (await page.locator(".location-pokemon", { hasText: "Alolan Rattata" }).textContent()).includes("40%"),
  "Route 1 Rattata encounter rate is incorrect",
);
await page.locator(".location-card").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-location-map.png"), fullPage: false });

await page.locator(".view-tab[data-view='dex']").click();
await page.locator(".pokemon-card .evolution-link", { hasText: "Raticate" }).first().click();
await page.waitForTimeout(500);
await check(page.url().endsWith("#pokemon-11"), "Evolution link did not update the card URL");
await check((await page.locator(".pokemon-card").count()) === 315, "Evolution link did not clear active filters");
await check(
  await page.locator(".pokemon-card[data-number='11']").evaluate((element) => element.classList.contains("is-highlighted")),
  "Evolution target was not highlighted",
);

const initialTheme = await page.locator("html").getAttribute("data-theme");
await page.locator("#theme-toggle").click();
await check(
  (await page.locator("html").getAttribute("data-theme")) !== initialTheme,
  "Theme toggle did not change theme",
);
await page.locator("#view-dex").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outputDir, "guide-desktop-controls.png"), fullPage: false });
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
await page.waitForTimeout(300);
await page.locator("#back-to-top").click();
await page.waitForFunction(() => window.scrollY < 50, null, { timeout: 10000 });
await check((await page.evaluate(() => window.scrollY)) < 50, "Back-to-top button did not return to page top");
await page.locator(".view-tab[data-view='caught']").click();
await page.locator("[data-collection-status='all']").click();
await page.locator("#collection-search").fill("");
await page.screenshot({ path: path.join(outputDir, "guide-desktop-collection.png"), fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await check((await page.locator(".pokemon-card").count()) === 315, "Mobile view did not render all cards");
await page.locator(".view-tab[data-view='caught']").click();
await check((await page.locator(".collection-card").count()) === 327, "Mobile collection did not render all cards");
await page.locator("#view-caught").scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-collection.png"), fullPage: false });
await page.locator(".view-tab[data-view='locations']").click();
await page.locator("#location-search").fill("Route 1");
await page.locator(".location-card").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-mobile-location-map.png"), fullPage: false });

await browser.close();
if (errors.length) throw new Error(errors.join("\n"));
console.log(
  JSON.stringify(
    {
      status: "Browser guide test passed",
      cards: 315,
      regionalBadges: 38,
      quickLocations: 36,
      encounterMaps: 38,
      collectionEntries: 327,
      screenshots: [
        "tmp/guide-desktop-controls.png",
        "tmp/guide-desktop-collection.png",
        "tmp/guide-desktop-location-map.png",
        "tmp/guide-mobile-collection.png",
        "tmp/guide-mobile-location-map.png",
      ],
    },
    null,
    2,
  ),
);
