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

const checkGlobalBackToTop = async (viewName) => {
  await page.locator(`.view-tab[data-view='${viewName}']`).click();
  const jumpToTop = page.locator(`#view-${viewName}.is-active .jump-to-top`);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await check(
    await jumpToTop.isVisible(),
    `Jump to Top control is not visible at the top of ${viewName}`,
  );
  await check(
    (await jumpToTop.getAttribute("href")) === "#page-top",
    `Jump to Top control is not linked to the page top in ${viewName}`,
  );
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await check(
    (await jumpToTop.getAttribute("aria-label")) === "Jump to top",
    `Jump to Top control is missing from ${viewName}`,
  );
  await jumpToTop.click();
  await page.waitForFunction(() => window.scrollY < 50, null, { timeout: 10000 });
};

const checkDashboardTeamFill = async (viewportName) => {
  const metrics = await page.locator(".journey-card--team").evaluate((card) => {
    const team = card.querySelector(".dashboard-team");
    const cardStyle = getComputedStyle(card);
    const cardRect = card.getBoundingClientRect();
    const teamRect = team.getBoundingClientRect();
    return {
      leftGap: teamRect.left - cardRect.left - parseFloat(cardStyle.paddingLeft),
      rightGap: cardRect.right - parseFloat(cardStyle.paddingRight) - teamRect.right,
    };
  });
  await check(
    Math.abs(metrics.leftGap) < 2 && Math.abs(metrics.rightGap) < 2,
    `${viewportName} dashboard team does not fill the card content width`,
  );
};

const checkTeamIdentityFit = async (cardSelector, label) => {
  const metrics = await page.locator(cardSelector).evaluate((card) => {
    const name = card.querySelector(".team-card__identity h3");
    const well = card.querySelector(".team-sprite-well");
    const sprite = well.querySelector("img");
    const range = document.createRange();
    range.selectNodeContents(name);
    const wellRect = well.getBoundingClientRect();
    const spriteRect = sprite.getBoundingClientRect();
    return {
      nameLines: range.getClientRects().length,
      nameFits: name.scrollWidth <= name.clientWidth + 1,
      nameSize: Number.parseFloat(getComputedStyle(name).fontSize),
      spriteInsets: [
        spriteRect.left - wellRect.left,
        wellRect.right - spriteRect.right,
        spriteRect.top - wellRect.top,
        wellRect.bottom - spriteRect.bottom,
      ],
    };
  });
  await check(
    metrics.nameLines === 1 && metrics.nameFits,
    `${label} Pokemon name does not fit on one line: ${JSON.stringify(metrics)}`,
  );
  await check(
    metrics.spriteInsets.every((inset) => inset >= 4),
    `${label} sprite is too large for its background well: ${JSON.stringify(metrics.spriteInsets)}`,
  );
};

