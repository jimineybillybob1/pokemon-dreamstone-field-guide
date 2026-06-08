import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataSource = await fs.readFile(path.join(rootDir, "data", "dreamstone-data.js"), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(dataSource, context);
const data = context.window.DREAMSTONE_DATA;

const errors = [];
const check = (condition, message) => {
  if (!condition) errors.push(message);
};

check(Array.isArray(data.dex), "Dex data is missing");
check(data.dex.length === 315, `Expected 315 Pokémon, found ${data.dex.length}`);
check(new Set(data.dex.map((pokemon) => pokemon.number)).size === data.dex.length, "Duplicate dex numbers");
check(data.megas.length === 18, `Expected 18 Mega choices, found ${data.megas.length}`);
check(data.importantItems.length === 5, `Expected 5 important items, found ${data.importantItems.length}`);

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

for (const file of ["index.html", "styles.css", "app.js", "data/dreamstone-data.js"]) {
  try {
    const stat = await fs.stat(path.join(rootDir, file));
    check(stat.size > 0, `${file} is empty`);
  } catch {
    errors.push(`${file} does not exist`);
  }
}

const html = await fs.readFile(path.join(rootDir, "index.html"), "utf8");
const htmlIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
check(new Set(htmlIds).size === htmlIds.length, "index.html contains duplicate element IDs");

const localReferences = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((reference) => !reference.startsWith("#") && !reference.startsWith("http"));
for (const reference of localReferences) {
  try {
    await fs.access(path.join(rootDir, reference));
  } catch {
    errors.push(`index.html references missing file: ${reference}`);
  }
}

const locationCounts = data.dex
  .filter((pokemon) => pokemon.availability === "Available")
  .reduce((counts, pokemon) => counts.set(pokemon.location, (counts.get(pokemon.location) || 0) + 1), new Map());

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        status: "Guide validation passed",
        pokemon: data.dex.length,
        directEncounters: data.dex.filter((pokemon) => pokemon.availability === "Available").length,
        uniqueLocations: locationCounts.size,
        spriteReferencesChecked: data.dex.length + data.megas.length,
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
