import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const pokerex = JSON.parse(await fs.readFile(inputPath, "utf8"));
const source = pokerex.data;
const activeLocations = source.locations.filter((location) => location.mapGroup <= 4);

const context = { window: {} };
vm.createContext(context);
vm.runInContext(await fs.readFile(path.join(rootDir, "data", "dreamstone-data.js"), "utf8"), context);
const guideDex = context.window.DREAMSTONE_DATA.dex;

const normalizeName = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const splitFormName = (value) => {
  const prefixes = [
    ["Alolan ", "Alola"],
    ["Galarian ", "Galar"],
    ["Hisuian ", "Hisui"],
    ["Paldean ", "Paldea"],
  ];
  const prefix = prefixes.find(([label]) => value.startsWith(label));
  const unprefixed = prefix ? value.slice(prefix[0].length) : value;
  return { name: unprefixed.replace(/ \(\d+\)$/, ""), region: prefix?.[1] || "" };
};
const hasGuideEntry = (pokemon) => {
  const form = splitFormName(pokemon.name);
  return guideDex.some(
    (entry) => normalizeName(entry.name) === normalizeName(form.name) && entry.region === form.region,
  );
};

const pokemonById = new Map(source.pokemon.map((pokemon) => [pokemon.id, pokemon]));
const spriteById = new Map(source.romSprites.slots.map((sprite) => [sprite.slot, sprite]));
const mapsByGroupNumber = new Map(source.maps.map((map) => [`${map.mapGroup}:${map.mapNum}`, map]));
const speciesIds = new Set();
for (const location of activeLocations) {
  for (const [methodId, encounter] of Object.entries(location.encounters || {})) {
    const groups = methodId === "fishing" ? Object.values(encounter || {}) : [encounter];
    for (const group of groups) {
      for (const slot of group.slots || []) speciesIds.add(slot.speciesId);
    }
  }
}

const downloads = [];
for (const location of activeLocations) {
  const map = mapsByGroupNumber.get(`${location.mapGroup}:${location.mapNum}`);
  if (map?.thumbnail) {
    downloads.push({
      url: map.thumbnail,
      output: path.join(rootDir, "assets", "maps", `pokerex-${map.id}.png`),
    });
  }
}
for (const speciesId of speciesIds) {
  const pokemon = pokemonById.get(speciesId);
  if (!pokemon || hasGuideEntry(pokemon)) continue;
  const front = spriteById.get(speciesId)?.variants?.front;
  downloads.push({
    url:
      front?.pngUrl ||
      front?.dataUrl ||
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.dexNum || pokemon.id}.png`,
    output: path.join(rootDir, "assets", "sprites", `pokerex-${speciesId}.png`),
  });
}

const download = async ({ url, output }) => {
  await fs.mkdir(path.dirname(output), { recursive: true });
  const response = await fetch(url, { headers: { "user-agent": "dreamstone-field-guide-builder" } });
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
  await fs.writeFile(output, Buffer.from(await response.arrayBuffer()));
  return path.relative(rootDir, output);
};

const completed = [];
let next = 0;
const workers = Array.from({ length: 8 }, async () => {
  while (next < downloads.length) completed.push(await download(downloads[next++]));
});
await Promise.all(workers);

console.log(
  JSON.stringify(
    {
      downloaded: completed.length,
      maps: completed.filter((file) => file.startsWith(`assets${path.sep}maps`)).length,
      sprites: completed.filter((file) => file.startsWith(`assets${path.sep}sprites`)).length,
    },
    null,
    2,
  ),
);
