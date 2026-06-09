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
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`Console: ${message.text()}`);
});
page.on("pageerror", (error) => errors.push(`Page: ${error.message}`));

const check = async (condition, message) => {
  const passed = typeof condition === "function" ? await condition() : condition;
  if (!passed) throw new Error(message);
};

await page.goto(guideUrl);
await page.evaluate(() => localStorage.clear());
await page.reload();
await check((await page.title()) === "Dreamstone Field Guide", "Unexpected page title");
await check((await page.locator("link[rel='manifest']").getAttribute("href")) === "site.webmanifest", "Web app manifest is missing");
await check(
  (await page.locator("meta[property='og:image']").getAttribute("content")).endsWith(
    "/assets/art/dreamstone-social-preview.png",
  ),
  "Dreamstone social preview metadata is missing",
);
await check((await page.locator("link[rel='apple-touch-icon']").count()) === 5, "Apple touch icons are missing");
await check(
  JSON.stringify(
    (await page.locator(".view-tab").allTextContents()).map((text) => text.replace(/\s+/g, " ").trim()),
  ) ===
    JSON.stringify([
      "Full Dex",
      "Locations",
      "Caught 0",
      "Team Builder",
      "Moves",
      "Abilities",
      "Mega Choices",
      "Important Items",
      "Save & Sync",
    ]),
  "Primary tabs are not in the expected order",
);
await check((await page.locator("[data-clear-search]").count()) === 5, "Search clear buttons are missing");
await check(
  (await page.locator("meta[name='apple-mobile-web-app-capable']").getAttribute("content")) === "yes",
  "Apple standalone metadata is missing",
);
await check(
  (await page.locator(".hero__logo").evaluate((element) => element.naturalWidth)) === 1000,
  "Dreamstone hero logo did not load",
);
await check(
  (await page.locator(".hero").evaluate((element) => getComputedStyle(element).backgroundImage)).includes(
    "dreamstone-hero.png",
  ),
  "Dreamstone masthead artwork is missing",
);
await page.screenshot({ path: path.join(outputDir, "guide-desktop-masthead.png"), fullPage: false });
await check((await page.locator(".pokemon-card").count()) === 315, "Expected all 315 Pokémon cards");
await check(
  (await page.locator(".pokemon-card[data-number='1'] .type-badge").allTextContents()).includes("psychic"),
  "Gothita is missing its Psychic type badge",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .pokemon-bst").textContent()) === "290",
  "Gothita is missing its Pokerex BST",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .pokemon-stat").count()) === 7,
  "Gothita is missing its base-stat bars",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .pokemon-stat--spa strong").textContent()) === "55",
  "Gothita Special Attack is incorrect",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .pokemon-stat--bst .pokemon-stat__fill").evaluate(
    (element) => element.style.width,
  )).startsWith("40.2"),
  "Gothita BST bar is not scaled against 720",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .team-matchups__empty").textContent()).includes(
    "Team Builder",
  ),
  "Empty team coverage guidance is missing",
);
await check((await page.locator(".pokemon-stats header small").count()) === 0, "Stat-scale caption is still visible");
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
await check(
  !(await page.locator("body").evaluate((element) => element.classList.contains("notes-hidden"))),
  "Field notes were hidden by default",
);
await check(
  (await page.locator(".pokemon-card[data-number='17'] .pokemon-note p").evaluate(
    (element) => getComputedStyle(element).filter,
  )) === "none",
  "Visible field note is still blurred",
);
await page.locator("#spoiler-toggle").click();
await check(
  (await page.locator(".pokemon-card[data-number='17'] .pokemon-note p").evaluate(
    (element) => getComputedStyle(element).filter,
  )) !== "none",
  "Notes toggle did not hide field notes",
);
await page.locator("#spoiler-toggle").click();
await check(
  (await page.locator(".pokemon-card[data-number='1'] .pokemon-location-label").textContent()) === "Starter",
  "Special location label is missing",
);
await page.locator(".pokemon-card[data-number='17'] .pokemon-location-link", { hasText: /^Route 1$/ }).click();
await page.waitForTimeout(500);
await check(
  await page.locator("#view-locations").evaluate((element) => element.classList.contains("is-active")),
  "Pokémon location link did not open the Locations tab",
);
await check((await page.locator("#location-search").inputValue()) === "Route 1", "Location link did not select Route 1");
await check((await page.locator(".location-card").count()) === 1, "Location link did not isolate its encounter map");
await page.locator(".view-tab[data-view='dex']").click();
await check((await page.locator(".quick-location").count()) === 36, "Unexpected quick-location count");
await check(
  await page.evaluate(() => {
    const chips = [...document.querySelectorAll(".quick-location")]
      .slice(1)
      .map((element) => element.textContent);
    const locationOrder = [...new Set(window.DREAMSTONE_ENCOUNTERS.locations.map((location) => location.name))];
    return JSON.stringify(chips) === JSON.stringify(locationOrder);
  }),
  "Quick locations do not match the Locations tab order",
);
await check((await page.locator(".collection-card").count()) === 327, "Expected all 327 collection cards");
await check((await page.locator("#total-count").textContent()) === "327", "Capture total did not include Pokerex wild entries");
await check((await page.locator("#caught-tab-count").textContent()) === "0", "Caught tab did not start at zero");
await page.locator("#search").fill("Gothita");
await check(!(await page.locator("[data-clear-search='#search']").isHidden()), "Dex search clear button did not appear");
await page.locator("[data-clear-search='#search']").click();
await check((await page.locator(".pokemon-card").count()) === 315, "Dex search clear button did not clear the search");

