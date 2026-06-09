import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const outputPath = path.join(rootDir, "data", "pokerex-abilities.js");

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

const usersByAbility = new Map(
  source.abilities.slice(1).map((name, index) => [name, { id: index + 1, users: [] }]),
);

for (const pokemon of source.pokemon) {
  const guideNumber = guideEntryForPokemon(pokemon)?.number || null;
  for (const rawAbility of pokemon.abilities || []) {
    const hidden = rawAbility.endsWith(" (HA)");
    const name = rawAbility.replace(/ \(HA\)$/, "");
    const record = usersByAbility.get(name);
    if (record) record.users.push({ name: pokemon.name, guideNumber, hidden });
  }
}

const abilities = source.abilities.slice(1).map((name, index) => {
  const record = usersByAbility.get(name);
  const users = [
    ...new Map(record.users.map((user) => [`${user.name}:${user.hidden}`, user])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) || a.hidden - b.hidden);
  return {
    id: index + 1,
    name,
    description: source.abilityDescs[index + 1] || "",
    users,
    userCount: new Set(users.map((user) => user.name)).size,
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "Pokerex ROM extraction",
    url: "https://pokerex.io/dreamstone-mysteries/v1.0/abilities",
    extractedAt: pokerex.extractedAt,
    version: pokerex.version,
  },
  abilities,
};

await fs.writeFile(outputPath, `window.DREAMSTONE_ABILITIES=${JSON.stringify(output)};\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: path.relative(rootDir, outputPath),
      abilities: abilities.length,
      abilitiesWithDescriptions: abilities.filter((ability) => ability.description).length,
      abilitiesWithUsers: abilities.filter((ability) => ability.userCount).length,
      linkedUsers: abilities.reduce(
        (total, ability) => total + ability.users.filter((user) => user.guideNumber).length,
        0,
      ),
    },
    null,
    2,
  ),
);