const checkAlignedGridCards = async (gridSelector, cardSelector, sectionSelectors, label) => {
  const grids = page.locator(gridSelector);
  const gridCount = await grids.count();
  for (let gridIndex = 0; gridIndex < gridCount; gridIndex += 1) {
    const result = await grids.nth(gridIndex).evaluate(
      (grid, { cardSelector, sectionSelectors }) => {
        const cards = [...grid.querySelectorAll(cardSelector)].filter((card) => {
          const rect = card.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        const rows = [];
        cards.forEach((card) => {
          const top = card.getBoundingClientRect().top;
          const row = rows.find((candidate) => Math.abs(candidate.top - top) < 2);
          if (row) row.cards.push(card);
          else rows.push({ top, cards: [card] });
        });
        const comparableRows = rows.filter((row) => row.cards.length > 1).slice(0, 3);
        if (!comparableRows.length) return { checked: false };
        for (const row of comparableRows) {
          const heights = row.cards.map((card) => card.getBoundingClientRect().height);
          if (Math.max(...heights) - Math.min(...heights) >= 2) {
            return { checked: true, issue: `card heights ${JSON.stringify(heights)}` };
          }
          for (const selector of sectionSelectors) {
            const offsets = row.cards.map((card) => {
              const section = card.querySelector(selector);
              if (!section) return null;
              return section.getBoundingClientRect().top - card.getBoundingClientRect().top;
            });
            if (offsets.some((offset) => offset === null)) {
              return { checked: true, issue: `${selector} is missing from a card` };
            }
            if (Math.max(...offsets) - Math.min(...offsets) >= 2) {
              return { checked: true, issue: `${selector} offsets ${JSON.stringify(offsets)}` };
            }
          }
        }
        return { checked: true, issue: "" };
      },
      { cardSelector, sectionSelectors },
    );
    if (!result.checked) continue;
    await check(!result.issue, `${label} cards are not uniformly aligned: ${result.issue}`);
    return;
  }
  throw new Error(`${label} alignment check could not find a multi-card row`);
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
      "Trainers",
      "Gym Leaders",
      "Team Builder",
      "Team Planner",
      "Moves",
      "Abilities",
      "Mega Choices",
      "Items",
      "Save & Sync",
    ]),
  "Primary tabs are not in the expected order",
);
await check((await page.locator(".view-tab__icon").count()) === 12, "Guide menu icons are incomplete");
await check((await page.locator("#view-menu-heading").textContent()) === "Menu", "Guide menu heading is missing");
await check((await page.locator(".view-tab img").count()) === 0, "Guide menu still uses raster sprite icons");
await check(
  await page.locator(".view-tab__icon").first().evaluate((element) => getComputedStyle(element).backgroundImage === "none"),
  "Guide menu icons still have an inner background box",
);
await check(
  await page.locator(".view-tabs").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Desktop guide menu has horizontal overflow",
);
await check(
  (await page.locator(".view-tab.is-active").getAttribute("aria-current")) === "page",
  "Active guide menu item is missing aria-current",
);
await checkDashboardTeamFill("Desktop");
await check((await page.locator("[data-clear-search]").count()) === 7, "Search clear buttons are missing");
await check((await page.locator(".source-note").count()) === 0, "Legacy source notices are still visible");
await check((await page.locator(".guide-tip").count()) === 3, "Expected three compact guide tips");
await check((await page.locator(".stat-strip").count()) === 0, "Old guide-stat strip is still visible");
await check((await page.locator(".progress-panel").count()) === 0, "Redundant masthead capture progress is still visible");
await check((await page.locator(".journey-dashboard").count()) === 1, "Journey dashboard is missing");
await check((await page.locator(".dashboard-badge").count()) === 8, "Dashboard badge tracker is incomplete");
await check((await page.locator(".dashboard-badge .badge-sprite").count()) === 8, "Dashboard badge sprites are missing");
await check(
  (await page.locator(".dashboard-badge .badge-sprite").first().evaluate((element) => getComputedStyle(element).backgroundImage)).includes(
    "badges.png",
  ),
  "Badge sprite sheet did not load",
);
await check((await page.locator(".dashboard-team-slot").count()) === 6, "Dashboard team overview is incomplete");
await check((await page.locator(".sticky-tab-search").count()) === 6, "Sticky tab searches are missing");
await check(
  await page.locator(".sticky-tab-search").evaluateAll((elements) =>
    elements.every((element) => getComputedStyle(element).position === "sticky"),
  ),
  "A tab search bar is not sticky",
);
await check(
  !(await page.locator("#view-dex").textContent()).includes("If nothing appears after"),
  "Removed encounter-reporting note is still visible",
);
await check(
  !(await page.locator("main").textContent()).includes("Pokerex"),
  "Pokerex attribution is repeated inside a guide tab",
);
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
const desktopMastheadMetrics = await page.locator(".hero").evaluate((hero) => {
  const metric = (selector) => {
    const element = hero.querySelector(selector);
    return element ? Math.round(element.getBoundingClientRect().height * 10) / 10 : 0;
  };
  return {
    hero: metric(".hero__content") + metric(".topbar"),
    rendered: Math.round(hero.getBoundingClientRect().height * 10) / 10,
    topbar: metric(".topbar"),
    content: metric(".hero__content"),
    logo: metric(".hero__logo"),
    heading: metric("h1"),
    intro: metric(".hero__intro"),
  };
});
await check(
  desktopMastheadMetrics.rendered <= 450,
  `Desktop masthead is too tall (${JSON.stringify(desktopMastheadMetrics)})`,
);
await page.screenshot({ path: path.join(outputDir, "guide-desktop-masthead.png"), fullPage: false });
await check((await page.locator(".pokemon-card").count()) === 50, "Dex did not render its first 50 Pokémon");
await checkAlignedGridCards(
  ".pokemon-grid",
  ".pokemon-card",
  [
    ".pokemon-card__identity",
    ".pokemon-card__facts",
    ".pokemon-card__actions",
    ".pokemon-stats",
    ".team-matchups",
    ".pokemon-evolutions",
    ".pokemon-note",
  ],
  "Full Dex",
);
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
await page.locator("#sort").selectOption("bst-desc");
await check(
  await page.locator(".pokemon-bst").allTextContents().then((values) =>
    values.map(Number).every((value, index, entries) => index === 0 || entries[index - 1] >= value),
  ),
  "Descending BST sort is incorrect",
);
await page.locator("#sort").selectOption("bst-asc");
await check(
  await page.locator(".pokemon-bst").allTextContents().then((values) =>
    values.map(Number).every((value, index, entries) => index === 0 || entries[index - 1] <= value),
  ),
  "Ascending BST sort is incorrect",
);
await page.locator("#sort").selectOption("number");
await check(
  (await page.locator(".pokemon-card[data-number='1'] .team-matchups__empty").textContent()).includes(
    "Team Builder",
  ),
  "Empty team coverage guidance is missing",
);
await check((await page.locator(".pokemon-stats header small").count()) === 0, "Stat-scale caption is still visible");
await check(
  await page.evaluate(() =>
    [...document.querySelectorAll(".pokemon-card")].every((card) => {
      const pokemon = pokemonByNumber.get(Number(card.dataset.number));
      return card.querySelector(".region-badge").hidden === !pokemon.region;
    }),
  ),
  "A visible Dex card has the wrong regional badge state",
);
await check(
  (await page.locator(".pokemon-card[data-number='1'] .region-badge").evaluate(
    (element) => getComputedStyle(element).display,
  )) === "none",
  "Empty regional badge is visible",
);
await check(
  (await page.locator(".pokemon-name-row > .region-badge").count()) === 50,
  "Regional badges are not positioned beside Pokémon names",
);
await check(
  (await page.locator(".pokemon-types .region-badge").count()) === 0,
  "Regional badges are still grouped with Pokémon types",
);
await check(
  (await page.locator("#type-filter option[value='bug']").textContent()) === "Bug",
  "Type filter labels are not capitalized",
);
await check(
  (await page.locator("#availability-filter option[value='Evolution / special']").textContent()) === "Evolution",
  "Evolution availability label was not simplified",
);
await check(
  !(await page.locator("#view-dex").textContent()).includes("Evolve / special"),
  "Legacy evolution availability wording is still visible in the Dex",
);
await check((await page.locator(".learnset-button").count()) === 50, "Visible Dex learnset buttons are missing");
await page.locator(".pokemon-card[data-number='1'] .learnset-button").click();
await check(await page.locator("#learnset-dialog").isVisible(), "Gothita learnset dialog did not open");
await check(
  (await page.locator("#learnset-dialog-title").textContent()) === "Gothita learnset",
  "Learnset dialog has the wrong Pokémon",
);
await check((await page.locator(".learnset-entry").count()) > 10, "Gothita level-up learnset is incomplete");
await check(
  (await page.locator(".learnset-entry").first().textContent()).includes("Lv. 1") &&
    (await page.locator("#learnset-dialog").textContent()).includes("Pound") &&
    (await page.locator("#learnset-dialog").textContent()).includes("Psybeam"),
  "Gothita level-up learnset is missing expected levels or moves",
);
await page.screenshot({ path: path.join(outputDir, "guide-desktop-learnset.png"), fullPage: false });
await page.locator(".learnset-dialog__close").click();
await check(
  (await page.locator(".pokemon-card[data-number='1'] .evolves-to .evolution-link").allTextContents()).some(
    (text) => text.includes("Gothorita") && text.includes("Lv. 18"),
  ),
  "Gothita is missing its Dreamstone Lv. 18 Gothorita evolution link",
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
  (await page.locator(".pokemon-card[data-number='1'] .pokemon-location").textContent()) ===
    "No wild encounter listed",
  "PokÃ©mon without a Pokerex encounter did not receive the correct fallback",
);
await check(
  await page.evaluate(() =>
    [...document.querySelectorAll(".pokemon-card")].every((card) => {
      const pokemon = pokemonByNumber.get(Number(card.dataset.number));
      const expected = pokerexLocationsForPokemon(pokemon);
      const links = [...card.querySelectorAll(".pokemon-location-link")].map((link) => link.textContent);
      if (expected.length) return JSON.stringify(links) === JSON.stringify(expected);
      return links.length === 0 && card.querySelector(".pokemon-location").textContent === locationFallbackForPokemon(pokemon);
    }),
  ),
  "One or more Full Dex locations do not exactly match Pokerex encounter data",
);
await page.locator("#search").fill("Mt Ceram");
await check(
  (await page.locator(".pokemon-card[data-number='259']").count()) === 0,
  "Charizard was still searchable by its spreadsheet-only Mt Ceram location",
);
await page.locator("[data-clear-search='#search']").click();
await page.locator(".pokemon-card[data-number='17'] .pokemon-location-link", { hasText: /^Route 1$/ }).click();
await page.waitForTimeout(500);
await check(
  await page.locator("#view-locations").evaluate((element) => element.classList.contains("is-active")),
  "Pokémon location link did not open the Locations tab",
);
await check((await page.locator("#location-search").inputValue()) === "Route 1", "Location link did not select Route 1");
await check((await page.locator(".location-card").count()) === 1, "Location link did not isolate its encounter map");
await page.locator(".view-tab[data-view='dex']").click();
await check((await page.locator("#quick-location-list .quick-location").count()) === 36, "Unexpected quick-location count");
await check(
  await page.evaluate(() => {
    const chips = [...document.querySelectorAll("#quick-location-list .quick-location")]
      .slice(1)
      .map((element) => element.textContent);
    const locationOrder = [
      "Route 1",
      "Route 2",
      "Route 3",
      "Route 3 Underpass",
      "Route 3 Depths",
      "Route 4",
      "Route 5",
      "Route 6",
      "Route 7",
      "Route 8",
      "Fennilahl Tunnel",
      "Galecrest City",
      "Ivy Forest",
      "Ivy River",
      "Lily Grotto",
      "Lily Pond",
      "Map 1-9",
      "Map 2-25",
      "Map 2-26",
      "Map 2-27",
      "Mirroh Base Camp",
      "Mirroh Exterior",
      "Mt. Ceram",
      "Mt. Ceram Interior",
      "Mt. Mirroh",
      "Mt. Mirroh B1f",
      "Mt. Mirroh B2f",
      "Mt. Mirroh Peak",
      "Pelluca City",
      "Ranger Institute",
      "Rivetshore City",
      "Silversun City",
      "Static Cave",
      "Victory Road",
      "Vilethorn Woods",
    ];
    return JSON.stringify(chips) === JSON.stringify(locationOrder);
  }),
  "Quick locations do not match Pokerex's default order",
);
await check((await page.locator(".collection-card").count()) === 324, "Expected all 324 species collection cards");
await check(
  (await page.locator("#dashboard-total-count").textContent()) === "324",
  "Capture total did not condense regional forms by species",
);
await page.locator("#search").fill("Alolan Dugtrio");
await check((await page.locator(".pokemon-card").count()) === 1, "Dugtrio forms did not condense to one Dex card");
await check(
  (await page.locator(".pokemon-card[data-number='137'] .pokemon-form-select option").count()) === 2,
  "Dugtrio form selector did not include both forms",
);
await page.locator(".pokemon-card[data-number='137'] .pokemon-form-select").selectOption("species-id:964");
await check(
  (await page.locator(".pokemon-card[data-number='137'] .pokemon-types").textContent()).toLowerCase().includes("steel") &&
    (await page.locator(".pokemon-card[data-number='137'] .pokemon-stat--def strong").textContent()) === "60",
  "Alolan Dugtrio form did not update types and stats",
);
await page.locator(".pokemon-card[data-number='137'] .caught-button").click();
await check((await page.locator("#caught-tab-count").textContent()) === "1", "Dugtrio form catch did not count once");
await check(
  await page.evaluate(() => {
    const caught = JSON.parse(localStorage.getItem("dreamstone-field-guide-caught"));
    return caught.includes("species:dugtrio") && !caught.includes("137") && !caught.includes("rex-964");
  }),
  "Dugtrio form catch did not migrate to a species-level caught id",
);
await page.locator(".pokemon-card[data-number='137'] .caught-button").click();
await page.locator("[data-clear-search='#search']").click();
await check((await page.locator("#caught-tab-count").textContent()) === "0", "Caught tab did not start at zero");
const dexSearchPerformance = await page.evaluate(() => {
  const input = document.querySelector("#search");
  const reference = document.querySelector(".pokemon-card[data-number='1']");
  const timings = ["g", "go", "got", "goth", "gothi", "gothit", "gothita", ""].map((query) => {
    input.value = query;
    const start = performance.now();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return performance.now() - start;
  });
  return {
    max: Math.max(...timings),
    reused: document.querySelector(".pokemon-card[data-number='1']") === reference,
  };
});
await check(dexSearchPerformance.reused, "Full Dex search rebuilt cards instead of reusing them");
await check(
  dexSearchPerformance.max < 250,
  `Full Dex search update was too slow: ${dexSearchPerformance.max.toFixed(1)}ms`,
);
await page.locator("#search").fill("Gothita");
await check(!(await page.locator("[data-clear-search='#search']").isHidden()), "Dex search clear button did not appear");
await page.locator("[data-clear-search='#search']").click();
await check((await page.locator(".pokemon-card").count()) === 50, "Dex search clear button did not reset the first page");
await page.locator("#dex-load-more").scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelectorAll(".pokemon-card").length >= 100);
await check((await page.locator(".pokemon-card").count()) === 100, "Dex did not auto-load the next 50 Pokémon");
await page.locator("#search").fill("Gothita");
await page.locator("[data-clear-search='#search']").click();

