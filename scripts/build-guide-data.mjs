import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";
import {
  copySprite,
  findMegaPokemon,
  speciesIdForGuideEntry,
} from "./dreamstone-pokemon-sprites.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const inputPath = process.argv[2];

if (!inputPath) {
  throw new Error("Usage: node scripts/build-guide-data.mjs <dex.xlsx>");
}

const outputPath = path.join(rootDir, "data", "dreamstone-data.js");
const metadataPath = path.join(rootDir, "data", "pokemon-metadata.json");
const pokerexPath = path.join(rootDir, "tmp", "pokerex-dreamstone-data.json");

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

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(inputPath));
const pokemonMetadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
const pokerexPokemon = JSON.parse(await fs.readFile(pokerexPath, "utf8")).data.pokemon;
const regionalPrefixes = {
  Alola: "Alolan ",
  Galar: "Galarian ",
  Hisui: "Hisuian ",
  Paldea: "Paldean ",
};
const canonicalStatFallbacks = new Map([
  [
    "koraidon",
    {
      stats: { hp: 100, atk: 135, def: 115, spa: 85, spdef: 100, spd: 135 },
      bst: 670,
      source: "Canonical fallback",
    },
  ],
]);
const pokerexPokemonByName = new Map();
for (const pokemon of pokerexPokemon) {
  const key = normalizeName(pokemon.name.replace(/ \(\d+\)$/, ""));
  if (!pokerexPokemonByName.has(key)) pokerexPokemonByName.set(key, []);
  pokerexPokemonByName.get(key).push(pokemon);
}

const statsForPokemon = (name, region) => {
  const baseName = name.replaceAll("_", " ");
  const regionalName = `${regionalPrefixes[region] || ""}${baseName}`;
  const candidates =
    pokerexPokemonByName.get(normalizeName(regionalName)) ||
    pokerexPokemonByName.get(normalizeName(baseName)) ||
    [];
  const pokemon = candidates[0];
  if (pokemon?.stats && Number.isFinite(pokemon.bst)) {
    return {
      stats: pokemon.stats,
      bst: pokemon.bst,
      source: "Pokerex",
    };
  }
  return canonicalStatFallbacks.get(normalizeName(baseName)) || null;
};

const sheetRows = (name) => workbook.worksheets.getItem(name).getUsedRange().values;
const pokedexRows = sheetRows("Pokedex");
const megaRows = sheetRows("Megas");
const itemRows = sheetRows("Some Important Items");

const dex = [];
const missingSprites = [];

for (const row of pokedexRows.slice(2)) {
  const number = Number(row[0]);
  const name = clean(row[1]);
  if (!number || !name) continue;

  const region = clean(row[2]);
  const location = clean(row[3]);
  const rarity = clean(row[4]);
  const notes = clean(row[5]);
  const speciesId = speciesIdForGuideEntry({ name, region });
  const sprite = speciesId ? await copySprite(speciesId) : "";
  const metadata = pokemonMetadata[number] || {};
  const statMetadata = statsForPokemon(name, region);

  if (!sprite) missingSprites.push(`No Dreamstone source sprite for ${name}`);

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
    sprite,
    types: metadata.types || [],
    evolvesFrom: metadata.evolvesFrom || [],
    evolvesTo: metadata.evolvesTo || [],
    stats: statMetadata?.stats || {},
    bst: statMetadata?.bst || null,
    statsSource: statMetadata?.source || "",
  });
}

const megas = [];
for (const row of megaRows.slice(2)) {
  const number = Number(row[0]);
  const name = clean(row[1]);
  if (!number || !name) continue;

  const speciesId = findMegaPokemon(name)?.id;
  const sprite = speciesId ? await copySprite(speciesId) : "";
  if (!sprite) missingSprites.push(`No Dreamstone source sprite for Mega ${name}`);
  megas.push({
    number,
    name,
    sprite,
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
      copiedSprites: new Set([...dex, ...megas].map((pokemon) => pokemon.sprite)).size,
      missingSprites: [...new Set(missingSprites)],
      typedPokemon: dex.filter((pokemon) => pokemon.types.length).length,
      pokemonWithEvolutionLinks: dex.filter(
        (pokemon) => pokemon.evolvesFrom.length || pokemon.evolvesTo.length,
      ).length,
      pokemonWithStats: dex.filter((pokemon) => pokemon.bst).length,
      pokerexStats: dex.filter((pokemon) => pokemon.statsSource === "Pokerex").length,
      canonicalStatFallbacks: dex.filter((pokemon) => pokemon.statsSource === "Canonical fallback")
        .map((pokemon) => pokemon.name),
      regions: [...new Set(dex.map((pokemon) => pokemon.region).filter(Boolean))].sort(),
      rarities: [...new Set(dex.map((pokemon) => pokemon.rarity).filter(Boolean))].sort(),
      locations: [...new Set(dex.map((pokemon) => pokemon.location).filter(Boolean))].sort(),
    },
    null,
    2,
  ),
);

await import("./unify-pokemon-sprites.mjs");