await page.locator(".view-tab[data-view='team']").click();
await check(await page.locator("#view-team").evaluate((element) => element.classList.contains("is-active")), "Team Builder view did not open");
await check((await page.locator(".team-card").count()) === 6, "Team Builder did not render six slots");
await check((await page.locator(".team-card__empty").count()) === 6, "Team Builder did not start with six empty slots");
await page.locator(".team-card[data-slot='1'] .team-pokemon-picker select").selectOption("1");
await check(
  (await page.locator(".team-card[data-slot='1'] h3").textContent()) === "Gothita",
  "Team slot did not select Gothita",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .pokemon-stat").count()) === 7,
  "Team card is missing Gothita's base stats",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-pokemon-types").textContent()).includes("psychic"),
  "Team card is missing Gothita's type",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__ability select option").count()) === 4,
  "Team card is missing Gothita's ability choices",
);
await page.locator(".team-card[data-slot='1'] .team-card__ability select").selectOption("119");
await check(
  (await page.locator(".team-card[data-slot='1'] .team-ability-details").textContent()).includes("Checks a foe's item."),
  "Selected team ability details are missing",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-slot").count()) === 4,
  "Team card does not contain four move slots",
);
await page.locator(".team-card[data-slot='1'] .team-move-slot").first().locator("select").selectOption("212");
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-details").textContent()).includes("Mean Look"),
  "Selected team move details are missing",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-details").textContent()).includes("Accuracy"),
  "Selected team move accuracy is missing",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-details__effect").count()) === 1,
  "Selected team move effect is missing",
);
await page.locator(".team-card[data-slot='1'] .team-move-slot").nth(1).locator("select").selectOption("247");
await page.locator(".team-card[data-slot='1'] .team-move-slot").nth(2).locator("select").selectOption("85");
await page.locator(".team-card[data-slot='1'] .team-evolve-button", { hasText: "Gothorita" }).click();
await check(
  (await page.locator(".team-card[data-slot='1'] h3").textContent()) === "Gothorita",
  "Team evolution button did not select Gothorita",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-slot").first().locator("select").inputValue()) === "212",
  "Team evolution did not retain the selected move",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-retained").textContent()) === "Retained after change",
  "Move retained after evolution was not labelled",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__ability select").inputValue()) === "",
  "Evolution did not reset the selected ability",
);
await page.locator(".team-card[data-slot='1'] .team-card__ability select").selectOption("119");
await page.locator(".view-tab[data-view='dex']").click();
const gothitaCoverage = page.locator(".pokemon-card[data-number='1'] .team-matchup");
await check((await gothitaCoverage.count()) === 1, "Gothita coverage did not show exactly one super-effective move");
await check(
  (await gothitaCoverage.textContent()).includes("Gothorita") &&
    (await gothitaCoverage.textContent()).includes("Shadow Ball") &&
    (await gothitaCoverage.textContent()).includes("2x") &&
    (await gothitaCoverage.textContent()).includes("80") &&
    (await gothitaCoverage.textContent()).includes("100%"),
  "Gothita coverage is missing the attacker, move, effectiveness, power, or accuracy",
);
await check(
  !(await gothitaCoverage.textContent()).includes("Mean Look"),
  "Status move Mean Look was incorrectly included in Dex coverage",
);
await check(
  (await page.locator(".pokemon-card[data-number='249'] .team-matchup").textContent()).includes("4x"),
  "Dual-type 4x effectiveness is missing for Wingull",
);
await check(
  (await page.locator(".pokemon-card[data-number='93'] .team-matchup").count()) === 0,
  "Ghost move incorrectly bypassed Hisuian Zorua's Normal-type immunity",
);
await page.locator(".pokemon-card[data-number='1'] .team-matchups").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-team-coverage.png"), fullPage: false });
await page.locator(".view-tab[data-view='team']").click();
await page.locator(".team-card[data-slot='1']").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-team-builder.png"), fullPage: false });

