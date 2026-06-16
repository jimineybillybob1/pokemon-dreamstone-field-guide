import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataSource = await fs.readFile(path.join(rootDir, "data", "dreamstone-data.js"), "utf8");
const encounterSource = await fs.readFile(path.join(rootDir, "data", "pokerex-encounters.js"), "utf8");
const moveSource = await fs.readFile(path.join(rootDir, "data", "pokerex-moves.js"), "utf8");
const abilitySource = await fs.readFile(path.join(rootDir, "data", "pokerex-abilities.js"), "utf8");
const trainerSource = await fs.readFile(path.join(rootDir, "data", "pokerex-trainers.js"), "utf8");
const itemSource = await fs.readFile(path.join(rootDir, "data", "pokerex-items.js"), "utf8");
const evolutionSource = await fs.readFile(path.join(rootDir, "data", "pokerex-evolutions.js"), "utf8");
const appSource = await fs.readFile(path.join(rootDir, "app.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(dataSource, context);
vm.runInContext(encounterSource, context);
vm.runInContext(moveSource, context);
vm.runInContext(abilitySource, context);
vm.runInContext(trainerSource, context);
vm.runInContext(itemSource, context);
vm.runInContext(evolutionSource, context);
const data = context.window.DREAMSTONE_DATA;
const encounters = context.window.DREAMSTONE_ENCOUNTERS;
const moves = context.window.DREAMSTONE_MOVES;
const abilities = context.window.DREAMSTONE_ABILITIES;
const trainers = context.window.DREAMSTONE_TRAINERS;
const items = context.window.DREAMSTONE_ITEMS;
const evolutions = context.window.DREAMSTONE_EVOLUTIONS;

const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};
const pokemonSpriteReferences = [
  ...data.dex.map((pokemon) => pokemon.sprite),
  ...data.megas.map((pokemon) => pokemon.sprite),
  ...encounters.encounterSpecies.map((pokemon) => pokemon.sprite),
  ...encounters.locations.flatMap((location) =>
    location.methods.flatMap((method) => method.species.map((pokemon) => pokemon.sprite)),
  ),
  ...trainers.trainers.flatMap((trainer) => trainer.party.map((member) => member.sprite)),
  ...[...appSource.matchAll(/assets\/pokemon\/\d+\.png/g)].map((match) => match[0]),
];

check(Array.isArray(data.dex), "Dex data is missing");
check(data.dex.length === 315, `Expected 315 Pokémon, found ${data.dex.length}`);
check(new Set(data.dex.map((pokemon) => pokemon.number)).size === data.dex.length, "Duplicate dex numbers");
check(data.megas.length === 18, `Expected 18 Mega choices, found ${data.megas.length}`);
check(items.items.length === 854, `Expected 854 Pokerex items, found ${items.items.length}`);
check(items.categories.length === 10, `Expected 10 item categories, found ${items.categories.length}`);
check(items.items.every((item) => item.icon && item.category && item.description), "An item is missing its icon, category, or description");
check(
  items.items.find((item) => item.name === "Poké Ball")?.acquisition.unmappedShop === true,
  "Poké Ball is missing its unmapped shop indicator",
);
check(
  items.items.find((item) => item.name === "Potion")?.sellValue === 50,
  "Potion does not use Dreamstone's Gen 9 quarter-price sell value",
);
check(
  items.items.find((item) => item.name === "Dawn Stone")?.acquisition.npcSources.some(
    (source) => source.location === "Route 6",
  ),
  "Dawn Stone is missing its playable Dreamstone NPC source",
);
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
check(trainers.trainers.length === 127, `Expected 127 playable Pokerex trainers, found ${trainers.trainers.length}`);
check(trainers.locations.length === 25, `Expected 25 trainer locations, found ${trainers.locations.length}`);
check(evolutions.edges.length >= 165, `Expected at least 165 Dreamstone evolution methods, found ${evolutions.edges.length}`);
check(
  evolutions.edges.some(
    (edge) => edge.fromGuideNumber === 1 && edge.toGuideNumber === 2 && edge.method === "Level 18",
  ),
  "Gothita is missing its Dreamstone Lv. 18 evolution",
);
check(
  !evolutions.edges.some((edge) => /^Level [1-9]\d{2,}/.test(edge.method)),
  "A custom evolution method was incorrectly presented as an impossible level",
);
check(
  evolutions.edges.some(
    (edge) =>
      edge.methodId === 47 &&
      edge.method === "Use Rage Fist 20 times, then level up",
  ),
  "Primeape's custom Dreamstone evolution method was not normalized",
);
check(
  pokemonSpriteReferences.every((sprite) => /^assets\/pokemon\/\d+\.png$/.test(sprite)),
  "A runtime Pokémon sprite does not use the unified Dreamstone source asset set",
);
check(!appSource.includes("assets/sprites/"), "app.js still references a mixed-source Pokémon sprite");
check(
  trainers.trainers.every(
    (trainer) =>
      trainer.name &&
      trainer.location &&
      trainer.sprite &&
      Array.isArray(trainer.party) &&
      trainer.party.length > 0 &&
      trainer.party.every((member) => Array.isArray(member.types) && member.types.length > 0) &&
      trainer.trainerClass !== "None",
  ),
  "Pokerex trainer details are invalid or include the None class",
);
check(
  trainers.trainers.every((trainer) =>
    trainer.party.every(
      (member) =>
        Number.isFinite(member.bst) &&
        ["hp", "atk", "def", "spa", "spdef", "spd"].every((stat) => Number.isFinite(member.stats?.[stat])),
    ),
  ),
  "Pokerex trainer party members are missing stats or BST",
);
check(
  trainers.trainers.every((trainer) => trainer.name !== trainer.name.toUpperCase()),
  "A trainer name is still fully uppercase",
);
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

for (const trainer of trainers.trainers) {
  try {
    const stat = await fs.stat(path.join(rootDir, trainer.sprite));
    check(stat.size > 0, `${trainer.name} trainer sprite is empty`);
  } catch {
    errors.push(`${trainer.name} trainer sprite does not exist: ${trainer.sprite}`);
  }
  for (const member of trainer.party) {
    try {
      const stat = await fs.stat(path.join(rootDir, member.sprite));
      check(stat.size > 0, `${trainer.name}'s ${member.name} sprite is empty`);
    } catch {
      errors.push(`${trainer.name}'s ${member.name} sprite does not exist: ${member.sprite}`);
    }
  }
}

for (const item of items.items) {
  try {
    const stat = await fs.stat(path.join(rootDir, item.icon));
    check(stat.size > 0, `${item.name} item sprite is empty`);
  } catch {
    errors.push(`${item.name} item sprite does not exist: ${item.icon}`);
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

for (const sprite of new Set(pokemonSpriteReferences)) {
  try {
    const bytes = await fs.readFile(path.join(rootDir, sprite));
    check(bytes.readUInt32BE(16) === 64 && bytes.readUInt32BE(20) === 64, `${sprite} is not 64x64`);
    check(PNG.sync.read(bytes).data[3] === 0, `${sprite} background is not transparent`);
  } catch {
    errors.push(`Unified Dreamstone sprite does not exist: ${sprite}`);
  }
}

const dexNumbers = new Set(data.dex.map((pokemon) => pokemon.number));
for (const evolution of evolutions.edges) {
  check(dexNumbers.has(evolution.fromGuideNumber), `Evolution links from missing guide number ${evolution.fromGuideNumber}`);
  check(dexNumbers.has(evolution.toGuideNumber), `Evolution links to missing guide number ${evolution.toGuideNumber}`);
  check(Boolean(evolution.method), `Evolution ${evolution.fromGuideNumber} to ${evolution.toGuideNumber} has no method`);
}
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
  "data/pokerex-trainers.js",
  "data/pokerex-items.js",
  "data/pokerex-evolutions.js",
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
check(html.includes('data-view="trainers"'), "Trainers tab is missing");
check(
  html.indexOf('data-view="trainers"') < html.indexOf('data-view="gyms"'),
  "Trainers tab is not before Gym Leaders",
);
check(html.includes('<option value="bst-desc">BST: highest first</option>'), "Descending BST sort option is missing");
check(html.includes('<option value="bst-asc">BST: lowest first</option>'), "Ascending BST sort option is missing");
check((html.match(/class="view-tab__icon"/g) || []).length === 13, "Expected one icon for every guide menu item");
check((html.match(/<symbol id="nav-icon-/g) || []).length === 13, "Expected thirteen relevant guide menu icon symbols");
check(!html.includes('<img class="view-tab__icon"'), "Guide menu still uses raster sprite icons");
check(html.includes('id="view-menu-heading">Menu</h2>'), "Guide menu heading is missing");
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
check((html.match(/data-clear-search=/g) || []).length === 7, "Expected seven in-field search clear buttons");
check((html.match(/class="jump-to-top"/g) || []).length === 13, "Expected one Jump to Top control per guide tab");
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
        pokerexItems: items.items.length,
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