await page.locator(".view-tab[data-view='trainers']").click();
await check((await page.locator(".trainer-location-group").count()) === 25, "Trainer locations are incomplete");
await check((await page.locator(".trainer-card").count()) === 0, "Collapsed trainer locations rendered hidden cards");
await check(
  (await page.locator(".trainer-location-group[open]").count()) === 0,
  "Trainer locations should initially be collapsed",
);
await page.locator("#expand-trainer-locations").click();
await check(
  (await page.locator(".trainer-location-group[open]").count()) === 25,
  "Expand all did not open every trainer location",
);
await check((await page.locator(".trainer-card").count()) === 127, "Playable trainer cards are incomplete");
await check(
  (await page.locator(".trainer-party-member").count()) ===
    (await page.locator(".trainer-party-matchups").count()),
  "A trainer party Pokémon is missing its team weakness overview",
);
await check(
  (await page.locator(".trainer-party-member__types .type-badge").count()) > 0,
  "Trainer party Pokémon types are missing",
);
await check(
  !(await page.locator("#view-trainers").textContent()).includes("None"),
  "Unclassified trainers still display the None class",
);
await checkAlignedGridCards(
  ".trainer-grid",
  ".trainer-card",
  [".trainer-card__header", ".trainer-party"],
  "Trainer",
);
await checkAlignedGridCards(
  ".trainer-party",
  ".trainer-party-member",
  [
    ".trainer-party-member__identity",
    ".trainer-party-member__item",
    ".trainer-party-moves",
    ".trainer-party-matchups",
  ],
  "Trainer party Pokemon",
);
await page.locator("#collapse-trainer-locations").click();
await check(
  (await page.locator(".trainer-location-group[open]").count()) === 0,
  "Collapse all did not close every trainer location",
);
await check((await page.locator(".trainer-card").count()) === 0, "Collapsed trainer locations retained hidden cards");
await page.locator("#trainer-search").fill("Bronzor");
await check(
  (await page.locator(".trainer-card").count()) > 0 &&
    (await page.locator(".trainer-location-group").count()) > 0 &&
    (await page.locator(".trainer-location-group:not([open])").count()) === 0,
  "Trainer party search did not find and auto-expand Bronzor matches",
);
await check(
  !(await page.locator("[data-clear-search='#trainer-search']").isHidden()),
  "Trainer search clear button did not appear",
);
await page.locator("[data-clear-search='#trainer-search']").click();
await page.locator("#trainer-quick-location-list .quick-location", { hasText: "Route 1" }).click();
await check(
  (await page.locator(".trainer-location-group").count()) === 1 &&
    (await page.locator(".trainer-location-group").first().getAttribute("data-location")) === "Route 1",
  "Trainer quick-location filter did not isolate Route 1",
);
await page.locator("#trainer-quick-location-list .quick-location", { hasText: "All" }).click();
await page.locator(".trainer-location-group").first().locator("summary").click();
await check(
  await page.locator(".trainer-card__portrait img").first().evaluate((image) => image.complete && image.naturalWidth > 0),
  "Trainer sprite did not load",
);
await page.locator("#view-trainers").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-trainers.png"), fullPage: false });
await page.locator(".view-tab[data-view='gyms']").click();
await check((await page.locator(".gym-leader-card").count()) === 8, "Gym Leaders tab did not render eight leaders");
await check((await page.locator(".gym-pokemon-card").count()) === 32, "Gym Leaders tab has an unexpected team size");
await check((await page.locator(".gym-leader-card__portrait img").count()) === 8, "Gym leader portraits are missing");
await check((await page.locator(".gym-pokemon-card .team-matchups").count()) === 32, "Gym team weakness sections are missing");
await checkAlignedGridCards(
  ".gym-team",
  ".gym-pokemon-card",
  [".gym-pokemon-card__identity", ".team-matchups"],
  "Gym team",
);
await page.locator(".gym-leader-card").first().locator(".gym-badge-toggle").click();
await check((await page.locator("#gym-badge-count").textContent()) === "1", "Gym badge count did not update");
await check((await page.locator("#dashboard-badge-count").textContent()) === "1", "Dashboard badge count did not update");
await check(
  JSON.parse(await page.evaluate(() => localStorage.getItem("dreamstone-field-guide-badges"))).includes("king"),
  "Obtained badge was not persisted",
);