await page.locator(".view-tab[data-view='save']").click();
await check(
  await page.locator("#view-save").evaluate((element) => element.classList.contains("is-active")),
  "Save & Sync view did not open",
);
await check((await page.locator("#save-team-count").textContent()) === "1", "Save summary did not include the team");
await check(await page.locator("#upload-cloud-save").isDisabled(), "Cloud upload was enabled without an endpoint");
await check(await page.locator("#download-cloud-save").isDisabled(), "Cloud download was enabled without an endpoint");
const downloadPromise = page.waitForEvent("download");
await page.locator("#export-save").click();
const saveDownload = await downloadPromise;
const saveBuffer = await fs.readFile(await saveDownload.path());
const exportedSave = JSON.parse(saveBuffer.toString("utf8"));
await check(exportedSave.format === "dreamstone-field-guide-save", "Exported save has an unexpected format");
await check(exportedSave.version === 1, "Exported save has an unexpected version");
await check(exportedSave.team[0].pokemonNumber === 2, "Exported save is missing Gothorita");
await check(exportedSave.team[0].moves[1] === 247, "Exported save is missing Shadow Ball");
await check(exportedSave.team[0].abilityId === 119, "Exported save is missing Frisk");
await page.locator("#create-sync-code").click();
await check(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    await page.locator("#sync-code").inputValue(),
  ),
  "Generated sync UUID is invalid",
);
await check(
  await page.evaluate(async () => {
    const code = crypto.randomUUID();
    const save = createSaveDocument();
    const encrypted = await encryptSave(save, code);
    const decrypted = await decryptSave(encrypted.envelope, code);
    return encrypted.id.length === 64 && decrypted.format === save.format && decrypted.team.length === 6;
  }),
  "Client-side save encryption round trip failed",
);
await page.locator(".view-tab[data-view='team']").click();
await page.locator(".team-card[data-slot='1'] .team-card__clear").click();
await check((await page.locator(".team-card__empty").count()) === 6, "Team did not clear before import test");
page.once("dialog", (dialog) => dialog.accept());
await page.locator("#import-save-file").setInputFiles({
  name: "dreamstone-test-save.json",
  mimeType: "application/json",
  buffer: saveBuffer,
});
await check(
  (await page.locator(".team-card[data-slot='1'] h3").textContent()) === "Gothorita",
  "Imported save did not restore the team",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__ability select").inputValue()) === "119",
  "Imported save did not restore the selected ability",
);

