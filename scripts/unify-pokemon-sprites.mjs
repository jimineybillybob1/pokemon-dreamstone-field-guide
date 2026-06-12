import fs from "node:fs/promises";
import path from "node:path";
import {
  additionalRuntimeSpeciesIds,
  audit,
  copySprite,
  findMegaPokemon,
  rootDir,
  speciesIdForGuideEntry,
} from "./dreamstone-pokemon-sprites.mjs";

const result = await audit();
if (
  result.missingGuideMatches.length ||
  result.missingMegaMatches.length ||
  result.missingUsedMappings.length ||
  result.missingSourceFiles.length
) {
  throw new Error("Dreamstone source sprite audit failed; run scripts/dreamstone-pokemon-sprites.mjs");
}

const guideSpeciesIdByNumber = new Map();
for (const pokemon of result.guide.dex) {
  const speciesId = speciesIdForGuideEntry(pokemon);
  guideSpeciesIdByNumber.set(pokemon.number, speciesId);
  pokemon.sprite = await copySprite(speciesId);
}
for (const mega of result.guide.megas) {
  const speciesId = findMegaPokemon(mega.name)?.id;
  mega.sprite = await copySprite(speciesId);
}

for (const encounter of result.encounters.encounterSpecies) {
  encounter.sprite = await copySprite(encounter.speciesId);
}
for (const location of result.encounters.locations) {
  for (const method of location.methods) {
    for (const pokemon of method.species) {
      pokemon.sprite = await copySprite(pokemon.speciesId);
    }
  }
}

for (const trainer of result.trainers.trainers) {
  for (const member of trainer.party) {
    member.sprite = await copySprite(member.speciesId);
  }
}
for (const speciesId of additionalRuntimeSpeciesIds) await copySprite(speciesId);

await fs.writeFile(
  path.join(rootDir, "data", "dreamstone-data.js"),
  `window.DREAMSTONE_DATA = ${JSON.stringify(result.guide, null, 2)};\n`,
  "utf8",
);
await fs.writeFile(
  path.join(rootDir, "data", "pokerex-encounters.js"),
  `window.DREAMSTONE_ENCOUNTERS = ${JSON.stringify(result.encounters, null, 2)};\n`,
  "utf8",
);
await fs.writeFile(
  path.join(rootDir, "data", "pokerex-trainers.js"),
  `window.DREAMSTONE_TRAINERS=${JSON.stringify(result.trainers)};\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      source: "Dreamstone Mysteries source repository",
      guidePokemon: result.guide.dex.length,
      megas: result.guide.megas.length,
      encounterSpecies: result.encounters.encounterSpecies.length,
      trainerPartySpecies: new Set(
        result.trainers.trainers.flatMap((trainer) => trainer.party.map((member) => member.speciesId)),
      ).size,
      uniqueSourceSprites: result.usedSpeciesIds.size,
    },
    null,
    2,
  ),
);