await page.locator(".view-tab[data-view='team']").click();
await check(await page.locator("#view-team").evaluate((element) => element.classList.contains("is-active")), "Team Builder view did not open");
await check((await page.locator(".team-card").count()) === 6, "Team Builder did not render six slots");
await check((await page.locator(".team-card__empty").count()) === 6, "Team Builder did not start with six empty slots");
await check(
  (await page.locator("#team-offensive-coverage").textContent()).includes(
    "Choose damage-dealing moves to see your offensive type coverage.",
  ),
  "Empty Team Builder offensive coverage guidance is missing",
);
const teamPokemonSearch = page.locator(".team-card[data-slot='1'] .team-pokemon-search input");
await teamPokemonSearch.fill("Gothita");
await check(
  (await page.locator(".team-card[data-slot='1'] .team-pokemon-result").count()) === 1,
  "Team Pokemon search did not isolate Gothita",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-pokemon-result img").count()) === 1,
  "Team Pokemon search result is missing its sprite",
);
await teamPokemonSearch.scrollIntoViewIfNeeded();
await page.evaluate(() => window.scrollBy({ top: 420, behavior: "instant" }));
await page.screenshot({ path: path.join(outputDir, "guide-desktop-team-search.png"), fullPage: false });
await teamPokemonSearch.press("ArrowDown");
await teamPokemonSearch.press("Enter");
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
  (await page.locator(".team-card[data-slot='1'] .team-card__profile .pokemon-stat").count()) === 7,
  "Team card base stats are not positioned beside the Pokemon identity",
);
await checkTeamIdentityFit(".team-card[data-slot='1']", "Team Builder Gothita");
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__locations").count()) === 0,
  "Team Builder still displays a Where to find section",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__ability select option").count()) === 4,
  "Team card is missing Gothita's ability choices",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__ability label > span").textContent()) ===
    "Ability",
  "Team Builder ability selector has the wrong label",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__nature select option").count()) === 26,
  "Team Builder nature selector is missing nature choices",
);
await page.locator(".team-card[data-slot='1'] .team-card__nature select").selectOption("adamant");
await check(
  (await page.locator(".team-card[data-slot='1'] .team-nature-details").textContent()).includes(
    "Atk +10% · SpA -10%",
  ) &&
    (await page.locator(".team-card[data-slot='1'] .pokemon-stat--atk .pokemon-stat__nature-effect").textContent()) ===
      "+10%" &&
    (await page.locator(".team-card[data-slot='1'] .pokemon-stat--spa .pokemon-stat__nature-effect").textContent()) ===
      "-10%",
  "Adamant nature effects are not clearly shown on the Team Builder stats",
);
await page.evaluate(() => setTeamPokemon(1, 56));
await page.waitForTimeout(50);
await checkTeamIdentityFit(".team-card[data-slot='2']", "Team Builder Meganium");
await page.locator(".team-card[data-slot='2'] .team-card__profile").screenshot({
  path: path.join(outputDir, "guide-desktop-team-meganium-profile.png"),
});
await page.evaluate(() => setTeamPokemon(1, 17));
await check(
  (await page.locator(".team-card[data-slot='2'] .team-card__locations").count()) === 0,
  "A second Team Builder card still displays a Where to find section",
);
const teamAlignmentMetrics = await page.evaluate(() => {
  const cards = [1, 2].map((slot) => document.querySelector(`.team-card[data-slot='${slot}']`));
  const selectors = [
    ".team-card__profile",
    ".team-card__preferences",
    ".team-card__moves",
    ".team-card__evolutions",
  ];
  return Object.fromEntries(
    selectors.map((selector) => [
      selector,
      cards.map((card) => {
        const cardRect = card.getBoundingClientRect();
        return card.querySelector(selector).getBoundingClientRect().top - cardRect.top;
      }),
    ]),
  );
});
await check(
  Object.values(teamAlignmentMetrics).every((offsets) => Math.abs(offsets[0] - offsets[1]) < 2),
  `Filled Team Builder card sections are not uniformly aligned: ${JSON.stringify(teamAlignmentMetrics)}`,
);
await page.locator(".team-card[data-slot='2'] .team-card__clear").click();
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
await check(
  (await page.locator("#team-offensive-coverage header").textContent()).includes(
    "2 move types · 2 damaging moves",
  ),
  "Team Builder offensive coverage totals are incorrect",
);
await check(
  (await page.locator("#team-offensive-coverage .coverage-type--selected").allTextContents()).join(" ").includes(
    "Electric",
  ) &&
    (await page.locator("#team-offensive-coverage .coverage-type--selected").allTextContents()).join(" ").includes(
      "Ghost",
    ),
  "Team Builder offensive coverage is missing selected damaging move types",
);
await check(
  (await page.locator("#team-offensive-coverage .offensive-coverage__targets .type-badge").count()) === 4,
  "Team Builder super-effective type coverage is incorrect",
);
await page.locator(".team-card[data-slot='1'] .team-evolve-button", { hasText: "Gothorita" }).click();
await check(
  (await page.locator(".team-card[data-slot='1'] h3").textContent()) === "Gothorita",
  "Team evolution button did not select Gothorita",
);
await check(
  (await page.locator("#caught-tab-count").textContent()) === "1" &&
    JSON.parse(await page.evaluate(() => localStorage.getItem("dreamstone-field-guide-caught"))).includes("species:gothorita"),
  "Team evolution did not mark the evolved Pokemon as caught",
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
  await page.locator(".team-card[data-slot='1']").evaluate((card) => {
    const moves = card.querySelector(".team-card__moves");
    const evolution = card.querySelector(".team-card__evolutions");
    return Boolean(moves && evolution && moves.compareDocumentPosition(evolution) & Node.DOCUMENT_POSITION_FOLLOWING);
  }),
  "Team evolution action is not positioned at the bottom after moves",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__ability select").inputValue()) === "",
  "Evolution did not reset the selected ability",
);
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__nature select").inputValue()) === "adamant",
  "Evolution did not retain the selected nature",
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
await page.evaluate(() => {
  state.dexLimit = 249;
  renderDex();
});
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
await page.evaluate(() => renderDex(true));
await check(
  (await page.locator(".dashboard-team-slot.is-filled").count()) === 1,
  "Dashboard team overview did not update",
);
await check(
  await page.locator(".dashboard-team-slot.is-filled img").evaluate((element) => {
    const width = element.getBoundingClientRect().width;
    return width >= 70 && width <= 115;
  }),
  "Dashboard team sprite is outside the intended compact size",
);
await check(
  (await page.locator(".dashboard-team-slot.is-filled small").textContent()) === "Gothorita",
  "Dashboard team overview is missing the PokÃ©mon name",
);
await page.locator(".view-tab[data-view='trainers']").click();
await page.locator("#trainer-search").fill("Pidove");
const pidoveTrainerCoverage = page.locator(".trainer-party-member", { hasText: "Pidove" }).first().locator(".team-matchup");
await check(
  (await pidoveTrainerCoverage.count()) > 0 &&
    (await pidoveTrainerCoverage.textContent()).includes("Gothorita") &&
    (await pidoveTrainerCoverage.textContent()).includes("Thunderbolt") &&
    (await pidoveTrainerCoverage.textContent()).includes("2x"),
  "Trainer party weakness overview did not update from Team Builder moves",
);
await page.locator(".trainer-party-member", { hasText: "Pidove" }).first().scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-trainer-coverage.png"), fullPage: false });
await page.locator(".view-tab[data-view='gyms']").click();
await check(
  (await page.locator(".gym-pokemon-card .team-matchup").count()) > 0,
  "Gym cards did not update with team weakness coverage",
);
await page.locator("#view-gyms").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-gyms.png"), fullPage: false });
await page.locator(".view-tab[data-view='team']").click();
await page.locator(".team-card[data-slot='1']").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-team-builder.png"), fullPage: false });

