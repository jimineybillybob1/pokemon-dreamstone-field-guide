import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const outputPath = path.join(rootDir, "data", "pokerex-encounters.js");
const guidePath = path.join(rootDir, "data", "dreamstone-data.js");

const guideContext = { window: {} };
vm.createContext(guideContext);
vm.runInContext(await fs.readFile(guidePath, "utf8"), guideContext);
const guideDex = guideContext.window.DREAMSTONE_DATA.dex;

const pokerex = JSON.parse(await fs.readFile(inputPath, "utf8"));
const source = pokerex.data;
// Dreamstone's playable custom world uses map groups 0-4. The extraction also retains
// inaccessible vanilla Emerald encounter tables in later map groups.
const activeLocations = source.locations.filter((location) => location.mapGroup <= 4);
const pokemonById = new Map(source.pokemon.map((pokemon) => [pokemon.id, pokemon]));
const mapByGroupNumber = new Map(
  source.maps.map((map) => [`${map.mapGroup}:${map.mapNum}`, map]),
);

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
  return {
    name: unprefixed.replace(/ \(\d+\)$/, ""),
    region: prefix?.[1] || "",
  };
};

const displayFormName = (value) => {
  const labels = new Map([
    ["Rockruff (1)", "Rockruff"],
    ["Rockruff (2)", "Rockruff (Own Tempo)"],
    ["Lycanroc (1)", "Lycanroc (Midday)"],
    ["Lycanroc (2)", "Lycanroc (Midnight)"],
    ["Lycanroc (3)", "Lycanroc (Dusk)"],
  ]);
  return labels.get(value) || value;
};

const guideEntryForPokemon = (pokemon) => {
  if (!pokemon) return null;
  const form = splitFormName(pokemon.name);
  return guideDex.find(
    (entry) => normalizeName(entry.name) === normalizeName(form.name) && entry.region === form.region,
  );
};

const guideNumberForPokemon = (pokemon) => guideEntryForPokemon(pokemon)?.number || null;

const spriteForPokemon = (pokemon) => {
  return `assets/pokemon/${pokemon.id}.png`;
};

const methodLabels = {
  land: "Grass / cave",
  water: "Surfing",
  rockSmash: "Rock Smash",
  oldRod: "Old Rod",
  goodRod: "Good Rod",
  superRod: "Super Rod",
};

const speciesLocations = new Map();
const addSpeciesLocation = (speciesId, location) => {
  if (!speciesLocations.has(speciesId)) speciesLocations.set(speciesId, new Set());
  speciesLocations.get(speciesId).add(location);
};

const normalizeMethod = (methodId, encounter, timeOfDay = "") => {
  const species = new Map();
  const slots = (encounter.slots || []).filter(
    (slot) => !timeOfDay || slot.timeOfDay === timeOfDay,
  );
  for (const slot of slots) {
    const pokemon = pokemonById.get(slot.speciesId);
    if (!pokemon) continue;
    const current = species.get(slot.speciesId) || {
      speciesId: slot.speciesId,
      trackingId: guideNumberForPokemon(pokemon) ? String(guideNumberForPokemon(pokemon)) : `rex-${slot.speciesId}`,
      guideNumber: guideNumberForPokemon(pokemon),
      name: displayFormName(pokemon.name),
      types: pokemon.types.map((type) => type.toLowerCase()),
      stats: pokemon.stats || {},
      bst: Number.isFinite(pokemon.bst) ? pokemon.bst : null,
      sprite: spriteForPokemon(pokemon),
      rate: 0,
      minLevel: slot.minLevel,
      maxLevel: slot.maxLevel,
    };
    current.rate += slot.rate || 0;
    current.minLevel = Math.min(current.minLevel, slot.minLevel);
    current.maxLevel = Math.max(current.maxLevel, slot.maxLevel);
    species.set(slot.speciesId, current);
  }
  return {
    id: timeOfDay ? `${methodId}-${timeOfDay}` : methodId,
    label: `${methodLabels[methodId] || methodId}${
      timeOfDay ? ` · ${timeOfDay[0].toUpperCase()}${timeOfDay.slice(1)}` : ""
    }`,
    encounterRate: encounter.encRate || 0,
    species: [...species.values()].sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name)),
  };
};

