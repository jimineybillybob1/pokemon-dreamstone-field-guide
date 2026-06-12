import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const sourceRoot = path.join(rootDir, "tmp", "dreamstone-source");
const outputPath = path.join(rootDir, "data", "pokerex-trainers.js");
const trainerAssetDir = path.join(rootDir, "assets", "trainers", "front-pics");

const guideContext = { window: {} };
vm.createContext(guideContext);
vm.runInContext(await fs.readFile(path.join(rootDir, "data", "dreamstone-data.js"), "utf8"), guideContext);
const guideDex = guideContext.window.DREAMSTONE_DATA.dex;

const pokerex = JSON.parse(await fs.readFile(inputPath, "utf8"));
const source = pokerex.data;
const pokemonById = new Map(source.pokemon.map((pokemon) => [pokemon.id, pokemon]));
// Dreamstone's playable custom world uses map groups 0-4. Later groups retain
// inaccessible inherited Emerald content and internal test maps.
const activeTrainers = source.trainers.filter((trainer) => trainer.mapGroup <= 4);

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
  const form = splitFormName(pokemon.species || pokemon.name);
  return guideDex.find(
    (entry) => normalizeName(entry.name) === normalizeName(form.name) && entry.region === form.region,
  );
};
const titleCaseWords = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/(^|[\s\-'.])([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);

const constantsSource = await fs.readFile(
  path.join(sourceRoot, "include", "constants", "trainers.h"),
  "utf8",
);
const graphicsSource = await fs.readFile(
  path.join(sourceRoot, "src", "data", "graphics", "trainers.h"),
  "utf8",
);
const picConstantById = new Map(
  [...constantsSource.matchAll(/#define\s+(TRAINER_PIC_[A-Z0-9_]+)\s+(\d+)/g)].map((match) => [
    Number(match[2]),
    match[1],
  ]),
);
const frontPathByVariable = new Map(
  [...graphicsSource.matchAll(/const u32\s+(gTrainerFrontPic_\w+)\[\]\s*=\s*INCBIN_U32\("([^"]+)\.4bpp\.lz"\);/g)].map(
    (match) => [match[1], `${match[2]}.png`],
  ),
);
const tableSource = graphicsSource.slice(graphicsSource.indexOf("const struct TrainerSprite gTrainerSprites[]"));
const frontVariableByPicConstant = new Map(
  [...tableSource.matchAll(/TRAINER_SPRITE\(\s*(TRAINER_PIC_[A-Z0-9_]+)\s*,\s*(gTrainerFrontPic_\w+)/g)].map(
    (match) => [match[1], match[2]],
  ),
);

await fs.mkdir(trainerAssetDir, { recursive: true });
const spriteByPicId = new Map();
for (const trainerPicId of new Set(activeTrainers.map((trainer) => trainer.trainerPicId))) {
  const picConstant = picConstantById.get(trainerPicId);
  const frontVariable = frontVariableByPicConstant.get(picConstant);
  const sourceRelativePath = frontPathByVariable.get(frontVariable);
  if (!sourceRelativePath) throw new Error(`Unable to resolve trainer picture ID ${trainerPicId}`);
  const sourcePath = path.join(sourceRoot, sourceRelativePath);
  const outputRelativePath = `assets/trainers/front-pics/${trainerPicId}.png`;
  await fs.copyFile(sourcePath, path.join(rootDir, outputRelativePath));
  spriteByPicId.set(trainerPicId, outputRelativePath);
}

const trainers = activeTrainers.map((trainer) => ({
  id: trainer.id,
  name: titleCaseWords(trainer.name),
  trainerClass:
    !trainer.trainerClass || trainer.trainerClass.toLowerCase() === "none"
      ? ""
      : titleCaseWords(trainer.trainerClass),
  location: trainer.location || "Unknown location",
  mapGroup: trainer.mapGroup,
  mapNum: trainer.mapNum,
  sprite: spriteByPicId.get(trainer.trainerPicId),
  variantIndex: trainer.variantIndex,
  variantCount: trainer.variantCount,
  party: trainer.party.map((member) => {
    const sourcePokemon = pokemonById.get(member.speciesId);
    const guideEntry = guideEntryForPokemon(sourcePokemon || member);
    return {
      speciesId: member.speciesId,
      name: sourcePokemon?.name || member.species,
      guideNumber: guideEntry?.number || null,
      sprite: guideEntry?.sprite || `assets/sprites/pokerex-${member.speciesId}.png`,
      types: (sourcePokemon?.types || guideEntry?.types || []).map((type) => type.toLowerCase()),
      level: member.level,
      heldItem: member.heldItem || "",
      moves: (member.moves || []).map((move) => move.name),
    };
  }),
}));
const locations = [...new Set(trainers.map((trainer) => trainer.location))];

const output = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "Pokerex ROM extraction",
    url: "https://pokerex.io/dreamstone-mysteries/v1.0/trainers",
    spritesUrl: "https://github.com/dsmyst/dreamstone-mysteries/tree/master/graphics/trainers/front_pics",
    extractedAt: pokerex.extractedAt,
    version: pokerex.version,
    scope: "Dreamstone custom map groups 0-4; inaccessible inherited Emerald maps excluded",
  },
  locations,
  trainers,
};

await fs.writeFile(outputPath, `window.DREAMSTONE_TRAINERS=${JSON.stringify(output)};\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: path.relative(rootDir, outputPath),
      trainers: trainers.length,
      locations: locations.length,
      trainerSprites: spriteByPicId.size,
      partySpecies: new Set(trainers.flatMap((trainer) => trainer.party.map((member) => member.speciesId))).size,
      linkedPartyMembers: trainers.flatMap((trainer) => trainer.party).filter((member) => member.guideNumber).length,
    },
    null,
    2,
  ),
);
