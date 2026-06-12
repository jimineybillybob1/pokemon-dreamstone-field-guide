import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = path.resolve(process.argv[2] || path.join(rootDir, "tmp", "pokerex-dreamstone-data.json"));
const sourceIconDir = path.join(rootDir, "tmp", "dreamstone-source", "graphics", "items", "icons");
const outputPath = path.join(rootDir, "data", "pokerex-items.js");
const assetDir = path.join(rootDir, "assets", "items");

const pokerex = JSON.parse(await fs.readFile(inputPath, "utf8"));
const source = pokerex.data;
const activeTrainerIds = new Set(
  source.trainers.filter((trainer) => trainer.mapGroup <= 4).map((trainer) => trainer.id),
);
const activeWildSpeciesIds = new Set();
for (const location of source.locations.filter((entry) => entry.mapGroup <= 4)) {
  for (const [method, encounter] of Object.entries(location.encounters || {})) {
    const groups = method === "fishing" ? Object.values(encounter || {}) : [encounter];
    for (const group of groups) {
      for (const slot of group?.slots || []) activeWildSpeciesIds.add(slot.speciesId);
    }
  }
}
const uniqueBy = (values, keyForValue) => [...new Map(values.map((value) => [keyForValue(value), value])).values()];
const slugify = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const sourceSlug = (value) => slugify(value).replaceAll("-", "_");

const categoryForItem = (item) => {
  const name = item.name;
  const description = item.desc || "";
  if (item.id <= 27 || name === "Strange Ball") return "Poké Balls";
  if (item.id >= 588 && item.id <= 689) return "TMs & HMs";
  if (item.id >= 515 && item.id <= 587) return "Berries";
  if (
    item.pocketId === 7 ||
    item.id >= 690 && item.id <= 757 ||
    item.id >= 829 && item.id <= 853
  ) {
    return "Key & Story Items";
  }
  if (
    /evolve|evolution/i.test(description) ||
    / Stone$| Apple$| Pot$| Cuff$| Wreath$|Scale$|Upgrade$|Protector$|Electirizer$|Magmarizer$|Dubious Disc$|Reaper Cloth$|Prism Scale$|Whipped Dream$|Sachet$|Sweet$|Linking Cord$|Peat Block$|Black Augurite$|Metal Alloy$|Armor$/i.test(
      name,
    )
  ) {
    return "Evolution Items";
  }
  if (
    /ite$|Orb$|Crystal$|Core$|Globe$|Memory$|Drive$|Plate$|ium Z$|Z$|Rusted Sword|Rusted Shield|Mask$|Tera Shard$|Tera Orb/i.test(
      name,
    )
  ) {
    return "Battle Transformation";
  }
  if (
    item.holdEffect > 0 ||
    /hold item|held item|holder|held by/i.test(description) ||
    item.id >= 379 && item.id <= 514 ||
    item.id >= 758 && item.id <= 799
  ) {
    return "Held Items";
  }
  if (
    item.id >= 28 && item.id <= 134 ||
    /restore|heal|cure|revive|raises the base|base points|Exp\.|experience|mint|mochi|remedy/i.test(description)
  ) {
    return "Medicine & Training";
  }
  if (
    item.id >= 135 && item.id <= 215 ||
    /sell|souvenir|fossil|shard|ore|apricorn|mulch|feather|mushroom|pearl|nugget|stardust|star piece/i.test(
      `${name} ${description}`,
    )
  ) {
    return "Treasure & Materials";
  }
  return "Other Items";
};

const categoryOrder = [
  "Poké Balls",
  "Medicine & Training",
  "Evolution Items",
  "Held Items",
  "Battle Transformation",
  "Berries",
  "TMs & HMs",
  "Key & Story Items",
  "Treasure & Materials",
  "Other Items",
];

await fs.mkdir(assetDir, { recursive: true });
const genericIconPath = path.join(assetDir, "item-bag.png");
await fs.copyFile(
  path.join(rootDir, "tmp", "dreamstone-source", "graphics", "battle_anims", "sprites", "item_bag.png"),
  genericIconPath,
);
const iconCache = new Map();
const genericSourceIcon = (item) => {
  if (item.category === "TMs & HMs") return item.name.startsWith("HM") ? "hm" : "tm";
  if (/ Mint$/.test(item.name)) return "mint";
  if (/ Mochi$/.test(item.name)) return "mochi";
  if (/ Lure$/.test(item.name)) return "lure";
  if (/Rod$/.test(item.name)) return item.name === "Old Rod" ? "old_rod" : "super_rod";
  if (/Pass$|Ticket$/.test(item.name)) return "contest_pass";
  if (/Letter$/.test(item.name)) return "letter";
  if (/Shard$/.test(item.name)) return "shard";
  if (/Scarf$/.test(item.name)) return "scarf";
  if (/Pearl Necklace$/.test(item.name)) return "pearl_string";
  if (/Old Bone$/.test(item.name)) return "rare_bone";
  if (/Box Link$/.test(item.name)) return "pokemon_box_link";
  if (/Case$/.test(item.name)) return "pokeblock_case";
  return "";
};
const ensureIcon = async (item) => {
  const slug = slugify(item.name);
  if (iconCache.has(slug)) return iconCache.get(slug);
  const relativePath = `assets/items/${slug}.png`;
  const outputFile = path.join(rootDir, relativePath);
  const apiUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
  try {
    const response = await fetch(apiUrl, { headers: { "user-agent": "dreamstone-field-guide-builder" } });
    if (response.ok) {
      await fs.writeFile(outputFile, Buffer.from(await response.arrayBuffer()));
      const result = { path: relativePath, source: "PokeAPI" };
      iconCache.set(slug, result);
      return result;
    }
  } catch {
    // Dreamstone source artwork is the fallback below.
  }
  const sourceFile = path.join(sourceIconDir, `${sourceSlug(item.name)}.png`);
  try {
    await fs.copyFile(sourceFile, outputFile);
    const result = { path: relativePath, source: "Dreamstone source" };
    iconCache.set(slug, result);
    return result;
  } catch {
    const generic = genericSourceIcon({ ...item, category: categoryForItem(item) });
    if (generic) {
      try {
        await fs.copyFile(path.join(sourceIconDir, `${generic}.png`), outputFile);
        const result = { path: relativePath, source: "Dreamstone source" };
        iconCache.set(slug, result);
        return result;
      } catch {
        // Fall through to the neutral item-bag artwork.
      }
    }
    const result = { path: "assets/items/item-bag.png", source: "Dreamstone source" };
    iconCache.set(slug, result);
    return result;
  }
};