const normalizeMethods = (methodId, encounter) => {
  const times = [...new Set((encounter.slots || []).map((slot) => slot.timeOfDay).filter(Boolean))];
  return times.length
    ? times.map((timeOfDay) => normalizeMethod(methodId, encounter, timeOfDay))
    : [normalizeMethod(methodId, encounter)];
};

const locations = activeLocations.map((location) => {
  const map = mapByGroupNumber.get(`${location.mapGroup}:${location.mapNum}`);
  const methods = [];
  for (const [methodId, encounter] of Object.entries(location.encounters || {})) {
    if (methodId === "fishing") {
      for (const [rodId, rodEncounter] of Object.entries(encounter || {})) {
        methods.push(...normalizeMethods(rodId, rodEncounter));
        for (const slot of rodEncounter.slots || []) addSpeciesLocation(slot.speciesId, location.name);
      }
    } else {
      methods.push(...normalizeMethods(methodId, encounter));
      for (const slot of encounter.slots || []) addSpeciesLocation(slot.speciesId, location.name);
    }
  }
  return {
    id: `${location.mapGroup}-${location.mapNum}`,
    name: location.name,
    mapType:
      !map?.mapTypeName || ["unknown", "none"].includes(map.mapTypeName)
        ? "wild area"
        : map.mapTypeName,
    map: {
      id: map?.id ?? null,
      name: map?.name || location.name,
      width: map?.pixelWidth || null,
      height: map?.pixelHeight || null,
      thumbnail: map ? `assets/maps/pokerex-${map.id}.png` : "",
      fullImage: map?.fullImage || "",
      pokerexUrl: map
        ? `https://pokerex.io/dreamstone-mysteries/v1.0/map-tiles/${map.id}`
        : "https://pokerex.io/dreamstone-mysteries/v1.0/map-tiles",
    },
    methods,
  };
});

const encounterSpecies = [...speciesLocations.entries()]
  .map(([speciesId, locationNames]) => {
    const pokemon = pokemonById.get(speciesId);
    const form = splitFormName(pokemon.name);
    const guideNumber = guideNumberForPokemon(pokemon);
    return {
      speciesId,
      trackingId: guideNumber ? String(guideNumber) : `rex-${speciesId}`,
      guideNumber,
      name: displayFormName(pokemon.name),
      baseName: form.name,
      region: form.region,
      types: pokemon.types.map((type) => type.toLowerCase()),
      stats: pokemon.stats || {},
      bst: Number.isFinite(pokemon.bst) ? pokemon.bst : null,
      sprite: spriteForPokemon(pokemon),
      locations: [...locationNames].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "Pokerex ROM extraction",
    url: "https://pokerex.io/dreamstone-mysteries/v1.0/locations",
    mapsUrl: "https://pokerex.io/dreamstone-mysteries/v1.0/map-tiles",
    extractedAt: pokerex.extractedAt,
    version: pokerex.version,
    scope: "Dreamstone custom map groups 0-4; inaccessible inherited Emerald maps excluded",
  },
  locations,
  encounterSpecies,
};

await fs.writeFile(outputPath, `window.DREAMSTONE_ENCOUNTERS = ${JSON.stringify(output, null, 2)};\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: path.relative(rootDir, outputPath),
      locations: locations.length,
      maps: locations.filter((location) => location.map.fullImage).length,
      encounterSpecies: encounterSpecies.length,
      matchedGuideEntries: encounterSpecies.filter((pokemon) => pokemon.guideNumber).length,
      additionalCollectionEntries: encounterSpecies.filter((pokemon) => !pokemon.guideNumber).length,
      collectionTotal:
        guideDex.length + encounterSpecies.filter((pokemon) => !pokemon.guideNumber).length,
    },
    null,
    2,
  ),
);

await import("./unify-pokemon-sprites.mjs");
