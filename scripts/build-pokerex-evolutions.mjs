import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const outputPath = path.join(rootDir, "data", "pokerex-evolutions.js");

const guideContext = { window: {} };
vm.createContext(guideContext);
vm.runInContext(
  await fs.readFile(path.join(rootDir, "data", "dreamstone-data.js"), "utf8"),
  guideContext,
);
const guideDex = guideContext.window.DREAMSTONE_DATA.dex;

const pokerex = JSON.parse(await fs.readFile(inputPath, "utf8"));
const source = pokerex.data;
const pokemonById = new Map(source.pokemon.map((pokemon) => [pokemon.id, pokemon]));
const moveById = new Map(source.moves.map((move) => [move.id, move]));
const itemById = new Map(source.items.map((item) => [item.id, item]));

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

const guideEntryForPokemon = (pokemon) => {
  if (!pokemon) return null;
  const form = splitFormName(pokemon.name);
  const nameMatches = guideDex.filter(
    (entry) => normalizeName(entry.name) === normalizeName(form.name),
  );
  return (
    nameMatches.find((entry) => entry.region === form.region) ||
    (nameMatches.length === 1 ? nameMatches[0] : null)
  );
};

const itemName = (id) => itemById.get(id)?.name || "the required item";
const moveName = (id) => moveById.get(id)?.name || "the required move";
const pokemonName = (id) => pokemonById.get(id)?.name || "the required Pokemon";
// Pokerex's exported labels after method 38 use an older enum; normalize them
// against Dreamstone's current evolution constants so move IDs never appear as levels.
const normalizedMethod = (evolution) => {
  const id = evolution.methodId;
  const param = evolution.param;
  if (id === 0) return null;
  if (id == null && evolution.method === "Level Up") return `Level ${param}`;
  if (id === 24) return "Friendship + matching move type";
  if (id === 29) return `Level up with ${pokemonName(param)} in party`;
  if (id === 31) return `Trade for ${pokemonName(param)}`;
  if (id === 32) return "Level up at the required map";
  if (id === 35) return `Land ${param} critical hits in one battle`;
  if (id === 36) return `Lose ${param}+ HP, then use the special evolution spot`;
  if (id === 37) return "Use Scroll of Darkness";
  if (id === 38) return "Use Scroll of Waters";
  if (id === 39) return `Use ${itemName(param)} (Night)`;
  if (id === 40) return `Use ${itemName(param)} (Day)`;
  if (id === 41) return `Hold ${itemName(param)}, then level up`;
  if (id === 42) return `Level ${param} (Fog)`;
  if (id === 43) return `Know ${moveName(param)} (Two Segment), then level up`;
  if (id === 44) return `Know ${moveName(param)} (Three Segment), then level up`;
  if (id === 45) return `Level ${param} (Family of Three)`;
  if (id === 46) return `Level ${param} (Family of Four)`;
  if (id === 47) return `Use ${moveName(param)} 20 times, then level up`;
  if (id === 48) return `Take ${param} recoil damage without fainting (Male), then level up`;
  if (id === 49) return `Take ${param} recoil damage without fainting (Female), then level up`;
  if (id === 50) return `Collect 999 ${itemName(param)}, then level up`;
  if (id === 51) return `Defeat 3 of the same Pokemon holding ${itemName(param)}, then level up`;
  if (id === 52) return `Walk ${param.toLocaleString()} steps, then level up`;
  return evolution.method || "Special";
};

const edgesByKey = new Map();
for (const pokemon of source.pokemon) {
  const from = guideEntryForPokemon(pokemon);
  if (!from) continue;
  for (const evolution of pokemon.evolutions || []) {
    const targetPokemon = pokemonById.get(evolution.targetId);
    const to = guideEntryForPokemon(targetPokemon);
    if (!to || from.number === to.number) continue;
    const method = normalizedMethod(evolution);
    if (!method) continue;
    const key = `${from.number}:${to.number}:${method}`;
    if (edgesByKey.has(key)) continue;
    edgesByKey.set(key, {
      fromGuideNumber: from.number,
      toGuideNumber: to.number,
      fromSpeciesId: pokemon.id,
      toSpeciesId: targetPokemon.id,
      method,
      methodId: evolution.methodId ?? null,
      methodBase: evolution.methodBase || "",
      param: evolution.param ?? null,
      paramKind: evolution.paramKind || "",
      paramName: evolution.paramName || "",
    });
  }
}

const edges = [...edgesByKey.values()].sort(
  (a, b) =>
    a.fromGuideNumber - b.fromGuideNumber ||
    a.toGuideNumber - b.toGuideNumber ||
    a.method.localeCompare(b.method),
);
const linkedGuideNumbers = new Set(
  edges.flatMap((edge) => [edge.fromGuideNumber, edge.toGuideNumber]),
);

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "Pokerex ROM extraction",
    url: "https://pokerex.io/dreamstone-mysteries/v1.0/pokemon",
    extractedAt: pokerex.extractedAt,
    version: pokerex.version,
  },
  edges,
};

await fs.writeFile(outputPath, `window.DREAMSTONE_EVOLUTIONS=${JSON.stringify(output)};\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: path.relative(rootDir, outputPath),
      edges: edges.length,
      linkedGuideEntries: linkedGuideNumbers.size,
      levelEvolutions: edges.filter((edge) => edge.paramKind === "level").length,
      specialEvolutions: edges.filter((edge) => edge.paramKind !== "level").length,
    },
    null,
    2,
  ),
);