await page.locator(".view-tab[data-view='planner']").click();
await check(await page.locator("#view-planner").evaluate((element) => element.classList.contains("is-active")), "Team Planner view did not open");
await check((await page.locator(".planner-card").count()) === 6, "Team Planner did not render six slots");
const plannerPokemonSearch = page.locator(".planner-card[data-slot='1'] .team-pokemon-search input");
await plannerPokemonSearch.fill("Gothita");
await plannerPokemonSearch.press("ArrowDown");
await plannerPokemonSearch.press("Enter");
await check(
  (await page.locator(".planner-card[data-slot='1'] h3").textContent()) === "Gothita",
  "Planner slot did not select Gothita",
);
await check(
  (await page.locator(".planner-card[data-slot='1'] .team-card__profile .pokemon-stat").count()) === 7,
  "Planner card base stats are not positioned beside the Pokemon identity",
);
await checkTeamIdentityFit(".planner-card[data-slot='1']", "Team Planner Gothita");
await page.evaluate(() => setPlannerPokemon(1, 56));
await page.waitForTimeout(50);
await checkTeamIdentityFit(".planner-card[data-slot='2']", "Team Planner Meganium");
await page.locator(".planner-card[data-slot='2'] .team-card__profile").screenshot({
  path: path.join(outputDir, "guide-desktop-planner-meganium-profile.png"),
});
const meganiumProgressFixture = await page.evaluate(() => {
  const ability = abilitiesByPokemon.get(56)[0].ability;
  const move = [...compatibleMoveIdsByPokemon.get(56)]
    .map((id) => moveById.get(id))
    .find((candidate) => candidate && candidate.category !== "Status");
  setTeamPokemon(1, 56);
  setPlannerPokemon(1, 56);
  setTeamAbility(1, ability.id);
  setPlannerAbility(1, ability.id);
  setTeamNature(1, "calm");
  setPlannerNature(1, "calm");
  setTeamMove(1, 0, move.id);
  setPlannerMove(1, 0, move.id);
  return { abilityName: ability.name, moveName: move.name };
});
let meganiumProgressText = await page.locator(".planner-progress-card", { hasText: "Meganium" }).textContent();
await check(
  meganiumProgressText.includes("100%") &&
    meganiumProgressText.includes(meganiumProgressFixture.abilityName) &&
    meganiumProgressText.includes(meganiumProgressFixture.moveName),
  "Planner progress did not mark a fully matched Meganium plan as complete",
);
await page.evaluate(() => setTeamMove(1, 0, null));
meganiumProgressText = await page.locator(".planner-progress-card", { hasText: "Meganium" }).textContent();
await check(
  !meganiumProgressText.includes("100%") &&
    meganiumProgressText.includes(`Needs ${meganiumProgressFixture.moveName}`),
  "Planner progress did not mark a missing planned move as pending",
);
await page.locator("#planner-progress").screenshot({ path: path.join(outputDir, "guide-desktop-planner-progress.png") });
await page.evaluate(() => {
  setTeamPokemon(1, null);
  setPlannerPokemon(1, null);
});
await check(
  (await page.locator(".planner-card[data-slot='1'] .planner-locations").count()) === 0,
  "Team Planner still displays a Where to find section",
);
await check(
  (await page.locator(".planner-card[data-slot='1'] .team-card__ability label > span").textContent()) ===
    "Preferred ability",
  "Team Planner preferred ability selector is missing",
);
await check(
  (await page.locator(".planner-card[data-slot='1'] .team-card__nature label > span").textContent()) ===
    "Preferred nature",
  "Team Planner preferred nature selector is missing",
);
await page.locator(".planner-card[data-slot='1'] .team-card__nature select").selectOption("timid");
await check(
  (await page.locator(".planner-card[data-slot='1'] .team-nature-details").textContent()).includes(
    "Spe +10% · Atk -10%",
  ) &&
    (await page.locator(".planner-card[data-slot='1'] .pokemon-stat--spd .pokemon-stat__nature-effect").textContent()) ===
      "+10%" &&
    (await page.locator(".planner-card[data-slot='1'] .pokemon-stat--atk .pokemon-stat__nature-effect").textContent()) ===
      "-10%",
  "Timid nature effects are not clearly shown on the Team Planner stats",
);
await check(
  (await page.locator(".planner-card[data-slot='1'] .planner-evolution-path").textContent()).includes(
    "Gothita",
  ) &&
    (await page.locator(".planner-card[data-slot='1'] .planner-evolution-path").textContent()).includes(
      "Gothorita",
    ) &&
    (await page.locator(".planner-card[data-slot='1'] .planner-evolution-path").textContent()).includes(
      "Gothitelle",
    ) &&
    (await page.locator(".planner-card[data-slot='1'] .planner-evolution-path").textContent()).includes(
      "Lv. 18",
    ) &&
    (await page.locator(".planner-card[data-slot='1'] .planner-evolution-path").textContent()).includes(
      "Lv. 36",
  ),
  "Team Planner is missing Gothita's Dreamstone evolution path",
);
await page
  .locator(".planner-card[data-slot='1'] .planner-evolution-node", { hasText: "Gothorita" })
  .click();
await check(
  (await page.locator(".planner-card[data-slot='1'] h3").textContent()) === "Gothorita",
  "Clicking a Team Planner evolution stage did not update the planned Pokemon",
);
await check(
  (await page.locator(".planner-card[data-slot='1'] .team-card__nature select").inputValue()) === "timid",
  "Changing a planned evolution stage did not retain the preferred nature",
);
await page
  .locator(".planner-card[data-slot='1'] .planner-evolution-node", { hasText: "Gothita" })
  .click();
