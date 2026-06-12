import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(rootDir, "tmp", "dreamstone-source");
const pokerexPath = path.join(rootDir, "tmp", "pokerex-dreamstone-data.json");
const spriteOutputDir = path.join(rootDir, "assets", "pokemon");

const normalizeName = (value) =>
  String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const readWindowData = async (relativePath, globalName) => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(await fs.readFile(path.join(rootDir, relativePath), "utf8"), context);
  return context.window[globalName];
};

const walkFiles = async (directory, extension) => {
  const files = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkFiles(entryPath, extension)));
    else if (entry.name.endsWith(extension)) files.push(entryPath);
  }
  return files;
};

const constantsSource = await fs.readFile(
  path.join(sourceRoot, "include", "constants", "species.h"),
  "utf8",
);
const speciesIdByConstant = new Map(
  [...constantsSource.matchAll(/#define\s+(SPECIES_[A-Z0-9_]+)\s+(\d+)\b/g)].map((match) => [
    match[1],
    Number(match[2]),
  ]),
);

const graphicsSource = await fs.readFile(
  path.join(sourceRoot, "src", "data", "graphics", "pokemon.h"),
  "utf8",
);
const sourcePathByVariable = new Map();
for (const match of graphicsSource.matchAll(
  /const u32\s+(gMonFrontPic_\w+)\[\]\s*=\s*INCBIN_U32\("([^"]+)\.4bpp\.lz"\);/g,
)) {
  // Non-GBA-style graphics are the first declaration when both styles exist.
  if (!sourcePathByVariable.has(match[1])) sourcePathByVariable.set(match[1], `${match[2]}.png`);
}

const speciesInfoFiles = await walkFiles(
  path.join(sourceRoot, "src", "data", "pokemon", "species_info"),
  ".h",
);
speciesInfoFiles.push(path.join(sourceRoot, "src", "data", "pokemon", "species_info.h"));

