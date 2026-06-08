import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(rootDir, "data", "dreamstone-data.js");
const outputPath = path.join(rootDir, "data", "pokemon-metadata.json");
const apiBase = "https://pokeapi.co/api/v2";

const source = await fs.readFile(dataPath, "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const dex = context.window.DREAMSTONE_DATA.dex;

const toApiName = (name) =>
  name
    .toLowerCase()
    .replaceAll("_", "-")
    .replace(/[.'’]/g, "")
    .replace(/\s+/g, "-");

const apiFormName = (pokemon) => {
  const base = toApiName(pokemon.name);
  if (!pokemon.region) return base;
  if (base === "tauros" && pokemon.region === "Paldea") return "tauros-paldea-combat-breed";
  return `${base}-${pokemon.region.toLowerCase()}`;
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: { "user-agent": "dreamstone-field-guide-builder" } });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.json();
};

const fetchPokemonForm = async (formName, defaultFormName) => {
  const response = await fetch(`${apiBase}/pokemon/${formName}`, {
    headers: { "user-agent": "dreamstone-field-guide-builder" },
  });
  if (response.ok) return response.json();
  if (response.status === 404 && formName !== defaultFormName) {
    return fetchJson(`${apiBase}/pokemon/${defaultFormName}`);
  }
  throw new Error(`Failed to fetch ${apiBase}/pokemon/${formName}: ${response.status}`);
};

const mapConcurrent = async (items, concurrency, mapper) => {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
};

console.log(`Fetching type and species metadata for ${dex.length} Dreamstone entries...`);
const entries = await mapConcurrent(dex, 12, async (pokemon, index) => {
  const speciesName = toApiName(pokemon.name);
  const formName = apiFormName(pokemon);
  const species = await fetchJson(`${apiBase}/pokemon-species/${speciesName}`);
  const defaultFormName =
    species.varieties.find((variety) => variety.is_default)?.pokemon.name || speciesName;
  const form = await fetchPokemonForm(formName, defaultFormName);
  if ((index + 1) % 25 === 0 || index + 1 === dex.length) {
    console.log(`Fetched ${index + 1}/${dex.length}`);
  }
  return {
    number: pokemon.number,
    speciesName,
    formName,
    types: form.types.sort((a, b) => a.slot - b.slot).map((entry) => entry.type.name),
    evolutionChainUrl: species.evolution_chain?.url || "",
  };
});

const chainUrls = [...new Set(entries.map((entry) => entry.evolutionChainUrl).filter(Boolean))];
console.log(`Fetching ${chainUrls.length} unique evolution chains...`);
const chains = await mapConcurrent(chainUrls, 12, fetchJson);

const parentsBySpecies = new Map();
const childrenBySpecies = new Map();
const addRelation = (map, key, value) => {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
};

const walkChain = (node, parent = "") => {
  const species = node.species.name;
  if (parent) {
    addRelation(parentsBySpecies, species, parent);
    addRelation(childrenBySpecies, parent, species);
  }
  node.evolves_to.forEach((child) => walkChain(child, species));
};
chains.forEach((chain) => walkChain(chain.chain));

const dexEntriesBySpecies = new Map();
entries.forEach((entry) => {
  if (!dexEntriesBySpecies.has(entry.speciesName)) dexEntriesBySpecies.set(entry.speciesName, []);
  dexEntriesBySpecies.get(entry.speciesName).push(entry.number);
});

const relationNumbers = (speciesNames = []) =>
  [...speciesNames]
    .flatMap((speciesName) => dexEntriesBySpecies.get(speciesName) || [])
    .sort((a, b) => a - b);

const metadata = Object.fromEntries(
  entries.map((entry) => [
    entry.number,
    {
      apiName: entry.formName,
      types: entry.types,
      evolvesFrom: relationNumbers(parentsBySpecies.get(entry.speciesName)),
      evolvesTo: relationNumbers(childrenBySpecies.get(entry.speciesName)),
    },
  ]),
);

await fs.writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      entries: Object.keys(metadata).length,
      typedEntries: Object.values(metadata).filter((entry) => entry.types.length).length,
      entriesWithEvolutionLinks: Object.values(metadata).filter(
        (entry) => entry.evolvesFrom.length || entry.evolvesTo.length,
      ).length,
      evolutionChains: chainUrls.length,
      output: path.relative(rootDir, outputPath),
    },
    null,
    2,
  ),
);