await page.locator(".planner-card[data-slot='1'] .team-card__ability select").selectOption("119");
await check(
  (await page.locator(".planner-card[data-slot='1'] .team-ability-details").textContent()).includes(
    "Checks a foe's item.",
  ),
  "Selected planner preferred ability details are missing",
);
const plannerMoveOptions = await page.locator(".planner-card[data-slot='1'] .planner-move-slot").first().locator("option").allTextContents();
await check(plannerMoveOptions.some((text) => text.includes("Pound — Lv. 1")), "Planner move choices are missing level-up methods");
await check(plannerMoveOptions.some((text) => text.includes("Protect — Tutor: Vilethorn Woods")), "Planner move choices are missing tutor locations");
await check(plannerMoveOptions.some((text) => text.includes("Thunderbolt — TM / teachable")), "Planner move choices are missing TM / teachable methods");
await check(plannerMoveOptions.some((text) => text.includes("Mean Look — Egg")), "Planner move choices are missing egg methods");
await page.locator(".planner-card[data-slot='1'] .planner-move-slot").first().locator("select").selectOption("1");
await check(
  (await page.locator(".planner-card[data-slot='1'] .planner-move-methods").textContent()).includes("Lv. 1"),
  "Selected planner move is missing its learn method",
);
await check(
  (await page.locator("#planner-offensive-coverage header").textContent()).includes(
    "1 move type · 1 damaging move",
  ) &&
    (await page.locator("#planner-offensive-coverage .coverage-type--selected").textContent()).includes("Normal") &&
    (await page.locator("#planner-offensive-coverage .offensive-coverage__targets .type-badge").count()) === 0,
  "Team Planner offensive coverage did not update for Pound",
);
await check(
  await page.evaluate(() =>
    [
      "Mt Ceram",
      "Mt Ceram Caves",
      "Fennilahl Underpass",
      "Mirroh Interior B1F",
      "Mirroh Peak",
      "Mt Mirroh",
      "Mt Mirroh Interior B1F",
      "Mt Mirroh Interior B2F",
      "Mt Mirroh Peak",
      "Route 3 Caverns",
      "Route 3 Deeper",
      "Route 4 (Trolling Rod)",
      "Route 6 Ranger Institute",
      "Rivetshore Ranger Institute",
    ].every((location) => canonicalEncounterLocationName(location)),
  ),
  "A known encounter-map location alias is still unresolved",
);
await page.evaluate(() => setPlannerPokemon(1, 259));
await check(
  (await page.locator(".planner-card[data-slot='2'] .planner-locations").count()) === 0,
  "A second Team Planner card still displays a Where to find section",
);
await check(
  (await page.locator(".planner-card[data-slot='2'] .planner-evolution-path").count()) === 1,
  "Team Planner cards do not reserve a consistent evolution area",
);
await page.locator(".planner-card[data-slot='1']").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-team-planner.png"), fullPage: false });

await page.locator(".view-tab[data-view='megas']").click();
await check(
  (await page.locator(".mega-card").count()) === (await page.evaluate(() => data.megas.length)),
  "Mega Choices did not render every option",
);
await checkAlignedGridCards(".mega-grid", ".mega-card", ["img", "strong"], "Mega Choice");

await page.locator(".view-tab[data-view='save']").click();
await check(
  await page.locator("#view-save").evaluate((element) => element.classList.contains("is-active")),
  "Save & Sync view did not open",
);
await check((await page.locator("#save-team-count").textContent()) === "1", "Save summary did not include the team");
await check(await page.locator("#upload-cloud-save").isDisabled(), "Cloud upload was enabled without an endpoint");
await check(await page.locator("#download-cloud-save").isDisabled(), "Cloud download was enabled without an endpoint");
await check(
  await page.locator(".save-management-grid").evaluate((grid) => {
    const panels = [...grid.querySelectorAll(".save-panel")];
    const heights = panels.map((panel) => panel.getBoundingClientRect().height);
    const actionBottoms = panels.map((panel) => panel.querySelector(".save-actions").getBoundingClientRect().bottom);
    return Math.max(...heights) - Math.min(...heights) < 2 && Math.max(...actionBottoms) - Math.min(...actionBottoms) < 2;
  }),
  "Save & Sync panels or their action rows are not aligned",
);
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
await check(exportedSave.team[0].nature === "adamant", "Exported save is missing the selected team nature");
await check(exportedSave.planner[0].pokemonNumber === 1, "Exported save is missing the Team Planner shortlist");
await check(exportedSave.planner[0].moves[0] === 1, "Exported save is missing the planned move");
await check(exportedSave.planner[0].abilityId === 119, "Exported save is missing the preferred planner ability");
await check(exportedSave.planner[0].nature === "timid", "Exported save is missing the preferred planner nature");
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
await check(
  await page.evaluate(() => {
    const legacySave = createSaveDocument();
    delete legacySave.planner;
    legacySave.team.forEach((slot) => delete slot.nature);
    return validateSaveDocument(legacySave).planner.length === 6;
  }),
  "Older saves without a Team Planner are no longer compatible",
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
await check(
  (await page.locator(".team-card[data-slot='1'] .team-card__nature select").inputValue()) === "adamant",
  "Imported save did not restore the selected team nature",
);
await page.locator(".view-tab[data-view='planner']").click();
await check(
  (await page.locator(".planner-card[data-slot='1'] h3").textContent()) === "Gothita" &&
    (await page.locator(".planner-card[data-slot='1'] .planner-move-slot").first().locator("select").inputValue()) === "1" &&
    (await page.locator(".planner-card[data-slot='1'] .team-card__ability select").inputValue()) === "119" &&
    (await page.locator(".planner-card[data-slot='1'] .team-card__nature select").inputValue()) === "timid",
  "Imported save did not restore the Team Planner",
);

await page.locator(".view-tab[data-view='moves']").click();
await check(await page.locator("#view-moves").evaluate((element) => element.classList.contains("is-active")), "Moves view did not open");
await check((await page.locator(".move-card").count()) === 50, "Moves view did not render its first 50 moves");
await check((await page.locator(".move-card").first().locator("h3").textContent()) === "Pound", "First move is not Pound");
await checkAlignedGridCards(
  ".move-list",
  ".move-card",
  [".move-card__heading", ".move-card__metrics", ".move-card__copy", ".move-method-summary", ".move-learners"],
  "Move",
);
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
await check((await page.locator(".move-card").count()) === 50, "Move search clear button did not reset the first page");
await page.locator("#clear-move-filters").click();
await page.locator("#move-type-filter").selectOption("Fire");
await check(
  (await page.locator(".move-card .type-badge").allTextContents()).every((type) => type === "Fire"),
  "Move type filter included a non-Fire move",
);
await page.locator("#clear-move-filters").click();
await page.locator("#show-more-moves").scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelectorAll(".move-card").length >= 100);
await check((await page.locator(".move-card").count()) === 100, "Moves did not auto-load the next 50 entries");
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
await check((await page.locator(".ability-card").count()) === 50, "Abilities view did not render its first 50 abilities");
await check((await page.locator(".ability-card").first().locator("h3").textContent()) === "Stench", "First ability is not Stench");
await checkAlignedGridCards(
  ".ability-list",
  ".ability-card",
  ["header", ":scope > p", ".ability-users"],
  "Ability",
);
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
await check((await page.locator(".ability-card").count()) === 50, "Ability search clear button did not reset the first page");
await page.locator("#ability-load-more").scrollIntoViewIfNeeded();
await page.waitForFunction(() => document.querySelectorAll(".ability-card").length >= 100);
await check((await page.locator(".ability-card").count()) === 100, "Abilities did not auto-load the next 50 entries");
await page.locator("#view-abilities .section-heading").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-abilities.png"), fullPage: false });