const spriteBySpeciesId = new Map();
for (const speciesInfoFile of speciesInfoFiles) {
  const source = await fs.readFile(speciesInfoFile, "utf8");
  const entries = [...source.matchAll(/\[(SPECIES_[A-Z0-9_]+)\]\s*=\s*\{/g)];
  for (let index = 0; index < entries.length; index += 1) {
    const constant = entries[index][1];
    const speciesId = speciesIdByConstant.get(constant);
    if (!Number.isInteger(speciesId)) continue;
    const start = entries[index].index;
    const end = entries[index + 1]?.index ?? source.length;
    const frontPicVariable = source.slice(start, end).match(/\.frontPic\s*=\s*(gMonFrontPic_\w+)/)?.[1];
    const sourceRelativePath = sourcePathByVariable.get(frontPicVariable);
    if (sourceRelativePath) {
      spriteBySpeciesId.set(speciesId, {
        speciesId,
        constant,
        variable: frontPicVariable,
        sourceRelativePath,
        sourcePath: path.join(sourceRoot, sourceRelativePath),
        outputRelativePath: `assets/pokemon/${speciesId}.png`,
        outputPath: path.join(spriteOutputDir, `${speciesId}.png`),
      });
    }
  }
}

const macroSpriteOverrides = new Map([
  [664, "graphics/pokemon/scatterbug/anim_front.png"],
  [665, "graphics/pokemon/spewpa/anim_front.png"],
  [666, "graphics/pokemon/vivillon/anim_front.png"],
  [676, "graphics/pokemon/furfrou/anim_front.png"],
  [774, "graphics/pokemon/minior/front.png"],
]);
for (const [speciesId, sourceRelativePath] of macroSpriteOverrides) {
  spriteBySpeciesId.set(speciesId, {
    speciesId,
    constant: "",
    variable: "",
    sourceRelativePath,
    sourcePath: path.join(sourceRoot, sourceRelativePath),
    outputRelativePath: `assets/pokemon/${speciesId}.png`,
    outputPath: path.join(spriteOutputDir, `${speciesId}.png`),
  });
}

const pokerex = JSON.parse(await fs.readFile(pokerexPath, "utf8"));
const pokemonById = new Map(pokerex.data.pokemon.map((pokemon) => [pokemon.id, pokemon]));
const pokemonByNormalizedName = new Map();
for (const pokemon of pokerex.data.pokemon) {
  const key = normalizeName(pokemon.name.replace(/ \(\d+\)$/, ""));
  if (!pokemonByNormalizedName.has(key)) pokemonByNormalizedName.set(key, []);
  pokemonByNormalizedName.get(key).push(pokemon);
}

const regionalPrefixes = {
  Alola: "Alolan ",
  Galar: "Galarian ",
  Hisui: "Hisuian ",
  Paldea: "Paldean ",
};

const findPokemonByDisplayName = (name, region = "") => {
  const displayName = `${regionalPrefixes[region] || ""}${String(name).replaceAll("_", " ")}`;
  return (
    pokemonByNormalizedName.get(normalizeName(displayName))?.[0] ||
    pokemonByNormalizedName.get(normalizeName(name))?.[0] ||
    null
  );
};

const findMegaPokemon = (name) => {
  const normalized = normalizeName(name);
  return (
    pokerex.data.pokemon.find(
      (pokemon) =>
        normalizeName(pokemon.name) === normalizeName(`Mega ${name}`) ||
        normalizeName(pokemon.name) === normalized,
    ) || null
  );
};

const sourceSpeciesIdByGuideName = new Map([["koraidon", 1400]]);
const additionalRuntimeSpeciesIds = [917, 933, 934, 935];

const speciesIdForGuideEntry = (entry) =>
  findPokemonByDisplayName(entry.name, entry.region)?.id ||
  sourceSpeciesIdByGuideName.get(normalizeName(entry.name)) ||
  null;

const copySprite = async (speciesId) => {
  const sprite = spriteBySpeciesId.get(speciesId);
  if (!sprite) throw new Error(`No Dreamstone source sprite mapping for species ID ${speciesId}`);
  await fs.mkdir(spriteOutputDir, { recursive: true });
  const source = await fs.readFile(sprite.sourcePath);
  const image = PNG.sync.read(source);
  let frame = image;
  if (image.width === 64 && image.height > 64) {
    frame = new PNG({ width: 64, height: 64 });
    PNG.bitblt(image, frame, 0, 0, 64, 64, 0, 0);
  }
  const [backgroundRed, backgroundGreen, backgroundBlue] = frame.data;
  for (let index = 0; index < frame.data.length; index += 4) {
    if (
      frame.data[index] === backgroundRed &&
      frame.data[index + 1] === backgroundGreen &&
      frame.data[index + 2] === backgroundBlue
    ) {
      frame.data[index + 3] = 0;
    }
  }
  await fs.writeFile(sprite.outputPath, PNG.sync.write(frame));
  return sprite.outputRelativePath;
};

const audit = async () => {
  const guide = await readWindowData("data/dreamstone-data.js", "DREAMSTONE_DATA");
  const encounters = await readWindowData("data/pokerex-encounters.js", "DREAMSTONE_ENCOUNTERS");
  const trainers = await readWindowData("data/pokerex-trainers.js", "DREAMSTONE_TRAINERS");

  const guideMatches = guide.dex.map((entry) => {
    const speciesId = speciesIdForGuideEntry(entry);
    return { entry, speciesId, pokemon: pokemonById.get(speciesId) || null };
  });
  const megaMatches = guide.megas.map((entry) => ({ entry, pokemon: findMegaPokemon(entry.name) }));
  const usedSpeciesIds = new Set([
    ...guideMatches.map(({ speciesId }) => speciesId),
    ...megaMatches.map(({ pokemon }) => pokemon?.id),
    ...encounters.encounterSpecies.map((pokemon) => pokemon.speciesId),
    ...trainers.trainers.flatMap((trainer) => trainer.party.map((member) => member.speciesId)),
    ...additionalRuntimeSpeciesIds,
  ]);
  usedSpeciesIds.delete(undefined);

  const missingSourceFiles = [];
  for (const sprite of spriteBySpeciesId.values()) {
    try {
      await fs.access(sprite.sourcePath);
    } catch {
      missingSourceFiles.push(sprite);
    }
  }

  return {
    guide,
    encounters,
    trainers,
    guideMatches,
    megaMatches,
    usedSpeciesIds,
    missingGuideMatches: guideMatches.filter(({ speciesId }) => !speciesId),
    missingMegaMatches: megaMatches.filter(({ pokemon }) => !pokemon),
    missingUsedMappings: [...usedSpeciesIds].filter((speciesId) => !spriteBySpeciesId.has(speciesId)),
    missingAllPokemonMappings: pokerex.data.pokemon
      .map((pokemon) => pokemon.id)
      .filter((speciesId) => !spriteBySpeciesId.has(speciesId)),
    missingSourceFiles,
  };
};

export {
  audit,
  additionalRuntimeSpeciesIds,
  copySprite,
  findMegaPokemon,
  findPokemonByDisplayName,
  pokemonById,
  rootDir,
  speciesIdForGuideEntry,
  spriteBySpeciesId,
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await audit();
  console.log(
    JSON.stringify(
      {
        pokerexPokemon: pokemonById.size,
        sourceSpriteMappings: spriteBySpeciesId.size,
        usedSpecies: result.usedSpeciesIds.size,
        matchedGuideEntries: result.guideMatches.length - result.missingGuideMatches.length,
        guideEntries: result.guideMatches.length,
        matchedMegaEntries: result.megaMatches.length - result.missingMegaMatches.length,
        megaEntries: result.megaMatches.length,
        missingGuideMatches: result.missingGuideMatches.map(({ entry }) => ({
          number: entry.number,
          name: entry.name,
          region: entry.region,
        })),
        missingMegaMatches: result.missingMegaMatches.map(({ entry }) => entry),
        missingUsedMappings: result.missingUsedMappings.map((speciesId) => ({
          speciesId,
          name: pokemonById.get(speciesId)?.name,
        })),
        missingAllPokemonMappings: result.missingAllPokemonMappings.length,
        missingSourceFiles: result.missingSourceFiles.map((sprite) => sprite.sourceRelativePath),
      },
      null,
      2,
    ),
  );
}
