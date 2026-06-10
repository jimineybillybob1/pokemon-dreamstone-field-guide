import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataSource = await fs.readFile(path.join(rootDir, "data", "dreamstone-data.js"), "utf8");
const encounterSource = await fs.readFile(path.join(rootDir, "data", "pokerex-encounters.js"), "utf8");
const moveSource = await fs.readFile(path.join(rootDir, "data", "pokerex-moves.js"), "utf8");
const abilitySource = await fs.readFile(path.join(rootDir, "data", "pokerex-abilities.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(dataSource, context);
vm.runInContext(encounterSource, context);
vm.runInContext(moveSource, context);
vm.runInContext(abilitySource, context);
const data = context.window.DREAMSTONE_DATA;
const encounters = context.window.DREAMSTONE_ENCOUNTERS;
const moves = context.window.DREAMSTONE_MOVES;
const abilities = context.window.DREAMSTONE_ABILITIES;

const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

check(Array.isArray(data.dex), "Dex data is missing");
check(data.dex.length === 315, `Expected 315 Pokémon, found ${data.dex.length}`);
check(new Set(data.dex.map((pokemon) => pokemon.number)).size === data.dex.length, "Duplicate dex numbers");
check(data.megas.length === 18, `Expected 18 Mega choices, found ${data.megas.length}`);
check(data.importantItems.length === 5, `Expected 5 important items, found ${data.importantItems.length}`);
check(encounters.locations.length === 38, `Expected 38 Pokerex encounter maps, found ${encounters.locations.length}`);
check(
  encounters.encounterSpecies.length === 138,
  `Expected 138 Pokerex wild species/form slots, found ${encounters.encounterSpecies.length}`,
);
check(
  encounters.encounterSpecies.filter((pokemon) => !pokemon.guideNumber).length === 12,
  "Expected 12 Pokerex wild entries missing from the curated guide",
);
check(moves.moves.length === 934, `Expected 934 Pokerex moves, found ${moves.moves.length}`);
check(moves.tutors.length === 19, `Expected 19 Pokerex move tutors, found ${moves.tutors.length}`);
check(abilities.abilities.length === 310, `Expected 310 Pokerex abilities, found ${abilities.abilities.length}`);
check(
  abilities.abilities.every(
    (ability) => ability.id && ability.name && ability.description && Array.isArray(ability.users),
  ),
  "Pokerex ability details or users are invalid",
);
check(
  abilities.abilities.find((ability) => ability.name === "Frisk")?.users.some(
    (user) => user.name === "Gothita" && user.guideNumber === 1,
  ),
  "Frisk is missing Gothita's linked user detail",
);
check(
  moves.tutors.every((tutor) => tutor.moveId && tutor.location && moves.moves.some((move) => move.id === tutor.moveId)),
  "Pokerex move tutor details are invalid",
);
check(
  moves.moves.every(
    (move) =>
      move.name &&
      move.type &&
      move.category &&
      ["levelUp", "evolution", "egg", "teachable"].every((method) => Array.isArray(move.learners[method])),
  ),
  "Pokerex move details or learner groups are invalid",
);
check(
  moves.moves.find((move) => move.name === "Pound")?.learners.levelUp.some(
    (learner) => learner.name === "Gothita" && learner.level === 1 && learner.guideNumber === 1,
  ),
  "Pound is missing Gothita's level-up learner detail",
);
check(
  Object.values(moves.moves.find((move) => move.name === "Mean Look")?.learners || {})
    .flat()
    .some((learner) => learner.guideNumber === 1),
  "Mean Look is missing Gothita's learner detail for the Team Builder",
);
check(
  data.dex.filter((pokemon) => pokemon.statsSource === "Pokerex").length === 314,
  "Expected Pokerex stats for 314 curated entries",
);
check(
  data.dex.filter((pokemon) => pokemon.statsSource === "Canonical fallback").length === 1 &&
    data.dex.find((pokemon) => pokemon.statsSource === "Canonical fallback")?.name === "Koraidon",
  "Expected Koraidon to be the only canonical stat fallback",
);
const rangerInstitute = encounters.locations.find((location) => location.name === "Ranger Institute");
check(
  rangerInstitute?.methods.some((method) => method.label === "Grass / cave · Morning") &&
    rangerInstitute?.methods.some((method) => method.label === "Grass / cave · Day") &&
    rangerInstitute?.methods.some((method) => method.label === "Grass / cave · Night"),
  "Ranger Institute time-of-day encounter tables are missing",
);
const pokerexLocationNames = new Set(encounters.locations.map((location) => location.name));
const pokerexLocationsByGuideNumber = new Map();
for (const pokemon of encounters.encounterSpecies.filter((entry) => entry.guideNumber)) {
  if (!pokerexLocationsByGuideNumber.has(pokemon.guideNumber)) {
    pokerexLocationsByGuideNumber.set(pokemon.guideNumber, new Set());
  }
  pokemon.locations.forEach((location) => {
    check(pokerexLocationNames.has(location), `${pokemon.name} references unknown Pokerex location ${location}`);
    pokerexLocationsByGuideNumber.get(pokemon.guideNumber).add(location);
  });
}
check(
  data.dex.filter((pokemon) => pokerexLocationsByGuideNumber.has(pokemon.number)).length === 123,
  "Expected 123 curated dex entries with Pokerex wild encounters",
);
check(
  !pokerexLocationsByGuideNumber.has(data.dex.find((pokemon) => pokemon.name === "Charizard")?.number),
  "Charizard unexpectedly has a Pokerex wild encounter location",
);

for (const location of encounters.locations) {
  check(Boolean(location.name), "Pokerex location has no name");
  check(Boolean(location.map.thumbnail), `${location.name} has no map thumbnail`);
  check(Boolean(location.map.fullImage), `${location.name} has no full map image`);
  try {
    const stat = await fs.stat(path.join(rootDir, location.map.thumbnail));
    check(stat.size > 0, `${location.name} map thumbnail is empty`);
  } catch {
    errors.push(`${location.name} map thumbnail does not exist: ${location.map.thumbnail}`);
  }
  check(location.methods.length > 0, `${location.name} has no encounter methods`);
  for (const method of location.methods) {
    check(method.species.length > 0, `${location.name} ${method.label} has no species`);
    check(
      method.species.reduce((total, pokemon) => total + pokemon.rate, 0) === 100,
      `${location.name} ${method.label} encounter rates do not total 100`,
    );
  }
}

for (const pokemon of encounters.encounterSpecies.filter((entry) => !entry.guideNumber)) {
  try {
    const stat = await fs.stat(path.join(rootDir, pokemon.sprite));
    check(stat.size > 0, `${pokemon.name} Pokerex sprite is empty`);
  } catch {
    errors.push(`${pokemon.name} Pokerex sprite does not exist: ${pokemon.sprite}`);
  }
}

for (const pokemon of [...data.dex, ...data.megas]) {
  check(Boolean(pokemon.name), "Entry has no name");
  check(Boolean(pokemon.sprite), `${pokemon.name} has no sprite path`);
  if (!pokemon.sprite) continue;
  const spritePath = path.join(rootDir, pokemon.sprite);
  try {
    const stat = await fs.stat(spritePath);
    check(stat.size > 0, `${pokemon.name} sprite is empty`);
  } catch {
    errors.push(`${pokemon.name} sprite does not exist: ${pokemon.sprite}`);
  }
}

const dexNumbers = new Set(data.dex.map((pokemon) => pokemon.number));
for (const pokemon of data.dex) {
  check(Array.isArray(pokemon.types) && pokemon.types.length > 0, `${pokemon.name} has no type metadata`);
  check(Array.isArray(pokemon.evolvesFrom), `${pokemon.name} has invalid evolvesFrom metadata`);
  check(Array.isArray(pokemon.evolvesTo), `${pokemon.name} has invalid evolvesTo metadata`);
  check(
    ["hp", "atk", "def", "spa", "spdef", "spd"].every((stat) => Number.isFinite(pokemon.stats?.[stat])),
    `${pokemon.name} has invalid base stats`,
  );
  check(Number.isFinite(pokemon.bst), `${pokemon.name} has no BST`);
  check(
    Object.values(pokemon.stats || {}).reduce((total, stat) => total + stat, 0) === pokemon.bst,
    `${pokemon.name} base stats do not total its BST`,
  );
  for (const relation of [...pokemon.evolvesFrom, ...pokemon.evolvesTo]) {
    check(dexNumbers.has(relation), `${pokemon.name} links to missing Dreamstone dex number ${relation}`);
  }
}

for (const file of [
  "index.html",
  "styles.css",
  "app.js",
  "data/dreamstone-data.js",
  "data/pokerex-encounters.js",
  "data/pokerex-moves.js",
  "data/pokerex-abilities.js",
  "sync-config.js",
  "sync-worker/src/index.js",
  "sync-worker/wrangler.toml",
  "assets/art/dreamstone-hero.png",
  "assets/art/dreamstone-logo.png",
  "assets/art/dreamstone-social-preview.png",
]) {
  try {
    const stat = await fs.stat(path.join(rootDir, file));
    check(stat.size > 0, `${file} is empty`);
  } catch {
    errors.push(`${file} does not exist`);
  }
}

const html = await fs.readFile(path.join(rootDir, "index.html"), "utf8");
const manifest = JSON.parse(await fs.readFile(path.join(rootDir, "site.webmanifest"), "utf8"));
const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
check(new Set(htmlIds).size === htmlIds.length, "index.html contains duplicate element IDs");
check(manifest.name === "Dreamstone Field Guide", "Manifest has an unexpected app name");
check(manifest.display === "standalone", "Manifest is not configured for standalone display");
check(manifest.icons.length === 2, "Manifest should contain 192px and 512px icons");
check(
  (html.match(/rel="apple-touch-icon"/g) || []).length === 5,
  "Expected five Apple touch icon declarations",
);
check(html.includes('data-view="team"'), "Team Builder tab is missing");
check(html.includes('data-view="abilities"'), "Abilities tab is missing");
check((html.match(/class="view-tab__icon"/g) || []).length === 11, "Expected one icon for every guide menu item");
check((html.match(/<symbol id="nav-icon-/g) || []).length === 11, "Expected eleven relevant guide menu icon symbols");
check(!html.includes('<img class="view-tab__icon"'), "Guide menu still uses raster sprite icons");
check(html.includes('id="team-grid"'), "Team Builder grid is missing");
check(html.includes('class="team-matchups"'), "Dex team coverage field is missing");
check(html.includes("https://pokemondb.net/type"), "Type-chart source link is missing");
check(html.includes('class="hero__logo"'), "Dreamstone hero logo is missing");
check(html.includes("assets/art/dreamstone-social-preview.png"), "Dreamstone social preview is missing");
check(html.includes("https://www.steamgriddb.com/game/5494497"), "SteamGridDB artwork credit is missing");
check(html.includes('data-view="save"'), "Save & Sync tab is missing");
check(
  html.indexOf('data-view="save"') > html.indexOf('data-view="items"'),
  "Save & Sync is not the final primary tab",
);
check(html.includes('data-move-mode="tutors"'), "Move tutors sub-tab is missing");
check((html.match(/data-clear-search=/g) || []).length === 5, "Expected five in-field search clear buttons");
check((html.match(/class="jump-to-top"/g) || []).length === 11, "Expected one Jump to Top control per guide tab");
check(html.includes('id="team-offensive-coverage"'), "Team Builder offensive coverage overview is missing");
check(html.includes('id="planner-offensive-coverage"'), "Team Planner offensive coverage overview is missing");
check(html.includes('id="export-save"'), "Save export control is missing");
check(html.includes('id="sync-code"'), "Cloud sync UUID control is missing");

const localReferences = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => !reference.startsWith("#") && !reference.startsWith("http"));
for (const reference of localReferences) {
  const localPath = reference.split(/[?#]/, 1)[0];
  try {
    await fs.access(path.join(rootDir, localPath));
  } catch {
    errors.push(`index.html references missing file: ${reference}`);
  }
}

const locationCounts = new Map();
for (const [guideNumber, locations] of pokerexLocationsByGuideNumber) {
  if (!dexNumbers.has(guideNumber)) continue;
  locations.forEach((location) => locationCounts.set(location, (locationCounts.get(location) || 0) + 1));
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: "Guide validation passed",
        pokemon: data.dex.length,
        pokerexLinkedDexEntries: data.dex.filter((pokemon) => pokerexLocationsByGuideNumber.has(pokemon.number)).length,
        dexEntriesWithoutPokerexWildEncounter: data.dex.filter(
          (pokemon) => !pokerexLocationsByGuideNumber.has(pokemon.number),
        ).length,
        pokerexLocationsWithCuratedDexEntries: locationCounts.size,
        pokerexEncounterMaps: encounters.locations.length,
        pokerexWildSpeciesForms: encounters.encounterSpecies.length,
        pokerexMoves: moves.moves.length,
        pokerexAbilities: abilities.abilities.length,
        collectionEntries:
          data.dex.length + encounters.encounterSpecies.filter((pokemon) => !pokemon.guideNumber).length,
        spriteReferencesChecked: data.dex.length + data.megas.length,
        typedPokemon: data.dex.filter((pokemon) => pokemon.types.length).length,
        pokemonWithEvolutionLinks: data.dex.filter(
          (pokemon) => pokemon.evolvesFrom.length || pokemon.evolvesTo.length,
        ).length,
        pokemonWithStats: data.dex.filter((pokemon) => pokemon.bst).length,
        locationsWithMostPokemon: [...locationCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([location, count]) => ({ location, count })),
      },
      null,
      2,
    ),
  );
}
