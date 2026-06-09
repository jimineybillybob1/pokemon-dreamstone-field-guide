import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const outputPath = path.join(rootDir, "data", "pokerex-moves.js");

const guideContext = { window: {} };
vm.createContext(guideContext);
vm.runInContext(await fs.readFile(path.join(rootDir, "data", "dreamstone-data.js"), "utf8"), guideContext);
const guideDex = guideContext.window.DREAMSTONE_DATA.dex;

const pokerex = JSON.parse(await fs.readFile(inputPath, "utf8"));
const source = pokerex.data;
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
  const form = splitFormName(pokemon.name);
  return guideDex.find(
    (entry) => normalizeName(entry.name) === normalizeName(form.name) && entry.region === form.region,
  );
};
const learnerForPokemon = (pokemon, extra = {}) => ({
  name: pokemon.name,
  guideNumber: guideEntryForPokemon(pokemon)?.number || null,
  ...extra,
});
const uniqueLearners = (learners, keyForLearner) =>
  [...new Map(learners.map((learner) => [keyForLearner(learner), learner])).values()].sort(
    (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) || (a.level || 0) - (b.level || 0),
  );

const movesById = new Map(source.moves.map((move) => [move.id, move]));
const movesByName = new Map(source.moves.map((move) => [move.name, move]));
const learnersByMoveId = new Map(
  source.moves.map((move) => [
    move.id,
    { levelUp: [], evolution: [], egg: [], teachable: [] },
  ]),
);

for (const pokemon of source.pokemon) {
  for (const entry of pokemon.learnset || []) {
    const learners = learnersByMoveId.get(entry.moveId);
    if (!learners) continue;
    if (entry.method === "evolution") learners.evolution.push(learnerForPokemon(pokemon));
    else learners.levelUp.push(learnerForPokemon(pokemon, { level: entry.level }));
  }
  for (const moveName of pokemon.eggMoves || []) {
    const move = movesByName.get(moveName);
    if (move) learnersByMoveId.get(move.id).egg.push(learnerForPokemon(pokemon));
  }
  for (const moveId of pokemon.teachableMoves || []) {
    if (movesById.has(moveId)) learnersByMoveId.get(moveId).teachable.push(learnerForPokemon(pokemon));
  }
}

const moves = source.moves.map((move) => {
  const learners = learnersByMoveId.get(move.id);
  const normalizedLearners = {
    levelUp: uniqueLearners(learners.levelUp, (learner) => `${learner.name}:${learner.level}`),
    evolution: uniqueLearners(learners.evolution, (learner) => learner.name),
    egg: uniqueLearners(learners.egg, (learner) => learner.name),
    teachable: uniqueLearners(learners.teachable, (learner) => learner.name),
  };
  return {
    id: move.id,
    name: move.name,
    type: move.type,
    category: move.cat,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    priority: move.priority,
    contact: move.contact,
    description: move.desc || "",
    effect: move.effectName || "",
    learners: normalizedLearners,
    learnerCount: new Set(
      Object.values(normalizedLearners).flatMap((group) => group.map((learner) => learner.name)),
    ).size,
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "Pokerex ROM extraction",
    url: "https://pokerex.io/dreamstone-mysteries/v1.0/moves",
    extractedAt: pokerex.extractedAt,
    version: pokerex.version,
    learnerMethods:
      "Level-up, evolution, and egg methods are explicit; Pokerex combines machine and tutor compatibility as teachable.",
  },
  moves,
};

await fs.writeFile(outputPath, `window.DREAMSTONE_MOVES=${JSON.stringify(output)};\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: path.relative(rootDir, outputPath),
      moves: moves.length,
      movesWithDescriptions: moves.filter((move) => move.description).length,
      movesWithEffects: moves.filter((move) => move.effect).length,
      movesWithLearners: moves.filter((move) => move.learnerCount).length,
      linkedLearners: moves.reduce(
        (total, move) =>
          total +
          Object.values(move.learners)
            .flat()
            .filter((learner) => learner.guideNumber).length,
        0,
      ),
    },
    null,
    2,
  ),
);