await page.locator(".view-tab[data-view='items']").click();
await check(
  await page.locator("#view-items").evaluate((element) => element.classList.contains("is-active")),
  "Items view did not open",
);
await check((await page.locator(".item-category").count()) === 10, "Items view did not render all 10 categories");
await check((await page.locator(".item-card").count()) === 0, "Collapsed item categories rendered hidden cards");
await check(
  await page.locator(".item-category").evaluateAll((categories) => categories.every((category) => !category.open)),
  "Item categories should initially be collapsed",
);
await page.locator(".item-category", { hasText: "Poké Balls" }).locator("summary").click();
await check(
  (await page.locator(".item-card[data-item-id='1']").textContent()).includes("Sold in a shop") &&
    (await page.locator(".item-card[data-item-id='1']").textContent()).includes("₽200") &&
    (await page.locator(".item-card[data-item-id='1']").textContent()).includes("₽50"),
  "Poké Ball shop cost, sell value, or unmapped-shop indicator is missing",
);
await page.locator(".item-category", { hasText: "Poké Balls" }).locator("summary").click();
await page.locator("#item-search").fill("Dawn Stone");
await check((await page.locator(".item-card").count()) === 1, "Item search did not isolate Dawn Stone");
await check(
  (await page.locator(".item-card").textContent()).includes("Route 6"),
  "Dawn Stone is missing its Route 6 acquisition source",
);
await check(
  !(await page.locator("[data-clear-search='#item-search']").isHidden()),
  "Item search clear button did not appear",
);
await page.locator("[data-clear-search='#item-search']").click();
await check((await page.locator(".item-card").count()) === 0, "Item search clear button did not restore collapsed categories");
await page.locator("#collapse-item-categories").click();
await check(
  await page.locator(".item-category").evaluateAll((categories) => categories.every((category) => !category.open)),
  "Collapse all did not close item categories",
);
await page.locator("#expand-item-categories").click();
await check(
  await page.locator(".item-category").evaluateAll((categories) => categories.every((category) => category.open)),
  "Expand all did not open item categories",
);
await check(
  (await page.locator(".item-card").count()) ===
    (await page.evaluate(() =>
      itemData.categories.reduce(
        (total, category) =>
          total + Math.min(50, itemData.items.filter((item) => item.category === category.name).length),
        0,
      ),
    )),
  "Expanded item categories did not render their first 50 items",
);
await checkAlignedGridCards(
  ".item-grid",
  ".item-card",
  [".item-card__identity", ".item-card__copy", ".item-card__prices", ".item-card__sources"],
  "Item",
);
await page.locator("#view-items .section-heading").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-items.png"), fullPage: false });

await page.locator(".view-tab[data-view='dex']").click();
await page.locator(".pokemon-card[data-number='1'] .caught-button").click();
await check((await page.locator("#caught-tab-count").textContent()) === "2", "Caught tab count did not include the evolved team Pokemon");
await check((await page.locator("#collection-caught-count").textContent()) === "2", "Collection summary did not include the evolved team Pokemon");

await page.locator(".view-tab[data-view='caught']").click();
await check(await page.locator("#view-caught").evaluate((element) => element.classList.contains("is-active")), "Caught view did not open");
await page.locator("[data-collection-status='all']").click();
await checkAlignedGridCards(
  ".collection-grid",
  ".collection-card",
  [".collection-card__jump", ".collection-card__toggle"],
  "Caught collection",
);
await page.locator("[data-collection-status='caught']").click();
await check((await page.locator(".collection-card").count()) === 2, "Caught filter did not show both caught Pokémon");
await check(
  (await page.locator(".collection-card__copy strong").allTextContents()).includes("Gothita") &&
    (await page.locator(".collection-card__copy strong").allTextContents()).includes("Gothorita"),
  "Caught filter did not include both manually caught and evolved Pokémon",
);
await page.locator("[data-collection-status='missing']").click();
await check((await page.locator(".collection-card").count()) === 322, "Missing filter did not exclude caught Pokémon");
await page.locator("#collection-search").fill("Raticate");
await check((await page.locator(".collection-card").count()) === 1, "Collection search did not find Raticate");
await check(
  !(await page.locator("[data-clear-search='#collection-search']").isHidden()),
  "Collection search clear button did not appear",
);
await page.locator("[data-clear-search='#collection-search']").click();
await check((await page.locator(".collection-card").count()) === 322, "Collection search clear button did not clear the search");
await page.locator("#collection-search").fill("Raticate");
await page.locator(".collection-card__jump").click();
await page.waitForTimeout(500);
await check(page.url().endsWith("#pokemon-11"), "Collection jump did not open the full card");

await page.locator(".view-tab[data-view='caught']").click();
await page.locator("[data-collection-status='all']").click();
await page.locator("#collection-search").fill("Smoliv");
await check((await page.locator(".collection-card").count()) === 1, "Pokerex-only Smoliv entry is missing");
await page.locator(".collection-card__toggle").click();
await check((await page.locator("#caught-tab-count").textContent()) === "3", "Pokerex-only caught entry did not update progress");
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

await page.locator("#quick-location-list .quick-location", { hasText: /^Route 1$/ }).click();
await check((await page.locator("#location-filter").inputValue()) === "Route 1", "Quick location did not sync filter");
await check(
  (await page.locator(".pokemon-card .pokemon-location").allTextContents()).every((text) => text.includes("Route 1")),
  "Quick location showed a Pokémon from another location",
);

await page.locator(".view-tab[data-view='locations']").click();
await page.locator("#location-search").fill("");
await check((await page.locator(".location-card").count()) === 38, "Expected 38 Pokerex encounter maps");
await check(
  (await page.locator(".location-card[open]").count()) === 0 &&
    (await page.locator(".location-map").count()) === 0,
  "Locations should initially be collapsed and lightweight",
);
await check(
  JSON.stringify((await page.locator(".location-card").evaluateAll((cards) => cards.slice(0, 11).map((card) => card.dataset.location)))) ===
    JSON.stringify([
      "Route 1",
      "Route 2",
      "Route 3",
      "Route 3 Underpass",
      "Route 3 Depths",
      "Route 4",
      "Route 5",
      "Route 6",
      "Route 7",
      "Route 8",
      "Fennilahl Tunnel",
    ]),
  "Locations tab does not match Pokerex's default order",
);
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
await page.locator("#expand-locations").click();
await check(
  (await page.locator(".location-card[open]").count()) === 38 &&
    (await page.locator(".location-map").count()) === 38,
  "Expand all did not open every location",
);
await page.locator("#collapse-locations").click();
await check(
  (await page.locator(".location-card[open]").count()) === 0 &&
    (await page.locator(".location-map").count()) === 0,
  "Collapse all did not remove hidden location details",
);
await page.locator("#location-search").fill("Route 1");
await page.locator(".location-card").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-desktop-location-map.png"), fullPage: false });

