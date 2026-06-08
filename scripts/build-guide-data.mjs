import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Usage: node scripts/build-guide-data.mjs <dex.xlsx>");
}

const spriteSourceDir = path.join(rootDir, "vendor", "pokesprite", "pokemon-gen8", "regular");
const spriteOutputDir = path.join(rootDir, "assets", "sprites");
const outputPath = path.join(rootDir, "data", "dreamstone-data.js");
const metadataPath = path.join(rootDir, "data", "pokemon-metadata.json");

const clean = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeName = (value) =>
  clean(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♀]/g, "f")
    .replace(/[♂]/g, "m")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const pokemonDb = JSON.parse(
  await fs.readFile(path.join(rootDir, "vendor", "pokesprite", "data", "pokemon.json"), "utf8"),
);
const slugByName = new Map(
  Object.values(pokemonDb).map((pokemon) => [normalizeName(pokemon.name.eng), pokemon.slug.eng]),
);

const pokeApiFallbackIds = new Map(
  Object.entries({
    tinkatink: 957,
    tinkatuff: 958,
    tinkaton: 959,
    poltchageist: 1012,
    sinistcha: 1013,
    annihilape: 979,
    nymble: 919,
    lokix: 920,
    clodsire: 980,
    toedscool: 948,
    toedscruel: 949,
    dipplin: 1011,
    hydrapple: 1019,
    greavard: 971,
    houndstone: 972,
    glimmet: 969,
    glimmora: 970,
    cetoddle: 974,
    cetitan: 975,
    frigibax: 996,
    arctibax: 997,
    baxcalibur: 998,
    charcadet: 935,
    ceruledge: 937,
    armarouge: 936,
    varoom: 965,
    revavroom: 966,
    bombirdier: 962,
    wattrel: 940,
    kilowattrel: 941,
    screamtail: 985,
    fluttermane: 987,
    greattusk: 984,
    roaringmoon: 1005,
    koraidon: 1007,
  }),
);

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const pokemonMetadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));

const sheetRows = (name) => workbook.worksheets.getItem(name).getUsedRange().values;
const pokedexRows = sheetRows("Pokedex");
const megaRows = sheetRows("Megas");
const itemRows = sheetRows("Some Important Items");

const resolveSprite = async (name, form = "") => {
  const baseSlug = slugByName.get(normalizeName(name));
  if (!baseSlug) {
    const pokeApiId = pokeApiFallbackIds.get(normalizeName(name));
    if (pokeApiId) {
      return {
        filename: `pokeapi-${pokeApiId}.png`,
        source: "",
        url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokeApiId}.png`,
        missing: "",
      };
    }
    return { filename: "", source: "", url: "", missing: `No sprite slug for ${name}` };
  }

  const formSlug = clean(form).toLowerCase();
  const candidates = [];
  if (formSlug) candidates.push(`${baseSlug}-${formSlug}.png`);
  candidates.push(`${baseSlug}.png`);

  for (const filename of candidates) {
    const source = path.join(spriteSourceDir, filename);
    try {
      await fs.access(source);
      return { filename, source, url: "", missing: "" };
    } catch {
      // Try the default form when a regional or special form is unavailable.
    }
  }

  return {
    filename: "",
    source: "",
    url: "",
    missing: `No sprite file for ${name}${formSlug ? ` (${formSlug})` : ""}`,
  };
};

const dex = [];
const missingSprites = [];
const spritesToCopy = new Map();
const spritesToDownload = new Map();

for (const row of pokedexRows.slice(2)) {
  const number = Number(row[0]);
  const name = clean(row[1]);
  if (!number || !name) continue;

  const region = clean(row[2]);
  const location = clean(row[3]);
  const rarity = clean(row[4]);
  const notes = clean(row[5]);
  const sprite = await resolveSprite(name, region);
  const metadata = pokemonMetadata[number] || {};

  if (sprite.missing) missingSprites.push(sprite.missing);
  if (sprite.source) spritesToCopy.set(sprite.filename, sprite.source);
  if (sprite.url) spritesToDownload.set(sprite.filename, sprite.url);

  let availability = "Evolution / special";
  if (/unobtainable/i.test(location) || /unobtainable/i.test(notes)) availability = "Unobtainable";
  else if (location) availability = "Available";

  dex.push({
    number,
    name,
    region,
    location,
    rarity,
    notes,
    availability,
    sprite: sprite.filename ? `assets/sprites/${sprite.filename}` : "",
    types: metadata.types || [],
    evolvesFrom: metadata.evolvesFrom || [],
    evolvesTo: metadata.evolvesTo || [],
  });
}

const megas = [];
for (const row of megaRows.slice(2)) {
  const number = Number(row[0]);
  const name = clean(row[1]);
  if (!number || !name) continue;

  const sprite = await resolveSprite(name, "mega");
  if (sprite.missing) missingSprites.push(sprite.missing);
  if (sprite.source) spritesToCopy.set(sprite.filename, sprite.source);
  if (sprite.url) spritesToDownload.set(sprite.filename, sprite.url);
  megas.push({
    number,
    name,
    sprite: sprite.filename ? `assets/sprites/${sprite.filename}` : "",
  });
}

const importantItems = itemRows
  .slice(2)
  .filter((row) => clean(row[0]))
  .map((row) => ({
    name: clean(row[0]),
    function: clean(row[1]),
    location: clean(row[2]),
  }));

const sourceNotes = {
  pokedex: clean(pokedexRows[0][0]),
  megas: clean(megaRows[0][0]),
  importantItems: clean(itemRows[0][0]),
};

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.mkdir(spriteOutputDir, { recursive: true });

for (const [filename, source] of spritesToCopy) {
  await fs.copyFile(source, path.join(spriteOutputDir, filename));
}

for (const [filename, url] of spritesToDownload) {
  try {
    await fs.access(path.join(spriteOutputDir, filename));
    continue;
  } catch {
    // Download the fallback only when it is not already cached locally.
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  await fs.writeFile(path.join(spriteOutputDir, filename), Buffer.from(await response.arrayBuffer()));
}

const data = {
  generatedAt: new Date().toISOString(),
  sourceWorkbook: path.basename(inputPath),
  dex,
  megas,
  importantItems,
  sourceNotes,
};

await fs.writeFile(
  outputPath,
  `window.DREAMSTONE_DATA = ${JSON.stringify(data, null, 2)};\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      pokemon: dex.length,
      available: dex.filter((pokemon) => pokemon.availability === "Available").length,
      evolutionOrSpecial: dex.filter((pokemon) => pokemon.availability === "Evolution / special")
        .length,
      unobtainable: dex.filter((pokemon) => pokemon.availability === "Unobtainable").length,
      megas: megas.length,
      importantItems: importantItems.length,
      copiedSprites: spritesToCopy.size,
      downloadedFallbackSprites: spritesToDownload.size,
      missingSprites: [...new Set(missingSprites)],
      typedPokemon: dex.filter((pokemon) => pokemon.types.length).length,
      pokemonWithEvolutionLinks: dex.filter(
        (pokemon) => pokemon.evolvesFrom.length || pokemon.evolvesTo.length,
      ).length,
      regions: [...new Set(dex.map((pokemon) => pokemon.region).filter(Boolean))].sort(),
      rarities: [...new Set(dex.map((pokemon) => pokemon.rarity).filter(Boolean))].sort(),
      locations: [...new Set(dex.map((pokemon) => pokemon.location).filter(Boolean))].sort(),
    },
    null,
    2,
  ),
);