await page.locator(".view-tab[data-view='moves']").click();
await check(await page.locator("#view-moves").evaluate((element) => element.classList.contains("is-active")), "Moves view did not open");
await check((await page.locator(".move-card").count()) === 100, "Moves view did not render its first 100 moves");
await check((await page.locator(".move-card").first().locator("h3").textContent()) === "Pound", "First move is not Pound");
await check(
  (await page.locator(".move-card").first().locator(".move-card__metrics").textContent()).includes("40"),
  "Pound power is missing",
);
await page.locator(".move-card").first().locator(".move-learners summary").click();
await check(
  (await page.locator(".move-card").first().locator(".move-learner.is-linked", { hasText: "Gothita" }).textContent()).includes(
    "Lv. 1",
  ),
  "Pound learner details are missing Gothita's level",
);
await page.locator(".move-card").first().locator(".move-learner.is-linked", { hasText: /^Gothita/ }).click();
await page.waitForTimeout(500);
await check(page.url().endsWith("#pokemon-1"), "Move learner link did not open Gothita's Dex card");
await page.locator(".view-tab[data-view='moves']").click();
await page.locator("#move-search").fill("Moongeist Beam");
await check((await page.locator(".move-card").count()) === 1, "Move search did not isolate Moongeist Beam");
await check(
  (await page.locator(".move-card").locator(".move-category").textContent()) === "Special",
  "Moongeist Beam category is incorrect",
);
await check(!(await page.locator("[data-clear-search='#move-search']").isHidden()), "Move search clear button did not appear");
await page.locator("[data-clear-search='#move-search']").click();
await check((await page.locator(".move-card").count()) === 100, "Move search clear button did not clear the search");
await page.locator("#clear-move-filters").click();
await page.locator("#move-type-filter").selectOption("Fire");
await check(
  (await page.locator(".move-card .type-badge").allTextContents()).every((type) => type === "Fire"),
  "Move type filter included a non-Fire move",
);
await page.locator("#clear-move-filters").click();
await page.locator("#show-more-moves").click();
await check((await page.locator(".move-card").count()) === 200, "Show more moves did not reveal the next page");
await page.locator("[data-move-mode='tutors']").click();
await check((await page.locator(".move-card").count()) === 19, "Move tutors view did not render all 19 tutors");
await check(
  (await page.locator(".move-tutor-locations").count()) === 19,
  "Move tutor cards are missing tutor locations",
);
await check(
  (await page.locator(".move-card", { hasText: "Aurora Veil" }).textContent()).includes("Vilethorn Woods"),
  "Aurora Veil tutor location is missing",
);
await page.screenshot({ path: path.join(outputDir, "guide-desktop-move-tutors.png"), fullPage: false });
await page.locator("[data-move-mode='all']").click();
await page.locator("#view-moves .section-heading").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-moves.png"), fullPage: false });

await page.locator(".view-tab[data-view='abilities']").click();
await check(
  await page.locator("#view-abilities").evaluate((element) => element.classList.contains("is-active")),
  "Abilities view did not open",
);
await check((await page.locator(".ability-card").count()) === 310, "Abilities view did not render all 310 abilities");
await check((await page.locator(".ability-card").first().locator("h3").textContent()) === "Stench", "First ability is not Stench");
await page.locator("#ability-search").fill("Frisk");
await check((await page.locator(".ability-card").count()) === 1, "Ability search did not isolate Frisk");
await check(
  (await page.locator(".ability-card").textContent()).includes("Checks a foe's item."),
  "Frisk description is missing",
);
await page.locator(".ability-card .ability-users summary").click();
await page.waitForTimeout(100);
await check(
  (await page.locator(".ability-user.is-linked").allTextContents()).includes("Gothita"),
  "Frisk is missing its linked Gothita user",
);
await check(!(await page.locator("[data-clear-search='#ability-search']").isHidden()), "Ability search clear button did not appear");
await page.locator("[data-clear-search='#ability-search']").click();
await check((await page.locator(".ability-card").count()) === 310, "Ability search clear button did not clear the search");
await page.locator("#view-abilities .section-heading").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-abilities.png"), fullPage: false });