await page.locator(".view-tab[data-view='dex']").click();
await page.locator(".pokemon-card .evolution-link", { hasText: "Raticate" }).first().click();
await page.waitForTimeout(500);
await check(page.url().endsWith("#pokemon-11"), "Evolution link did not update the card URL");
await check((await page.locator(".pokemon-card").count()) === 50, "Evolution link did not reset the first Dex page");
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
await check(
  (await page.locator("#view-dex .sticky-search").evaluate((element) => getComputedStyle(element).position)) === "sticky",
  "Dex search and Jump to Top toolbar is not sticky",
);
for (const viewName of [
  "dex",
  "locations",
  "caught",
  "trainers",
  "gyms",
  "team",
  "planner",
  "moves",
  "abilities",
  "megas",
  "items",
  "save",
]) {
  await checkGlobalBackToTop(viewName);
}
await page.locator(".view-tab[data-view='caught']").click();
await page.locator("[data-collection-status='all']").click();
await page.locator("#collection-search").fill("");
await page.screenshot({ path: path.join(outputDir, "guide-desktop-collection.png"), fullPage: false });

await page.setViewportSize({ width: 820, height: 1180 });
await checkDashboardTeamFill("Tablet");
await check(
  await page.locator(".view-tabs").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Tablet guide menu has horizontal overflow",
);
await page.locator(".journey-dashboard").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-tablet-journey-dashboard.png"), fullPage: false });
await page.locator(".view-tab[data-view='gyms']").click();
await page.locator(".gym-leader-card").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-tablet-gyms.png"), fullPage: false });
await page.locator(".view-tab[data-view='moves']").click();
await page.locator("#view-moves").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-tablet-moves-tip.png"), fullPage: false });
await page.locator(".view-tab[data-view='megas']").click();
await page.locator("#view-megas").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-tablet-mega-tip.png"), fullPage: false });

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
const mobileMastheadHeight = await page
  .locator(".hero")
  .evaluate((element) => element.getBoundingClientRect().height);
await check(mobileMastheadHeight <= 410, `Mobile masthead is too tall (${mobileMastheadHeight}px)`);
await checkDashboardTeamFill("Mobile");
await check(
  await page.locator(".view-tabs").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile guide menu has horizontal overflow",
);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.screenshot({ path: path.join(outputDir, "guide-mobile-masthead.png"), fullPage: false });
await check((await page.locator(".pokemon-card").count()) === 50, "Mobile view did not render the first Dex page");
await check((await page.locator("#dashboard-badge-count").textContent()) === "1", "Badge progress did not persist after reload");
await page.locator(".journey-dashboard").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-mobile-journey-dashboard.png"), fullPage: false });
await page.locator(".view-tabs").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-mobile-menu.png"), fullPage: false });
await page.locator(".view-tab[data-view='trainers']").click();
await page.locator(".trainer-location-group").first().scrollIntoViewIfNeeded();
await check(
  await page.locator(".trainer-location-group").first().evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile trainer location has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-trainers.png"), fullPage: false });
await page.locator(".view-tab[data-view='gyms']").click();
await page.locator(".gym-leader-card").first().scrollIntoViewIfNeeded();
await check(
  await page.locator(".gym-leader-card").first().evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile gym leader card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-gyms.png"), fullPage: false });
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
await page.locator(".view-tab[data-view='planner']").click();
await check(
  (await page.locator(".planner-card[data-slot='1'] h3").textContent()) === "Gothita" &&
    (await page.locator(".planner-card[data-slot='1'] .planner-move-slot").first().locator("select").inputValue()) === "1" &&
    (await page.locator(".planner-card[data-slot='1'] .team-card__ability select").inputValue()) === "119",
  "Saved Team Planner did not persist after reload",
);
await page.locator(".planner-card[data-slot='1']").scrollIntoViewIfNeeded();
await check(
  await page.locator(".planner-card[data-slot='1']").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile planner card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-team-planner.png"), fullPage: false });
await page.locator(".view-tab[data-view='dex']").click();
await page.locator(".pokemon-card[data-number='1']").scrollIntoViewIfNeeded();
await check(
  await page.locator(".pokemon-card[data-number='1']").evaluate(
    (element) => element.scrollWidth <= element.clientWidth,
  ),
  "Mobile stat card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-dex-stats.png"), fullPage: false });
await page.locator(".pokemon-card[data-number='1'] .learnset-button").click();
await check(
  await page.locator("#learnset-dialog").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile learnset dialog has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-learnset.png"), fullPage: false });
await page.locator(".learnset-dialog__close").click();
await page.locator(".pokemon-card[data-number='1'] .team-matchups").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-mobile-team-coverage.png"), fullPage: false });
await page.locator(".view-tab[data-view='moves']").click();
await page.locator("#view-moves").scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(outputDir, "guide-mobile-moves-tip.png"), fullPage: false });
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
await page.locator(".view-tab[data-view='items']").click();
await page.locator("#item-search").fill("Dawn Stone");
await page.locator(".item-card").scrollIntoViewIfNeeded();
await check(
  await page.locator(".item-card").evaluate((element) => element.scrollWidth <= element.clientWidth),
  "Mobile item card has horizontal overflow",
);
await page.screenshot({ path: path.join(outputDir, "guide-mobile-items.png"), fullPage: false });
await page.locator(".view-tab[data-view='caught']").click();
await check((await page.locator(".collection-card").count()) === 324, "Mobile collection did not render all cards");
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
      initialDexCards: 50,
      quickLocations: 36,
      encounterMaps: 38,
      collectionEntries: 324,
      dexSearchMaxMs: Math.round(dexSearchPerformance.max * 10) / 10,
      screenshots: [
        "tmp/guide-desktop-controls.png",
        "tmp/guide-desktop-masthead.png",
        "tmp/guide-desktop-collection.png",
        "tmp/guide-desktop-location-map.png",
        "tmp/guide-desktop-moves.png",
        "tmp/guide-desktop-move-tutors.png",
        "tmp/guide-desktop-abilities.png",
        "tmp/guide-desktop-items.png",
        "tmp/guide-desktop-team-search.png",
        "tmp/guide-desktop-team-builder.png",
        "tmp/guide-desktop-team-planner.png",
        "tmp/guide-desktop-team-meganium-profile.png",
        "tmp/guide-desktop-planner-meganium-profile.png",
        "tmp/guide-desktop-planner-progress.png",
        "tmp/guide-desktop-team-coverage.png",
        "tmp/guide-desktop-learnset.png",
        "tmp/guide-desktop-gyms.png",
        "tmp/guide-tablet-journey-dashboard.png",
        "tmp/guide-tablet-gyms.png",
        "tmp/guide-tablet-moves-tip.png",
        "tmp/guide-tablet-mega-tip.png",
        "tmp/guide-mobile-dex-stats.png",
        "tmp/guide-mobile-masthead.png",
        "tmp/guide-mobile-journey-dashboard.png",
        "tmp/guide-mobile-gyms.png",
        "tmp/guide-mobile-moves-tip.png",
        "tmp/guide-mobile-moves.png",
        "tmp/guide-mobile-abilities.png",
        "tmp/guide-mobile-items.png",
        "tmp/guide-mobile-team-builder.png",
        "tmp/guide-mobile-team-planner.png",
        "tmp/guide-mobile-team-coverage.png",
        "tmp/guide-mobile-learnset.png",
        "tmp/guide-mobile-save-sync.png",
        "tmp/guide-mobile-collection.png",
        "tmp/guide-mobile-location-map.png",
      ],
    },
    null,
    2,
  ),
);