const activeMapGroup = (entry) => Number.isFinite(entry.mapGroup) && entry.mapGroup <= 4;
const normalizedLocation = (entry) => ({
  location: entry.locationName || entry.location || "",
  mapGroup: Number.isFinite(entry.mapGroup) ? entry.mapGroup : null,
  mapNum: Number.isFinite(entry.mapNum) ? entry.mapNum : null,
  amount: entry.amount || 1,
});

const items = [];
let next = 0;
const workers = Array.from({ length: 12 }, async () => {
  while (next < source.items.length) {
    const item = source.items[next++];
    const locations = item.locations || {};
    const soldIn = Array.isArray(locations.soldIn) ? locations.soldIn : [];
    const mappedShops = uniqueBy(
      soldIn.filter((entry) => entry.locationName && activeMapGroup(entry)).map(normalizedLocation),
      (entry) => entry.location,
    );
    const npcSources = uniqueBy(
      (Array.isArray(locations.giveByNpc) ? locations.giveByNpc : [])
        .filter(activeMapGroup)
        .map(normalizedLocation),
      (entry) => `${entry.location}:${entry.mapGroup}:${entry.mapNum}`,
    );
    const heldByWild = uniqueBy(
      (Array.isArray(locations.heldByWild) ? locations.heldByWild : [])
        .filter((entry) => activeWildSpeciesIds.has(entry.speciesId))
        .map((entry) => ({
          pokemon: entry.species || "",
          speciesId: entry.speciesId || null,
          chance: entry.chance || "",
        })),
      (entry) => `${entry.pokemon}:${entry.chance}`,
    );
    const carriedBy = uniqueBy(
      (Array.isArray(locations.carriedBy) ? locations.carriedBy : [])
        .filter((entry) => activeTrainerIds.has(entry.trainerId))
        .map((entry) => ({
          trainer: String(entry.trainerName || "").replace(/^\?\?\s*/, ""),
          trainerClass: String(entry.trainerClass || "").replace(/^\?\?\s*/, ""),
          location: entry.location || "",
        })),
      (entry) => `${entry.trainer}:${entry.location}`,
    );
    const foundIn = uniqueBy(
      (Array.isArray(locations.foundIn) ? locations.foundIn : [])
        .filter(activeMapGroup)
        .map(normalizedLocation),
      (entry) => `${entry.location}:${entry.mapGroup}:${entry.mapNum}`,
    );
    const icon = await ensureIcon(item);
    const sold = soldIn.length > 0;
    items.push({
      id: item.id,
      name: item.name,
      category: categoryForItem(item),
      description: item.desc || "No item description was extracted.",
      cost: sold && item.price > 0 ? item.price : null,
      sellValue: item.price > 0 ? Math.floor(item.price / 4) : null,
      icon: icon.path,
      iconSource: icon.source,
      acquisition: {
        soldInShop: sold,
        unmappedShop: soldIn.some((entry) => !entry.locationName),
        shops: mappedShops,
        npcSources,
        foundIn,
        heldByWild,
        carriedBy,
      },
    });
  }
});
await Promise.all(workers);
items.sort((a, b) => a.id - b.id);

const categories = categoryOrder
  .map((name) => ({ name, count: items.filter((item) => item.category === name).length }))
  .filter((category) => category.count);
const output = {
  generatedAt: new Date().toISOString(),
  source: {
    name: "Pokerex ROM extraction",
    url: "https://pokerex.io/dreamstone-mysteries/v1.0/items",
    extractedAt: pokerex.extractedAt,
    version: pokerex.version,
    notes: [
      "Unmapped Pokerex shops are intentionally displayed only as Sold in a shop.",
      "Dreamstone uses the Gen 9 sell rule: sell value is one quarter of the ROM item price.",
      "Pokerex pocket labels are unreliable for this ROM, so guide categories are derived from item identity and function.",
    ],
  },
  categories,
  items,
};

await fs.writeFile(outputPath, `window.DREAMSTONE_ITEMS=${JSON.stringify(output)};\n`, "utf8");

console.log(
  JSON.stringify(
    {
      output: path.relative(rootDir, outputPath),
      items: items.length,
      categories,
      withIcons: items.filter((item) => item.icon).length,
      pokeApiIcons: items.filter((item) => item.iconSource === "PokeAPI").length,
      dreamstoneIcons: items.filter((item) => item.iconSource === "Dreamstone source").length,
      soldInUnmappedShop: items.filter((item) => item.acquisition.unmappedShop).length,
      withNpcSources: items.filter((item) => item.acquisition.npcSources.length).length,
      withWildHolders: items.filter((item) => item.acquisition.heldByWild.length).length,
    },
    null,
    2,
  ),
);