await page.locator(".view-tab[data-view='dex']").click();
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
await check(
  !(await page.locator("[data-clear-search='#collection-search']").isHidden()),
  "Collection search clear button did not appear",
);
await page.locator("[data-clear-search='#collection-search']").click();
await check((await page.locator(".collection-card").count()) === 326, "Collection search clear button did not clear the search");
await page.locator("#collection-search").fill("Raticate");
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
await check(
  !(await page.locator("[data-clear-search='#location-search']").isHidden()),
  "Location search clear button did not appear",
);
await page.locator("[data-clear-search='#location-search']").click();
await check((await page.locator(".location-card").count()) === 38, "Location search clear button did not clear the search");
await page.locator("#location-search").fill("Route 1");
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
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.screenshot({ path: path.join(outputDir, "guide-mobile-masthead.png"), fullPage: false });
await check((await page.locator(".pokemon-card").count()) === 315, "Mobile view did not render all cards");
await page.locator(".view-tab[data-view='team']").click();
await check(
  (await page.locator(".team-card[data-slot='1'] h3").textContent()) === "Gothorita",
  "Saved team did not persist after reload",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-slot").first().locator("select").inputValue()) === "212",
  "Saved team move did not persist after reload",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-slot").nth(1).locator("select").inputValue()) === "247",
  "Saved damage move did not persist after reload",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-move-slot").nth(2).locator("select").inputValue()) === "85",
  "Saved dual-type coverage move did not persist after reload",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__ability select").inputValue()) === "119",
  "Saved team ability did not persist after reload",
);
await page.locator(".view-tab[data-view='save']").click();
await check(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    await page.locator("#sync-code").inputValue(),
  ),
  "Sync UUID did not persist after reload",
);
await page.locator("#view-save").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-mobile-save-sync.png"), fullPage: false });
await page.locator(".view-tab[data-view='team']").click();
await page.locator(".team-card[data-slot='1']").scrollIntoViewIfNeeded();
await check(
  await page.locator(".team-card[data-slot='1']").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile team card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-team-builder.png"), fullPage: false });
await page.locator(".view-tab[data-view='dex']").click();
await page.locator(".pokemon-card[data-number='1']").scrollIntoViewIfNeeded();
await check(
  await page.locator(".pokemon-card[data-number='1']").evaluate(
    (element) => element.scrollWidth <= element.clientWidth,
  ),
  "Mobile stat card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-dex-stats.png"), fullPage: false });
await page.locator(".pokemon-card[data-number='1'] .team-matchups").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-mobile-team-coverage.png"), fullPage: false });
await page.locator(".view-tab[data-view='moves']").click();
await page.locator("#move-search").fill("Pound");
await page.locator(".move-card .move-learners summary").click();
await page.locator(".move-card").scrollIntoViewIfNeeded();
await check(
  await page.locator(".move-card").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile move card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-moves.png"), fullPage: false });
await page.locator(".view-tab[data-view='abilities']").click();
await page.locator("#ability-search").fill("Frisk");
await page.locator(".ability-card").scrollIntoViewIfNeeded();
await check(
  await page.locator(".ability-card").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile ability card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-abilities.png"), fullPage: false });
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
        "tmp/guide-desktop-masthead.png",
        "tmp/guide-desktop-collection.png",
        "tmp/guide-desktop-location-map.png",
        "tmp/guide-desktop-moves.png",
        "tmp/guide-desktop-move-tutors.png",
        "tmp/guide-desktop-abilities.png",
        "tmp/guide-desktop-team-builder.png",
        "tmp/guide-desktop-team-coverage.png",
        "tmp/guide-mobile-dex-stats.png",
        "tmp/guide-mobile-masthead.png",
        "tmp/guide-mobile-moves.png",
        "tmp/guide-mobile-abilities.png",
        "tmp/guide-mobile-team-builder.png",
        "tmp/guide-mobile-team-coverage.png",
        "tmp/guide-mobile-save-sync.png",
        "tmp/guide-mobile-collection.png",
        "tmp/guide-mobile-location-map.png",
      ],
    },
    null,
    2,
  ),
);
