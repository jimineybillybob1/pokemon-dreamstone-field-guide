const data = window.DREAMSTONE_DATA;
const encounters = window.DREAMSTONE_ENCOUNTERS;
const moveData = window.DREAMSTONE_MOVES;
const abilityData = window.DREAMSTONE_ABILITIES;
const trainerData = window.DREAMSTONE_TRAINERS;
const itemData = window.DREAMSTONE_ITEMS;
const evolutionData = window.DREAMSTONE_EVOLUTIONS;
const storageKey = "dreamstone-field-guide-caught";
const notesKey = "dreamstone-field-guide-notes-hidden-v2";
const themeKey = "dreamstone-field-guide-theme";
const teamStorageKey = "dreamstone-field-guide-team";
const plannerStorageKey = "dreamstone-field-guide-planner";
const badgeStorageKey = "dreamstone-field-guide-badges";
const syncCodeKey = "dreamstone-field-guide-sync-code";
const saveFormat = "dreamstone-field-guide-save";
const saveVersion = 1;
const syncEndpoint = (window.DREAMSTONE_SYNC_ENDPOINT || "").replace(/\/+$/, "");

function loadTeam() {
  try {
    const saved = JSON.parse(localStorage.getItem(teamStorageKey) || "[]");
    return Array.from({ length: 6 }, (_, index) => ({
      pokemonNumber: Number.isFinite(saved[index]?.pokemonNumber)
        ? saved[index].pokemonNumber
        : null,
      moves: Array.from({ length: 4 }, (__, moveIndex) =>
        Number.isFinite(saved[index]?.moves?.[moveIndex]) ? saved[index].moves[moveIndex] : null,
      ),
      abilityId: Number.isFinite(saved[index]?.abilityId) ? saved[index].abilityId : null,
      nature: typeof saved[index]?.nature === "string" ? saved[index].nature : null,
    }));
  } catch {
    return Array.from({ length: 6 }, () => ({
      pokemonNumber: null,
      moves: [null, null, null, null],
      abilityId: null,
      nature: null,
    }));
  }
}

function loadPlanner() {
  try {
    const saved = JSON.parse(localStorage.getItem(plannerStorageKey) || "[]");
    return Array.from({ length: 6 }, (_, index) => ({
      pokemonNumber: Number.isFinite(saved[index]?.pokemonNumber)
        ? saved[index].pokemonNumber
        : null,
      moves: Array.from({ length: 4 }, (__, moveIndex) =>
        Number.isFinite(saved[index]?.moves?.[moveIndex]) ? saved[index].moves[moveIndex] : null,
      ),
      abilityId: Number.isFinite(saved[index]?.abilityId) ? saved[index].abilityId : null,
      nature: typeof saved[index]?.nature === "string" ? saved[index].nature : null,
    }));
  } catch {
    return Array.from({ length: 6 }, () => ({
      pokemonNumber: null,
      moves: [null, null, null, null],
      abilityId: null,
      nature: null,
    }));
  }
}

function loadBadges() {
  try {
    return new Set(JSON.parse(localStorage.getItem(badgeStorageKey) || "[]").map(String));
  } catch {
    return new Set();
  }
}

const state = {
  caught: new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")),
  badges: loadBadges(),
  notesHidden: localStorage.getItem(notesKey) === "true",
  theme: document.documentElement.dataset.theme || "light",
  collectionStatus: "all",
  collectionSearch: "",
  dexLimit: 50,
  moveLimit: 50,
  moveMode: "all",
  abilityLimit: 50,
  abilityFilters: {
    search: "",
    sort: "id",
  },
  trainerFilters: {
    search: "",
    location: "",
  },
  itemSearch: "",
  team: loadTeam(),
  planner: loadPlanner(),
  syncCode: localStorage.getItem(syncCodeKey) || "",
  moveFilters: {
    search: "",
    type: "",
    category: "",
    method: "",
    sort: "id",
  },
  filters: {
    search: "",
    location: "",
    rarity: "",
    region: "",
    type: "",
    availability: "",
    progress: "",
    sort: "number",
  },
};

const elements = {
  grid: document.querySelector("#pokemon-grid"),
  dexLoadMore: document.querySelector("#dex-load-more"),
  cardTemplate: document.querySelector("#pokemon-card-template"),
  emptyState: document.querySelector("#empty-state"),
  resultCount: document.querySelector("#result-count"),
  dashboardCaughtCount: document.querySelector("#dashboard-caught-count"),
  dashboardTotalCount: document.querySelector("#dashboard-total-count"),
  dashboardProgressBar: document.querySelector("#dashboard-progress-bar"),
  dashboardProgressPercent: document.querySelector("#dashboard-progress-percent"),
  dashboardBadgeCount: document.querySelector("#dashboard-badge-count"),
  dashboardBadges: document.querySelector("#dashboard-badges"),
  dashboardTeam: document.querySelector("#dashboard-team"),
  spoilerToggle: document.querySelector("#spoiler-toggle"),
  themeToggle: document.querySelector("#theme-toggle"),
  caughtTabCount: document.querySelector("#caught-tab-count"),
  collectionCaughtCount: document.querySelector("#collection-caught-count"),
  collectionMissingCount: document.querySelector("#collection-missing-count"),
  collectionPercent: document.querySelector("#collection-percent"),
  collectionProgressBar: document.querySelector("#collection-progress-bar"),
  collectionSearch: document.querySelector("#collection-search"),
  collectionGrid: document.querySelector("#collection-grid"),
  collectionResultCount: document.querySelector("#collection-result-count"),
  collectionEmptyState: document.querySelector("#collection-empty-state"),
  quickLocationList: document.querySelector("#quick-location-list"),
  locationList: document.querySelector("#location-list"),
  locationSearch: document.querySelector("#location-search"),
  moveList: document.querySelector("#move-list"),
  moveResultCount: document.querySelector("#move-result-count"),
  moveEmptyState: document.querySelector("#move-empty-state"),
  showMoreMoves: document.querySelector("#show-more-moves"),
  abilityList: document.querySelector("#ability-list"),
  abilityLoadMore: document.querySelector("#ability-load-more"),
  abilityResultCount: document.querySelector("#ability-result-count"),
  abilityEmptyState: document.querySelector("#ability-empty-state"),
  trainerSearch: document.querySelector("#trainer-search"),
  trainerResultCount: document.querySelector("#trainer-result-count"),
  trainerQuickLocationList: document.querySelector("#trainer-quick-location-list"),
  trainerLocationList: document.querySelector("#trainer-location-list"),
  trainerEmptyState: document.querySelector("#trainer-empty-state"),
  teamGrid: document.querySelector("#team-grid"),
  teamOffensiveCoverage: document.querySelector("#team-offensive-coverage"),
  plannerGrid: document.querySelector("#planner-grid"),
  plannerOffensiveCoverage: document.querySelector("#planner-offensive-coverage"),
  gymBadgeCount: document.querySelector("#gym-badge-count"),
  gymLeaderList: document.querySelector("#gym-leader-list"),
  saveCaughtCount: document.querySelector("#save-caught-count"),
  saveTeamCount: document.querySelector("#save-team-count"),
  syncCode: document.querySelector("#sync-code"),
  syncServiceStatus: document.querySelector("#sync-service-status"),
  saveOperationStatus: document.querySelector("#save-operation-status"),
  megaGrid: document.querySelector("#mega-grid"),
  megaNote: document.querySelector("#mega-note"),
  itemList: document.querySelector("#item-list"),
  itemSearch: document.querySelector("#item-search"),
  itemResultCount: document.querySelector("#item-result-count"),
  itemEmptyState: document.querySelector("#item-empty-state"),
  learnsetDialog: document.querySelector("#learnset-dialog"),
  learnsetDialogSprite: document.querySelector("#learnset-dialog-sprite"),
  learnsetDialogNumber: document.querySelector("#learnset-dialog-number"),
  learnsetDialogTitle: document.querySelector("#learnset-dialog-title"),
  learnsetDialogTypes: document.querySelector("#learnset-dialog-types"),
  learnsetDialogList: document.querySelector("#learnset-dialog-list"),
};

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
const uniqueInOrder = (values) => [...new Set(values.filter(Boolean))];
const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const natures = [
  { id: "hardy", name: "Hardy" },
  { id: "lonely", name: "Lonely", increased: "atk", decreased: "def" },
  { id: "brave", name: "Brave", increased: "atk", decreased: "spd" },
  { id: "adamant", name: "Adamant", increased: "atk", decreased: "spa" },
  { id: "naughty", name: "Naughty", increased: "atk", decreased: "spdef" },
  { id: "bold", name: "Bold", increased: "def", decreased: "atk" },
  { id: "docile", name: "Docile" },
  { id: "relaxed", name: "Relaxed", increased: "def", decreased: "spd" },
  { id: "impish", name: "Impish", increased: "def", decreased: "spa" },
  { id: "lax", name: "Lax", increased: "def", decreased: "spdef" },
  { id: "timid", name: "Timid", increased: "spd", decreased: "atk" },
  { id: "hasty", name: "Hasty", increased: "spd", decreased: "def" },
  { id: "serious", name: "Serious" },
  { id: "jolly", name: "Jolly", increased: "spd", decreased: "spa" },
  { id: "naive", name: "Naive", increased: "spd", decreased: "spdef" },
  { id: "modest", name: "Modest", increased: "spa", decreased: "atk" },
  { id: "mild", name: "Mild", increased: "spa", decreased: "def" },
  { id: "quiet", name: "Quiet", increased: "spa", decreased: "spd" },
  { id: "bashful", name: "Bashful" },
  { id: "rash", name: "Rash", increased: "spa", decreased: "spdef" },
  { id: "calm", name: "Calm", increased: "spdef", decreased: "atk" },
  { id: "gentle", name: "Gentle", increased: "spdef", decreased: "def" },
  { id: "sassy", name: "Sassy", increased: "spdef", decreased: "spd" },
  { id: "careful", name: "Careful", increased: "spdef", decreased: "spa" },
  { id: "quirky", name: "Quirky" },
];
const natureById = new Map(natures.map((nature) => [nature.id, nature]));
const natureStatLabels = { atk: "Atk", def: "Def", spa: "SpA", spdef: "SpD", spd: "Spe" };
const validNature = (nature) => (natureById.has(nature) ? nature : null);
const pageSize = 50;
const itemOpenCategories = new Set();
const itemCategoryLimits = new Map();
const locationOpenGroups = new Set();
let autoLoadObserver;
const encounterLocationsByGuideNumber = new Map();
encounters.encounterSpecies
  .filter((pokemon) => pokemon.guideNumber)
  .forEach((pokemon) => {
    if (!encounterLocationsByGuideNumber.has(pokemon.guideNumber)) {
      encounterLocationsByGuideNumber.set(pokemon.guideNumber, new Set());
    }
    pokemon.locations.forEach((location) =>
      encounterLocationsByGuideNumber.get(pokemon.guideNumber).add(location),
    );
  });
const syntheticCollectionEntries = encounters.encounterSpecies
  .filter((pokemon) => !pokemon.guideNumber)
  .map((pokemon) => ({
    ...pokemon,
    number: null,
    location: pokemon.locations[0] || "",
    rarity: "Wild encounter",
    availability: "Available",
    evolvesFrom: [],
    evolvesTo: [],
    source: "Pokerex",
  }));
const collectionDex = [...data.dex, ...syntheticCollectionEntries];
const dexId = (pokemon) => pokemon.trackingId || String(pokemon.number);
const validCaughtIds = new Set(collectionDex.map(dexId));
const isCaught = (pokemon) => state.caught.has(dexId(pokemon));
const pokemonByNumber = new Map(data.dex.map((pokemon) => [pokemon.number, pokemon]));
const evolutionOutgoingByNumber = new Map(data.dex.map((pokemon) => [pokemon.number, []]));
const evolutionIncomingByNumber = new Map(data.dex.map((pokemon) => [pokemon.number, []]));
(evolutionData.edges || []).forEach((edge) => {
  evolutionOutgoingByNumber.get(edge.fromGuideNumber)?.push(edge);
  evolutionIncomingByNumber.get(edge.toGuideNumber)?.push(edge);
});
const dexCardByNumber = new Map();
let teamMatchupRevision = 0;
const trainerPokemonBySpeciesId = new Map(
  trainerData.trainers.flatMap((trainer) =>
    trainer.party.map((member) => [member.speciesId, member]),
  ),
);
const moveById = new Map(moveData.moves.map((move) => [move.id, move]));
const abilityById = new Map(abilityData.abilities.map((ability) => [ability.id, ability]));
const abilitiesByPokemon = new Map(data.dex.map((pokemon) => [pokemon.number, []]));
abilityData.abilities.forEach((ability) => {
  ability.users.forEach((user) => {
    if (user.guideNumber) abilitiesByPokemon.get(user.guideNumber)?.push({ ability, hidden: user.hidden });
  });
});
abilitiesByPokemon.forEach((abilities, number) => {
  const uniqueAbilities = [
    ...new Map(abilities.map((entry) => [`${entry.ability.id}:${entry.hidden}`, entry])).values(),
  ].sort((a, b) => a.ability.name.localeCompare(b.ability.name) || a.hidden - b.hidden);
  abilitiesByPokemon.set(number, uniqueAbilities);
});
const tutorsByMoveId = new Map();
(moveData.tutors || []).forEach((tutor) => {
  if (!tutorsByMoveId.has(tutor.moveId)) tutorsByMoveId.set(tutor.moveId, []);
  tutorsByMoveId.get(tutor.moveId).push(tutor);
});
const tutorMoveIds = new Set(tutorsByMoveId.keys());
const compatibleMoveIdsByPokemon = new Map(data.dex.map((pokemon) => [pokemon.number, new Set()]));
const moveLearningByPokemon = new Map(data.dex.map((pokemon) => [pokemon.number, new Map()]));
moveData.moves.forEach((move) => {
  Object.entries(move.learners).forEach(([method, learners]) => {
    learners.forEach((learner) => {
      if (!learner.guideNumber) return;
      compatibleMoveIdsByPokemon.get(learner.guideNumber)?.add(move.id);
      const pokemonMoves = moveLearningByPokemon.get(learner.guideNumber);
      if (!pokemonMoves) return;
      if (!pokemonMoves.has(move.id)) {
        pokemonMoves.set(move.id, {
          move,
          levelUp: new Set(),
          evolution: false,
          egg: false,
          teachable: false,
        });
      }
      const learning = pokemonMoves.get(move.id);
      if (method === "levelUp" && Number.isFinite(learner.level)) learning.levelUp.add(learner.level);
      else if (method in learning) learning[method] = true;
    });
  });
});
const pokemonOptions = [...data.dex].sort((a, b) => a.number - b.number);
const gymLeaders = [
  {
    id: "king",
    order: 1,
    name: "Inger",
    type: "Rock",
    location: "Gastree City",
    badge: "King Badge",
    sprite: "assets/trainers/inger.png",
    team: [
      { number: 17, level: 12 },
      { number: 240, level: 12, displayName: "Alolan Geodude" },
      { number: 162, level: 13 },
    ],
  },
  {
    id: "cinder",
    order: 2,
    name: "Ariana",
    type: "Fire",
    location: "Ceram Base Camp",
    badge: "Cinder Badge",
    sprite: "assets/trainers/ariana.png",
    team: [
      { number: 65, level: 16, displayName: "Hisuian Growlithe" },
      { number: 67, level: 16 },
      { number: 274, level: 17, displayName: "Paldean Tauros" },
    ],
  },
  {
    id: "stoic",
    order: 3,
    name: "Kohla",
    type: "Mixed",
    location: "Galacrest City",
    badge: "Stoic Badge",
    sprite: "assets/trainers/kohla.png",
    team: [
      { number: 238, level: 20 },
      { number: 192, level: 21 },
      { number: 225, level: 21 },
      { number: 196, level: 23 },
    ],
  },
  {
    id: "drama",
    order: 4,
    name: "Gloria",
    type: "Grass",
    location: "Silversun City",
    badge: "Drama Badge",
    sprite: "assets/trainers/gloria.png",
    team: [
      { number: 55, level: 25 },
      { number: 8, level: 26, displayName: "Galarian Linoone" },
      { number: 53, level: 26, displayName: "Hisuian Lilligant" },
      { number: 215, level: 26 },
    ],
  },
  {
    id: "ironfist",
    order: 5,
    name: "Carona",
    type: "Fighting",
    location: "Mirroh Base Camp",
    badge: "Ironfist Badge",
    sprite: "assets/trainers/carona.png",
    team: [
      { number: 114, level: 31 },
      { number: 188, level: 32 },
      { number: 61, level: 32 },
      { number: 25, level: 34, displayName: "Mega Medicham", sprite: "assets/pokemon/934.png" },
    ],
  },
  {
    id: "charge",
    order: 6,
    name: "Viniel",
    type: "Electric",
    location: "Winterlilly Hollow",
    badge: "Charge Badge",
    sprite: "assets/trainers/viniel.png",
    team: [
      { number: 269, level: 41 },
      { number: 107, level: 42 },
      { number: 58, level: 42 },
      { number: 237, level: 43, displayName: "Mega Manectric", sprite: "assets/pokemon/935.png" },
    ],
  },
  {
    id: "river",
    order: 7,
    name: "Jania",
    type: "Water",
    location: "Pelluca City",
    badge: "River Badge",
    sprite: "assets/trainers/jania.png",
    team: [
      { number: 250, level: 41 },
      { number: 278, level: 43 },
      { number: 121, level: 43 },
      { number: 233, level: 42 },
      {
        number: 281,
        level: 45,
        displayName: "Mega Gyarados",
        sprite: "assets/pokemon/917.png",
        types: ["water", "dark"],
      },
    ],
  },
  {
    id: "granite",
    order: 8,
    name: "Raazi",
    type: "Steel",
    location: "Rivetshore City / S.S. Elegant",
    badge: "Granite Badge",
    sprite: "assets/trainers/raazi.png",
    team: [
      { number: 137, level: 48, displayName: "Alolan Dugtrio", types: ["ground", "steel"] },
      { number: 205, level: 50 },
      { number: 99, level: 51 },
      { number: 71, level: 51 },
      {
        number: 33,
        level: 52,
        displayName: "Mega Aggron",
        sprite: "assets/pokemon/933.png",
        types: ["steel"],
      },
    ],
  },
];
const validBadgeIds = new Set(gymLeaders.map((leader) => leader.id));
const typeChart = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2,
    ice: 2,
    bug: 2,
    rock: 0.5,
    dragon: 0.5,
    steel: 2,
  },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};
const battleTypes = Object.keys(typeChart);
// Wild location UI is authoritative to Pokerex encounters; spreadsheet locations are legacy metadata only.
const pokerexLocationCache = new Map();
const pokerexLocationsForPokemon = (pokemon) => {
  const cacheKey = pokemon.number ? `guide-${pokemon.number}` : pokemon.trackingId;
  if (cacheKey && pokerexLocationCache.has(cacheKey)) return pokerexLocationCache.get(cacheKey);
  const locations = uniqueSorted(
    pokemon.number
      ? [...(encounterLocationsByGuideNumber.get(pokemon.number) || [])]
      : [...(pokemon.locations || [])],
  );
  if (cacheKey) pokerexLocationCache.set(cacheKey, locations);
  return locations;
};
const pokemonSearchTextByNumber = new Map(
  data.dex.map((pokemon) => [
    pokemon.number,
    [
      pokemon.name,
      pokemon.region,
      pokerexLocationsForPokemon(pokemon).join(" "),
      pokemon.rarity,
      pokemon.notes,
      pokemon.types.join(" "),
      [...pokemon.evolvesFrom, ...pokemon.evolvesTo]
        .map((number) => pokemonByNumber.get(number)?.name || "")
        .join(" "),
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);
const locationFallbackForPokemon = (pokemon) =>
  pokemon.availability === "Unobtainable" ? "Unobtainable" : "No wild encounter listed";
const normalizedLocationName = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/\bmt\.?\s*/g, "mount ")
    .replace(/\bcaves?\b/g, "interior")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const encounterLocationByNormalizedName = new Map(
  encounters.locations.map((location) => [normalizedLocationName(location.name), location.name]),
);
const encounterLocationAliases = new Map(
  Object.entries({
    "Fennilahl Underpass": "Fennilahl Tunnel",
    "Mirroh Interior B1F": "Mt. Mirroh B1f",
    "Mirroh Peak": "Mt. Mirroh Peak",
    "Mt Mirroh Interior 1F": "Mt. Mirroh",
    "Mt. Mirroh Interior 1F": "Mt. Mirroh",
    "Mt Mirroh Interior B1F": "Mt. Mirroh B1f",
    "Mt Mirroh Interior B2F": "Mt. Mirroh B2f",
    "Route 3 Caverns": "Route 3 Underpass",
    "Route 3 Deeper": "Route 3 Depths",
    "Route 4 (Trolling Rod)": "Route 4",
    "Route 6 Ranger Institute": "Ranger Institute",
    "Rivetshore Ranger Institute": "Ranger Institute",
  }).map(([alias, canonical]) => [normalizedLocationName(alias), canonical]),
);
const canonicalEncounterLocationName = (location) =>
  encounterLocationByNormalizedName.get(normalizedLocationName(location)) ||
  encounterLocationAliases.get(normalizedLocationName(location)) ||
  null;
const routeNumber = (name) => Number(/^Route\s+(\d+)/i.exec(name || "")?.[1]) || null;
const pokerexLocationComparator = (a, b) => {
  const aRoute = routeNumber(a.name);
  const bRoute = routeNumber(b.name);
  if (aRoute !== null && bRoute !== null) return aRoute - bRoute;
  if (aRoute !== null) return -1;
  if (bRoute !== null) return 1;
  return a.name.localeCompare(b.name);
};
const pokerexOrderedLocations = [...encounters.locations].sort(pokerexLocationComparator);
const quickLocations = uniqueInOrder(pokerexOrderedLocations.map((location) => location.name));
const locationFilterOptions = uniqueSorted(quickLocations);
const formatLocations = (locations, limit = 3) => {
  if (!locations.length) return "";
  const visible = locations.slice(0, limit).join(", ");
  return locations.length > limit ? `${visible} +${locations.length - limit} more` : visible;
};
const statDefinitions = [
  { key: "hp", label: "HP", max: 120 },
  { key: "atk", label: "Atk", max: 120 },
  { key: "def", label: "Def", max: 120 },
  { key: "spa", label: "SpA", max: 120 },
  { key: "spdef", label: "SpD", max: 120 },
  { key: "spd", label: "Spe", max: 120 },
  { key: "bst", label: "BST", max: 720 },
];
const learnerMethodDefinitions = [
  { key: "levelUp", label: "Level Up" },
  { key: "evolution", label: "Evolution" },
  { key: "egg", label: "Egg" },
  { key: "teachable", label: "Teachable" },
];
const moveLearningForPokemon = (pokemonNumber, moveId) =>
  moveLearningByPokemon.get(pokemonNumber)?.get(moveId);
const moveLearningLabels = (pokemonNumber, moveId, concise = false) => {
  const learning = moveLearningForPokemon(pokemonNumber, moveId);
  if (!learning) return [];
  const labels = [];
  const levels = [...learning.levelUp].sort((a, b) => a - b);
  if (levels.length) labels.push(`Lv. ${levels.join(" / ")}`);
  if (learning.evolution) labels.push("Evolution");
  if (learning.egg) labels.push("Egg");
  if (learning.teachable) {
    const tutorLocations = uniqueInOrder((tutorsByMoveId.get(moveId) || []).map((tutor) => tutor.location));
    if (tutorLocations.length) {
      labels.push(
        concise && tutorLocations.length > 1
          ? `Tutor: ${tutorLocations[0]} +${tutorLocations.length - 1}`
          : `Tutor: ${tutorLocations.join(", ")}`,
      );
    } else {
      labels.push("TM / teachable");
    }
  }
  return labels;
};
const levelUpMovesForPokemon = (pokemonNumber) =>
  [...(moveLearningByPokemon.get(pokemonNumber)?.values() || [])]
    .filter((learning) => learning.levelUp.size)
    .sort(
      (a, b) =>
        Math.min(...a.levelUp) - Math.min(...b.levelUp) ||
        a.move.name.localeCompare(b.move.name),
    );
const moveSearchTextById = new Map(
  moveData.moves.map((move) => [
    move.id,
    [
      move.name,
      move.type,
      move.category,
      move.description,
      move.effect,
      ...(tutorsByMoveId.get(move.id) || []).map((tutor) => tutor.location),
      ...Object.values(move.learners).flatMap((learners) => learners.map((learner) => learner.name)),
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);
const abilitySearchTextById = new Map(
  abilityData.abilities.map((ability) => [
    ability.id,
    [ability.name, ability.description, ...ability.users.map((user) => user.name)].join(" ").toLowerCase(),
  ]),
);

function setSelectOptions(id, values, formatLabel = (value) => value) {
  const select = document.querySelector(id);
  values.forEach((value) => select.add(new Option(formatLabel(value), value)));
}

function initializeSummary() {
  setSelectOptions("#location-filter", locationFilterOptions);
  setSelectOptions("#rarity-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.rarity)));
  setSelectOptions("#region-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.region)));
  setSelectOptions("#type-filter", uniqueSorted(data.dex.flatMap((pokemon) => pokemon.types)), titleCase);
  setSelectOptions("#move-type-filter", uniqueSorted(moveData.moves.map((move) => move.type)));
  setSelectOptions("#move-category-filter", uniqueSorted(moveData.moves.map((move) => move.category)));
  document.querySelector("#tutor-count").textContent = tutorMoveIds.size;
  setSelectOptions(
    "#availability-filter",
    uniqueSorted(data.dex.map((pokemon) => pokemon.availability)),
    (availability) => (availability === "Evolution / special" ? "Evolution" : availability),
  );
}

function renderQuickLocations() {
  const fragment = document.createDocumentFragment();
  ["", ...quickLocations].forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-location";
    button.classList.toggle("is-active", state.filters.location === location);
    button.textContent = location || "All";
    button.addEventListener("click", () => setLocationFilter(location));
    fragment.append(button);
  });
  elements.quickLocationList.replaceChildren(fragment);
  if (!state.filters.location) {
    elements.quickLocationList.scrollLeft = 0;
  } else {
    elements.quickLocationList.querySelector(".is-active")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }
}

function setLocationFilter(location) {
  state.filters.location = location;
  document.querySelector("#location-filter").value = location;
  renderQuickLocations();
  renderDex(true);
}

function createBadgeButton(leader, compact = false) {
  const obtained = state.badges.has(leader.id);
  const badgePosition = ((leader.order - 1) / (gymLeaders.length - 1)) * 100;
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact ? "dashboard-badge" : "gym-badge-toggle";
  button.classList.toggle("is-obtained", obtained);
  button.setAttribute("aria-pressed", String(obtained));
  button.setAttribute("aria-label", `${obtained ? "Remove" : "Mark obtained"}: ${leader.badge}`);
  button.innerHTML = compact
    ? `<span class="badge-sprite" style="--badge-position: ${badgePosition}%"></span><small>${leader.badge.replace(" Badge", "")}</small>`
    : `<span class="badge-sprite gym-badge-toggle__stone" style="--badge-position: ${badgePosition}%"></span><span><strong>${leader.badge}</strong><small>${obtained ? "Obtained" : "Mark obtained"}</small></span>`;
  button.addEventListener("click", () => toggleBadge(leader.id));
  return button;
}

function renderJourneyOverview() {
  if (!elements.dashboardBadges || !elements.dashboardTeam) return;
  const badges = document.createDocumentFragment();
  gymLeaders.forEach((leader) => badges.append(createBadgeButton(leader, true)));
  elements.dashboardBadges.replaceChildren(badges);
  elements.dashboardBadgeCount.textContent = state.badges.size;

  const team = document.createDocumentFragment();
  state.team.forEach((slot, index) => {
    const pokemon = pokemonByNumber.get(slot.pokemonNumber);
    const entry = document.createElement("span");
    entry.className = "dashboard-team-slot";
    entry.classList.toggle("is-filled", Boolean(pokemon));
    entry.innerHTML = pokemon
      ? `<img src="${pokemon.sprite}" alt="" width="36" height="36"><small>${pokemon.name.replaceAll("_", " ")}</small>`
      : `<span>${index + 1}</span><small>Empty</small>`;
    team.append(entry);
  });
  elements.dashboardTeam.replaceChildren(team);
}

function persistBadges() {
  localStorage.setItem(badgeStorageKey, JSON.stringify([...state.badges]));
  renderJourneyOverview();
  renderGyms();
}

function toggleBadge(id) {
  if (!validBadgeIds.has(id)) return;
  if (state.badges.has(id)) state.badges.delete(id);
  else state.badges.add(id);
  persistBadges();
}

function updateProgress() {
  const caughtCount = collectionDex.filter(isCaught).length;
  const percent = Math.round((caughtCount / collectionDex.length) * 100);
  elements.dashboardCaughtCount.textContent = caughtCount;
  elements.dashboardTotalCount.textContent = collectionDex.length;
  elements.dashboardProgressBar.style.width = `${percent}%`;
  elements.dashboardProgressPercent.textContent = `${percent}% complete`;
  elements.caughtTabCount.textContent = caughtCount;
  elements.collectionCaughtCount.textContent = caughtCount;
  elements.collectionMissingCount.textContent = collectionDex.length - caughtCount;
  elements.collectionPercent.textContent = `${percent}%`;
  elements.collectionProgressBar.style.width = `${percent}%`;
  updateSaveSummary();
  renderJourneyOverview();
}

function persistCaught() {
  localStorage.setItem(storageKey, JSON.stringify([...state.caught]));
  updateProgress();
}

function toggleCaught(pokemon) {
  const id = dexId(pokemon);
  if (state.caught.has(id)) state.caught.delete(id);
  else state.caught.add(id);
  persistCaught();
  renderDex();
  renderLocations(elements.locationSearch.value);
  renderCollection();
}

function renderTypeBadges(container, types) {
  const fragment = document.createDocumentFragment();
  types.forEach((type) => {
    const badge = document.createElement("span");
    badge.className = "type-badge";
    badge.dataset.type = type;
    badge.textContent = type;
    fragment.append(badge);
  });
  container.replaceChildren(fragment);
}

function evolutionMethodLabel(method) {
  return String(method || "Special").replace(/^Level (\d+)/, "Lv. $1");
}

function groupEvolutionEdges(edges, relationKey) {
  const grouped = new Map();
  edges.forEach((edge) => {
    const number = edge[relationKey];
    if (!grouped.has(number)) grouped.set(number, { number, methods: new Set() });
    grouped.get(number).methods.add(evolutionMethodLabel(edge.method));
  });
  return [...grouped.values()];
}

function renderEvolutionLinks(card, edges, selector, relationKey) {
  const group = card.querySelector(selector);
  if (!edges.length) return;

  group.hidden = false;
  const links = group.querySelector(".evolution-links");
  groupEvolutionEdges(edges, relationKey).forEach(({ number, methods }) => {
    const related = pokemonByNumber.get(number);
    if (!related) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "evolution-link";
    button.setAttribute("aria-label", `Go to ${related.name}`);
    button.innerHTML = `
      <img src="${related.sprite}" alt="" width="38" height="38" loading="lazy">
      <span class="evolution-link__details">
        <strong>${related.name.replaceAll("_", " ")}</strong>
        <small>${[...methods].join(" / ")}</small>
      </span>
    `;
    button.addEventListener("click", () => focusPokemon(number));
    links.append(button);
  });
}

function renderLocationLinks(container, locations, fallback) {
  if (!locations.length) {
    container.textContent = fallback;
    return;
  }
  const fragment = document.createDocumentFragment();
  const seen = new Set();
  locations.forEach((location) => {
    const canonicalLocation = canonicalEncounterLocationName(location);
    const key = canonicalLocation || location;
    if (seen.has(key)) return;
    seen.add(key);
    if (!canonicalLocation) {
      const label = document.createElement("span");
      label.className = "pokemon-location-label";
      label.textContent = location;
      fragment.append(label);
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pokemon-location-link";
    button.textContent = canonicalLocation;
    button.setAttribute("aria-label", `Open encounters for ${canonicalLocation}`);
    button.addEventListener("click", () => openLocation(canonicalLocation));
    fragment.append(button);
  });
  container.replaceChildren(fragment);
}

function renderPokemonStats(card, pokemon, natureId = null) {
  const section = card.querySelector(".pokemon-stats");
  if (!pokemon.bst || !pokemon.stats) return;
  const nature = natureById.get(natureId);

  section.hidden = false;
  const heading = document.createElement("header");
  heading.innerHTML = `<span>Base stats</span>`;
  if (nature) {
    const note = document.createElement("small");
    note.textContent = nature.increased ? "Nature effects highlighted" : "Neutral nature";
    heading.append(note);
  }
  const rows = document.createElement("div");
  rows.className = "pokemon-stats__rows";
  statDefinitions.forEach(({ key, label, max }) => {
    const value = key === "bst" ? pokemon.bst : pokemon.stats[key];
    if (!Number.isFinite(value)) return;
    const row = document.createElement("div");
    row.className = `pokemon-stat pokemon-stat--${key}`;
    const natureEffect =
      nature?.increased === key ? "increased" : nature?.decreased === key ? "decreased" : "";
    if (natureEffect) row.classList.add(`is-nature-${natureEffect}`);
    row.innerHTML = `
      <span>${label}</span>
      <div class="pokemon-stat__track" title="${label}: ${value}">
        <span class="pokemon-stat__fill" style="width: ${Math.min((value / max) * 100, 100)}%"></span>
      </div>
      <strong>${value}</strong>
    `;
    if (natureEffect) {
      const effect = document.createElement("em");
      effect.className = "pokemon-stat__nature-effect";
      effect.textContent = natureEffect === "increased" ? "+10%" : "-10%";
      effect.setAttribute(
        "aria-label",
        `${nature.name} nature ${natureEffect === "increased" ? "increases" : "decreases"} ${label} by 10 percent`,
      );
      row.append(effect);
    }
    rows.append(row);
  });
  section.append(heading, rows);
}

function persistTeam() {
  localStorage.setItem(teamStorageKey, JSON.stringify(state.team));
  updateSaveSummary();
  renderJourneyOverview();
}

function persistPlanner() {
  localStorage.setItem(plannerStorageKey, JSON.stringify(state.planner));
}

function updateSaveSummary() {
  if (!elements.saveCaughtCount || !elements.saveTeamCount) return;
  elements.saveCaughtCount.textContent = collectionDex.filter(isCaught).length;
  elements.saveTeamCount.textContent = state.team.filter((slot) => slot.pokemonNumber).length;
}

function createSaveDocument() {
  return {
    format: saveFormat,
    version: saveVersion,
    exportedAt: new Date().toISOString(),
    caught: [...state.caught].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true }),
    ),
    badges: [...state.badges],
    team: state.team.map((slot) => ({
      pokemonNumber: slot.pokemonNumber,
      moves: [...slot.moves],
      abilityId: slot.abilityId,
      nature: slot.nature,
    })),
    planner: state.planner.map((slot) => ({
      pokemonNumber: slot.pokemonNumber,
      moves: [...slot.moves],
      abilityId: slot.abilityId,
      nature: slot.nature,
    })),
    preferences: {
      theme: state.theme,
      notesHidden: state.notesHidden,
    },
  };
}

function validateSaveDocument(input) {
  if (!input || input.format !== saveFormat || input.version !== saveVersion) {
    throw new Error("This is not a supported Dreamstone Field Guide save.");
  }
  if (!Array.isArray(input.caught) || !Array.isArray(input.team)) {
    throw new Error("The save is missing caught progress or team data.");
  }
  const caught = [...new Set(input.caught.map(String).filter((id) => validCaughtIds.has(id)))];
  const badges = [
    ...new Set((Array.isArray(input.badges) ? input.badges : []).map(String).filter((id) => validBadgeIds.has(id))),
  ];
  const team = Array.from({ length: 6 }, (_, slotIndex) => {
    const slot = input.team[slotIndex] || {};
    const pokemonNumber = pokemonByNumber.has(Number(slot.pokemonNumber))
      ? Number(slot.pokemonNumber)
      : null;
    const moves = Array.from({ length: 4 }, (__, moveIndex) => {
      const moveId = Number(slot.moves?.[moveIndex]);
      return moveById.has(moveId) ? moveId : null;
    });
    const abilityId = Number(slot.abilityId);
    const compatibleAbilities = abilitiesByPokemon.get(pokemonNumber) || [];
    const validAbility = compatibleAbilities.some((entry) => entry.ability.id === abilityId);
    return {
      pokemonNumber,
      moves,
      abilityId: validAbility ? abilityId : null,
      nature: validNature(slot.nature),
    };
  });
  const planner = Array.from({ length: 6 }, (_, slotIndex) => {
    const slot = Array.isArray(input.planner) ? input.planner[slotIndex] || {} : {};
    const pokemonNumber = pokemonByNumber.has(Number(slot.pokemonNumber))
      ? Number(slot.pokemonNumber)
      : null;
    const compatibleIds = compatibleMoveIdsByPokemon.get(pokemonNumber) || new Set();
    const moves = Array.from({ length: 4 }, (__, moveIndex) => {
      const moveId = Number(slot.moves?.[moveIndex]);
      return compatibleIds.has(moveId) ? moveId : null;
    });
    const abilityId = Number(slot.abilityId);
    const compatibleAbilities = abilitiesByPokemon.get(pokemonNumber) || [];
    const validAbility = compatibleAbilities.some((entry) => entry.ability.id === abilityId);
    return {
      pokemonNumber,
      moves,
      abilityId: validAbility ? abilityId : null,
      nature: validNature(slot.nature),
    };
  });
  return {
    format: saveFormat,
    version: saveVersion,
    exportedAt: typeof input.exportedAt === "string" ? input.exportedAt : null,
    caught,
    badges,
    team,
    planner,
    preferences: {
      theme: input.preferences?.theme === "dark" ? "dark" : "light",
      notesHidden: input.preferences?.notesHidden === true,
    },
  };
}

function applySaveDocument(input) {
  const save = validateSaveDocument(input);
  state.caught = new Set(save.caught);
  state.badges = new Set(save.badges);
  state.team = save.team;
  state.planner = save.planner;
  localStorage.setItem(storageKey, JSON.stringify([...state.caught]));
  localStorage.setItem(badgeStorageKey, JSON.stringify([...state.badges]));
  localStorage.setItem(teamStorageKey, JSON.stringify(state.team));
  localStorage.setItem(plannerStorageKey, JSON.stringify(state.planner));
  setNotesHidden(save.preferences.notesHidden);
  setTheme(save.preferences.theme);
  updateProgress();
  teamMatchupRevision += 1;
  renderDex();
  renderTeam();
  renderPlanner();
  renderTrainers();
  renderGyms();
  renderJourneyOverview();
  renderCollection();
  renderLocations(elements.locationSearch.value);
  return save;
}

function setSaveStatus(message, type = "") {
  elements.saveOperationStatus.textContent = message;
  elements.saveOperationStatus.dataset.status = type;
}

function exportSave() {
  const blob = new Blob([`${JSON.stringify(createSaveDocument(), null, 2)}\n`], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dreamstone-field-guide-save-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setSaveStatus("Save exported. Keep the file somewhere safe.", "success");
}

async function importSaveFile(file) {
  if (!file) return;
  try {
    const save = validateSaveDocument(JSON.parse(await file.text()));
    if (!window.confirm("Replace this device's current Dreamstone progress with the imported save?")) return;
    applySaveDocument(save);
    setSaveStatus("Save imported successfully.", "success");
  } catch (error) {
    setSaveStatus(error.message || "The selected save could not be imported.", "error");
  }
}

const bytesToBase64Url = (bytes) =>
  btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");

const base64UrlToBytes = (value) => {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
};

const bytesToHex = (bytes) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

function normalizedSyncCode() {
  const code = elements.syncCode.value.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(code)) {
    throw new Error("Enter a valid sync UUID, or create a new one.");
  }
  state.syncCode = code;
  localStorage.setItem(syncCodeKey, code);
  updateSyncControls();
  return code;
}

async function syncIdentity(code) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`dreamstone:${code}`)),
  );
  return {
    id: bytesToHex(digest),
    key: await crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]),
  };
}

async function encryptSave(save, code) {
  const { id, key } = await syncIdentity(code);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(save))),
  );
  return {
    id,
    envelope: {
      version: 1,
      iv: bytesToBase64Url(iv),
      ciphertext: bytesToBase64Url(ciphertext),
      updatedAt: new Date().toISOString(),
    },
  };
}

async function decryptSave(envelope, code) {
  if (envelope?.version !== 1 || !envelope.iv || !envelope.ciphertext) {
    throw new Error("The cloud save has an unsupported encrypted format.");
  }
  const { key } = await syncIdentity(code);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(envelope.iv) },
      key,
      base64UrlToBytes(envelope.ciphertext),
    );
    return validateSaveDocument(JSON.parse(new TextDecoder().decode(plaintext)));
  } catch {
    throw new Error("The sync UUID could not decrypt this cloud save.");
  }
}

function updateSyncControls() {
  const configured = Boolean(syncEndpoint);
  const hasCode = Boolean(state.syncCode);
  elements.syncCode.value = state.syncCode;
  document.querySelector("#upload-cloud-save").disabled = !configured;
  document.querySelector("#download-cloud-save").disabled = !configured;
  document.querySelector("#copy-sync-code").disabled = !hasCode;
  document.querySelector("#forget-sync-code").disabled = !hasCode;
  elements.syncServiceStatus.textContent = configured
    ? "Cloud sync service connected. Saves are encrypted before upload."
    : "Cloud sync is not connected yet. Export and import already work; complete the Cloudflare setup to enable it.";
  elements.syncServiceStatus.dataset.connected = String(configured);
}

async function cloudSave(method) {
  if (!syncEndpoint) throw new Error("Cloud sync is not connected yet.");
  const code = normalizedSyncCode();
  if (method === "PUT") {
    const { id, envelope } = await encryptSave(createSaveDocument(), code);
    const response = await fetch(`${syncEndpoint}/saves/${id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(envelope),
    });
    if (!response.ok) throw new Error("The encrypted save could not be uploaded.");
    return envelope;
  }
  const { id } = await syncIdentity(code);
  const response = await fetch(`${syncEndpoint}/saves/${id}`);
  if (response.status === 404) throw new Error("No cloud save exists for this UUID yet.");
  if (!response.ok) throw new Error("The encrypted cloud save could not be downloaded.");
  return decryptSave(await response.json(), code);
}

async function copySyncCode() {
  const code = normalizedSyncCode();
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    elements.syncCode.select();
    document.execCommand("copy");
  }
  setSaveStatus("Sync UUID copied. Keep it private.", "success");
}

function refreshTeamAndDex() {
  teamMatchupRevision += 1;
  renderTeam();
  refreshTrainerMatchups();
  renderGyms();
  renderJourneyOverview();
  elements.grid.querySelectorAll(".pokemon-card").forEach((card) => {
    const pokemon = pokemonByNumber.get(Number(card.dataset.number));
    if (pokemon) syncPokemonCardTeamMatchups(card, pokemon);
  });
}

function setTeamPokemon(slotIndex, pokemonNumber, retainMoves = false) {
  const slot = state.team[slotIndex];
  slot.pokemonNumber = pokemonByNumber.has(pokemonNumber) ? pokemonNumber : null;
  if (!retainMoves) slot.moves = [null, null, null, null];
  if (!retainMoves) slot.nature = null;
  slot.abilityId = null;
  persistTeam();
  refreshTeamAndDex();
}

function setTeamMove(slotIndex, moveIndex, moveId) {
  state.team[slotIndex].moves[moveIndex] = moveById.has(moveId) ? moveId : null;
  persistTeam();
  refreshTeamAndDex();
}

function setTeamAbility(slotIndex, abilityId) {
  const slot = state.team[slotIndex];
  const valid = (abilitiesByPokemon.get(slot.pokemonNumber) || []).some(
    (entry) => entry.ability.id === abilityId,
  );
  slot.abilityId = valid ? abilityId : null;
  persistTeam();
  renderTeam();
}

function setTeamNature(slotIndex, nature) {
  state.team[slotIndex].nature = validNature(nature);
  persistTeam();
  renderTeam();
}

function moveEffectiveness(moveType, targetTypes) {
  const matchups = typeChart[moveType.toLowerCase()] || {};
  return targetTypes.reduce((multiplier, type) => multiplier * (matchups[type] ?? 1), 1);
}

function superEffectiveTeamMoves(targetPokemon) {
  const results = [];
  const seen = new Set();
  state.team.forEach((slot) => {
    const teamPokemon = pokemonByNumber.get(slot.pokemonNumber);
    if (!teamPokemon) return;
    slot.moves.forEach((moveId) => {
      const move = moveById.get(moveId);
      const key = `${teamPokemon.number}:${moveId}`;
      if (!move || move.category === "Status" || seen.has(key)) return;
      const multiplier = moveEffectiveness(move.type, targetPokemon.types);
      if (multiplier <= 1) return;
      seen.add(key);
      results.push({ pokemon: teamPokemon, move, multiplier });
    });
  });
  return results.sort(
    (a, b) =>
      b.multiplier - a.multiplier ||
      b.move.power - a.move.power ||
      a.pokemon.name.localeCompare(b.pokemon.name) ||
      a.move.name.localeCompare(b.move.name),
  );
}

function renderTeamMatchups(container, targetPokemon) {
  const heading = document.createElement("header");
  heading.innerHTML = `
    <span>Weak to your team</span>
    <small>Type matchup only; abilities not considered</small>
  `;
  const matches = superEffectiveTeamMoves(targetPokemon);
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "team-matchups__empty";
    empty.textContent = state.team.some((slot) => slot.moves.some(Boolean))
      ? "No selected damage-dealing team moves are super effective."
      : "Add damage-dealing moves in Team Builder to see coverage.";
    container.append(heading, empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "team-matchups__list";
  matches.forEach(({ pokemon, move, multiplier }) => {
    const entry = document.createElement("article");
    entry.className = "team-matchup";
    entry.innerHTML = `
      <img src="${pokemon.sprite}" alt="" width="38" height="38" loading="lazy">
      <div class="team-matchup__identity">
        <strong></strong>
        <span></span>
      </div>
      <span class="type-badge" data-type="${move.type.toLowerCase()}">${move.type}</span>
      <dl>
        <div><dt>Effective</dt><dd>${multiplier}x</dd></div>
        <div><dt>Power</dt><dd>${move.power || "-"}</dd></div>
        <div><dt>Accuracy</dt><dd>${move.accuracy ? `${move.accuracy}%` : "-"}</dd></div>
      </dl>
    `;
    entry.querySelector(".team-matchup__identity strong").textContent = pokemon.name.replaceAll("_", " ");
    entry.querySelector(".team-matchup__identity span").textContent = move.name;
    list.append(entry);
  });
  container.append(heading, list);
}

function renderTrainerQuickLocations() {
  const fragment = document.createDocumentFragment();
  ["", ...trainerData.locations].forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-location";
    button.classList.toggle("is-active", state.trainerFilters.location === location);
    button.textContent = location || "All";
    button.addEventListener("click", () => {
      state.trainerFilters.location = location;
      renderTrainerQuickLocations();
      renderTrainers();
    });
    fragment.append(button);
  });
  elements.trainerQuickLocationList.replaceChildren(fragment);
  if (!state.trainerFilters.location) {
    elements.trainerQuickLocationList.scrollLeft = 0;
  } else {
    elements.trainerQuickLocationList.querySelector(".is-active")?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }
}

function trainerSearchText(trainer) {
  return [
    trainer.name,
    trainer.trainerClass,
    trainer.location,
    ...trainer.party.flatMap((member) => [member.name, member.heldItem, ...member.moves]),
  ]
    .join(" ")
    .toLowerCase();
}

function filteredTrainers() {
  const search = state.trainerFilters.search.trim().toLowerCase();
  return trainerData.trainers.filter(
    (trainer) =>
      (!state.trainerFilters.location || trainer.location === state.trainerFilters.location) &&
      (!search || trainerSearchText(trainer).includes(search)),
  );
}

function renderTrainerPartyMember(member) {
  const card = document.createElement("article");
  card.className = "trainer-party-member";
  card.dataset.speciesId = member.speciesId;
  const identity = document.createElement(member.guideNumber ? "button" : "div");
  identity.className = "trainer-party-member__identity";
  if (member.guideNumber) {
    identity.type = "button";
    identity.title = `Open ${member.name} in the Full Dex`;
    identity.addEventListener("click", () => focusPokemon(member.guideNumber));
  }
  identity.innerHTML = `
    <img src="${member.sprite}" alt="" width="64" height="64" loading="lazy">
    <span>
      <small>Lv. ${member.level}</small>
      <strong></strong>
      <span class="trainer-party-member__types"></span>
    </span>
  `;
  identity.querySelector("strong").textContent = member.name;
  renderTypeBadges(identity.querySelector(".trainer-party-member__types"), member.types);
  card.append(identity);
  if (member.heldItem) {
    const heldItem = document.createElement("p");
    heldItem.className = "trainer-party-member__item";
    heldItem.innerHTML = "<span>Held item</span>";
    heldItem.append(document.createTextNode(member.heldItem));
    card.append(heldItem);
  }
  if (member.moves.length) {
    const details = document.createElement("details");
    details.className = "trainer-party-moves";
    const summary = document.createElement("summary");
    summary.textContent = `${member.moves.length} moves`;
    const list = document.createElement("ul");
    member.moves.forEach((move) => {
      const item = document.createElement("li");
      item.textContent = move;
      list.append(item);
    });
    details.append(summary, list);
    card.append(details);
  }
  const matchups = document.createElement("section");
  matchups.className = "team-matchups trainer-party-matchups";
  renderTeamMatchups(matchups, member);
  card.append(matchups);
  return card;
}

function refreshTrainerMatchups() {
  elements.trainerLocationList.querySelectorAll(".trainer-party-member").forEach((card) => {
    const member = trainerPokemonBySpeciesId.get(Number(card.dataset.speciesId));
    const container = card.querySelector(".trainer-party-matchups");
    if (!member || !container) return;
    container.replaceChildren();
    renderTeamMatchups(container, member);
  });
}

function renderTrainerCard(trainer) {
  const card = document.createElement("article");
  card.className = "trainer-card";
  card.innerHTML = `
    <header class="trainer-card__header">
      <span class="trainer-card__portrait">
        <img src="${trainer.sprite}" alt="" width="88" height="88" loading="lazy">
      </span>
      <span class="trainer-card__identity">
        <small></small>
        <strong></strong>
        <span></span>
      </span>
      <span class="trainer-card__party-size">${trainer.party.length} Pokémon</span>
    </header>
    <div class="trainer-party"></div>
  `;
  const classLabel = card.querySelector(".trainer-card__identity small");
  classLabel.textContent = trainer.trainerClass;
  classLabel.hidden = !trainer.trainerClass;
  card.querySelector(".trainer-card__identity strong").textContent = trainer.name;
  card.querySelector(".trainer-card__identity span").textContent =
    trainer.variantCount > 1
      ? `Battle variant ${trainer.variantIndex} of ${trainer.variantCount}`
      : trainer.location;
  const party = card.querySelector(".trainer-party");
  trainer.party.forEach((member) => party.append(renderTrainerPartyMember(member)));
  return card;
}

function renderTrainers() {
  if (!elements.trainerLocationList) return;
  const trainers = filteredTrainers();
  const activeFilter = Boolean(state.trainerFilters.search.trim() || state.trainerFilters.location);
  const fragment = document.createDocumentFragment();
  trainerData.locations.forEach((location) => {
    const locationTrainers = trainers.filter((trainer) => trainer.location === location);
    if (!locationTrainers.length) return;
    const group = document.createElement("details");
    group.className = "trainer-location-group";
    group.dataset.location = location;
    group.open = activeFilter;
    const summary = document.createElement("summary");
    summary.innerHTML = `<span><strong></strong><small></small></span><b>${locationTrainers.length} trainers</b>`;
    summary.querySelector("strong").textContent = location;
    summary.querySelector("small").textContent =
      `${locationTrainers.reduce((total, trainer) => total + trainer.party.length, 0)} party Pokémon`;
    const grid = document.createElement("div");
    grid.className = "trainer-grid";
    const populate = () => {
      if (grid.childElementCount) return;
      const cards = document.createDocumentFragment();
      locationTrainers.forEach((trainer) => cards.append(renderTrainerCard(trainer)));
      grid.append(cards);
    };
    group._populate = populate;
    group._clear = () => grid.replaceChildren();
    group.addEventListener("toggle", () => {
      if (group.open) populate();
      else group._clear();
    });
    if (group.open) populate();
    group.append(summary, grid);
    fragment.append(group);
  });
  elements.trainerLocationList.replaceChildren(fragment);
  elements.trainerEmptyState.hidden = trainers.length !== 0;
  elements.trainerResultCount.textContent =
    trainers.length === trainerData.trainers.length
      ? `Showing all ${trainerData.trainers.length} trainers`
      : `Showing ${trainers.length} matching trainers`;
  updateSearchClearButtons();
}

function renderGymPokemonCard(member) {
  const pokemon = pokemonByNumber.get(member.number);
  if (!pokemon) return document.createElement("article");
  const targetPokemon = {
    ...pokemon,
    name: member.displayName || pokemon.name,
    sprite: member.sprite || pokemon.sprite,
    types: member.types || pokemon.types,
  };
  const card = document.createElement("article");
  card.className = "gym-pokemon-card";
  card.dataset.number = pokemon.number;
  card.innerHTML = `
    <button class="gym-pokemon-card__identity" type="button">
      <span class="gym-pokemon-card__sprite">
        <img src="${targetPokemon.sprite}" alt="" width="78" height="78" loading="lazy">
      </span>
      <span class="gym-pokemon-card__copy">
        <small>Lv. ${member.level}</small>
        <strong></strong>
        <span class="gym-pokemon-card__types"></span>
        <span class="gym-pokemon-card__bst">BST ${pokemon.bst || "N/A"}</span>
      </span>
    </button>
    <section class="team-matchups"></section>
  `;
  card.querySelector(".gym-pokemon-card__copy strong").textContent = targetPokemon.name.replaceAll("_", " ");
  renderTypeBadges(card.querySelector(".gym-pokemon-card__types"), targetPokemon.types);
  card.querySelector(".gym-pokemon-card__identity").addEventListener("click", () => focusPokemon(pokemon.number));
  renderTeamMatchups(card.querySelector(".team-matchups"), targetPokemon);
  return card;
}

function renderGyms() {
  if (!elements.gymLeaderList) return;
  elements.gymBadgeCount.textContent = state.badges.size;
  const fragment = document.createDocumentFragment();
  gymLeaders.forEach((leader) => {
    const card = document.createElement("article");
    card.className = "gym-leader-card";
    card.classList.toggle("is-obtained", state.badges.has(leader.id));
    card.innerHTML = `
      <header class="gym-leader-card__header">
        <span class="gym-leader-card__portrait">
          <img src="${leader.sprite}" alt="${leader.name}" width="96" height="96" loading="lazy">
        </span>
        <span class="gym-leader-card__identity">
          <small>Gym ${leader.order}</small>
          <strong>${leader.name}</strong>
          <span>${leader.location}</span>
        </span>
        <span class="gym-leader-card__specialty">
          <small>Speciality</small>
          <strong>${leader.type}</strong>
        </span>
        <span class="gym-badge-slot"></span>
      </header>
      <div class="gym-team"></div>
    `;
    card.querySelector(".gym-badge-slot").append(createBadgeButton(leader));
    const team = card.querySelector(".gym-team");
    leader.team.forEach((member) => team.append(renderGymPokemonCard(member)));
    fragment.append(card);
  });
  elements.gymLeaderList.replaceChildren(fragment);
}

function createPokemonPicker(
  slotIndex,
  selectedNumber,
  { scope = "team", onSelect = setTeamPokemon, labelText = "Pokemon" } = {},
) {
  const picker = document.createElement("div");
  picker.className = "team-pokemon-picker";
  const label = document.createElement("label");
  label.htmlFor = `${scope}-pokemon-search-${slotIndex}`;
  label.textContent = labelText;
  const inputWrap = document.createElement("div");
  inputWrap.className = "team-pokemon-search";
  const input = document.createElement("input");
  const resultId = `${scope}-pokemon-results-${slotIndex}`;
  const selected = pokemonByNumber.get(selectedNumber);
  input.id = `${scope}-pokemon-search-${slotIndex}`;
  input.type = "search";
  input.placeholder = "Search by name, number, form, or type...";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", resultId);
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-label", `Search Pokemon for ${scope} slot ${slotIndex + 1}`);
  input.value = selected
    ? `No. ${String(selected.number).padStart(3, "0")} - ${selected.name.replaceAll("_", " ")}`
    : "";
  const results = document.createElement("div");
  results.id = resultId;
  results.className = "team-pokemon-results";
  results.setAttribute("role", "listbox");
  results.hidden = true;
  let activeIndex = -1;

  const matchingPokemon = () => {
    const query = input.value.trim().toLowerCase();
    const selectedLabel = selected
      ? `no. ${String(selected.number).padStart(3, "0")} - ${selected.name.replaceAll("_", " ")}`.toLowerCase()
      : "";
    if (!query || query === selectedLabel) return pokemonOptions.slice(0, 30);
    return pokemonOptions
      .filter((pokemon) =>
        [
          pokemon.name,
          pokemon.number,
          String(pokemon.number).padStart(3, "0"),
          pokemon.region,
          pokemon.types.join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 30);
  };

  const updateActiveResult = () => {
    const options = [...results.querySelectorAll("[role='option']")];
    options.forEach((option, index) => option.classList.toggle("is-active", index === activeIndex));
    const active = options[activeIndex];
    if (active) {
      input.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  };

  const renderResults = () => {
    const matches = matchingPokemon();
    const fragment = document.createDocumentFragment();
    matches.forEach((pokemon) => {
      const option = document.createElement("button");
      option.type = "button";
      option.id = `${scope}-pokemon-option-${slotIndex}-${pokemon.number}`;
      option.className = "team-pokemon-result";
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(pokemon.number === selectedNumber));
      option.innerHTML = `
        <img src="${pokemon.sprite}" alt="" width="42" height="42" loading="lazy">
        <span>
          <small>No. ${String(pokemon.number).padStart(3, "0")}${pokemon.region ? ` · ${pokemon.region}` : ""}</small>
          <strong></strong>
          <span>${pokemon.types.join(" / ")}</span>
        </span>
      `;
      option.querySelector("strong").textContent = pokemon.name.replaceAll("_", " ");
      option.addEventListener("click", () => onSelect(slotIndex, pokemon.number));
      fragment.append(option);
    });
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.className = "team-pokemon-results__empty";
      empty.textContent = "No Pokemon found.";
      fragment.append(empty);
    }
    results.replaceChildren(fragment);
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
    activeIndex = -1;
    updateActiveResult();
  };

  input.addEventListener("focus", () => {
    input.select();
    renderResults();
  });
  input.addEventListener("input", renderResults);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (results.hidden) renderResults();
      const options = [...results.querySelectorAll("[role='option']")];
      const direction = event.key === "ArrowDown" ? 1 : -1;
      activeIndex = Math.max(0, Math.min(options.length - 1, activeIndex + direction));
      updateActiveResult();
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      results.querySelectorAll("[role='option']")[activeIndex]?.click();
    } else if (event.key === "Escape") {
      results.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }
  });
  picker.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (picker.contains(document.activeElement)) return;
      results.hidden = true;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }, 0);
  });

  inputWrap.append(input, results);
  picker.append(label, inputWrap);
  return picker;
}

function createTeamMoveDetails(move, retained) {
  const details = document.createElement("div");
  details.className = "team-move-details";
  if (retained) details.classList.add("is-retained");

  const heading = document.createElement("div");
  heading.className = "team-move-details__heading";
  const name = document.createElement("strong");
  name.className = "team-move-name";
  name.textContent = move.name;
  const type = document.createElement("span");
  type.className = "type-badge";
  type.dataset.type = move.type.toLowerCase();
  type.textContent = move.type;
  const category = document.createElement("span");
  category.className = "move-category";
  category.dataset.category = move.category.toLowerCase();
  category.textContent = move.category;
  heading.append(name, type, category);
  if (retained) {
    const retainedBadge = document.createElement("span");
    retainedBadge.className = "team-move-retained";
    retainedBadge.textContent = "Retained after change";
    heading.append(retainedBadge);
  }

  const metrics = document.createElement("dl");
  metrics.className = "team-move-details__metrics";
  [
    ["Power", move.power || "-"],
    ["Accuracy", move.accuracy ? `${move.accuracy}%` : "-"],
  ].forEach(([label, value]) => {
    const fact = document.createElement("div");
    fact.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
    metrics.append(fact);
  });

  const description = document.createElement("p");
  description.textContent = move.description || "No description extracted.";
  details.append(heading, metrics, description);
  if (move.effect) {
    const effect = document.createElement("p");
    effect.className = "team-move-details__effect";
    const label = document.createElement("strong");
    label.textContent = "Effect";
    effect.append(label, document.createTextNode(move.effect));
    details.append(effect);
  }
  return details;
}

function createTeamMoveSlot(slotIndex, moveIndex, pokemonNumber, selectedMoveId) {
  const wrapper = document.createElement("section");
  wrapper.className = "team-move-slot";
  const label = document.createElement("label");
  label.textContent = `Move ${moveIndex + 1}`;
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Choose move ${moveIndex + 1} for team slot ${slotIndex + 1}`);
  select.add(new Option("Choose a move...", ""));

  const compatibleIds = compatibleMoveIdsByPokemon.get(pokemonNumber) || new Set();
  const compatibleMoves = [...compatibleIds]
    .map((id) => moveById.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  const retained = selectedMoveId && !compatibleIds.has(selectedMoveId);
  if (retained) {
    const selectedMove = moveById.get(selectedMoveId);
    if (selectedMove) select.add(new Option(`${selectedMove.name} (retained)`, selectedMove.id));
  }
  compatibleMoves.forEach((move) => select.add(new Option(move.name, move.id)));
  select.value = selectedMoveId || "";
  select.addEventListener("change", () => setTeamMove(slotIndex, moveIndex, Number(select.value)));
  label.append(select);
  wrapper.append(label);

  const selectedMove = moveById.get(selectedMoveId);
  if (selectedMove) wrapper.append(createTeamMoveDetails(selectedMove, retained));
  return wrapper;
}

function createAbilitySelector(
  slotIndex,
  pokemonNumber,
  selectedAbilityId,
  { scope = "team", labelText = "Ability", onChange = setTeamAbility } = {},
) {
  const section = document.createElement("section");
  section.className = "team-card__ability";
  const label = document.createElement("label");
  const text = document.createElement("span");
  text.textContent = labelText;
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Choose ${labelText.toLowerCase()} for ${scope} slot ${slotIndex + 1}`);
  select.add(new Option(`Choose ${labelText.toLowerCase()}...`, ""));
  const choices = abilitiesByPokemon.get(pokemonNumber) || [];
  choices.forEach(({ ability, hidden }) => {
    select.add(new Option(`${ability.name}${hidden ? " (Hidden Ability)" : ""}`, ability.id));
  });
  const selected = choices.find(({ ability }) => ability.id === selectedAbilityId);
  select.value = selected?.ability.id || "";
  select.addEventListener("change", () => onChange(slotIndex, Number(select.value)));
  label.append(text, select);
  section.append(label);

  if (selected) {
    const details = document.createElement("div");
    details.className = "team-ability-details";
    const heading = document.createElement("div");
    heading.className = "team-ability-details__heading";
    const name = document.createElement("strong");
    name.textContent = selected.ability.name;
    heading.append(name);
    if (selected.hidden) {
      const badge = document.createElement("span");
      badge.textContent = "Hidden Ability";
      heading.append(badge);
    }
    const description = document.createElement("p");
    description.textContent = selected.ability.description || "No description extracted.";
    details.append(heading, description);
    section.append(details);
  }
  return section;
}

function natureOptionLabel(nature) {
  return nature.increased
    ? `${nature.name} - ${natureStatLabels[nature.increased]} + / ${natureStatLabels[nature.decreased]} -`
    : `${nature.name} - Neutral`;
}

function createNatureSelector(
  slotIndex,
  selectedNature,
  { scope = "team", labelText = "Nature", onChange = setTeamNature } = {},
) {
  const section = document.createElement("section");
  section.className = "team-card__nature";
  const label = document.createElement("label");
  const text = document.createElement("span");
  text.textContent = labelText;
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Choose ${labelText.toLowerCase()} for ${scope} slot ${slotIndex + 1}`);
  select.add(new Option(`Choose ${labelText.toLowerCase()}...`, ""));
  natures.forEach((nature) => select.add(new Option(natureOptionLabel(nature), nature.id)));
  const nature = natureById.get(selectedNature);
  select.value = nature?.id || "";
  select.addEventListener("change", () => onChange(slotIndex, select.value));
  label.append(text, select);
  section.append(label);

  if (nature) {
    const details = document.createElement("div");
    details.className = "team-nature-details";
    const name = document.createElement("strong");
    name.textContent = nature.name;
    const effect = document.createElement("span");
    effect.textContent = nature.increased
      ? `${natureStatLabels[nature.increased]} +10% · ${natureStatLabels[nature.decreased]} -10%`
      : "No stat is increased or decreased";
    const note = document.createElement("small");
    note.textContent = "Nature affects calculated battle stats, not the base stats shown.";
    details.append(name, effect, note);
    section.append(details);
  }
  return section;
}

function renderTeamCard(slot, slotIndex) {
  const card = document.createElement("article");
  card.className = "team-card";
  card.dataset.slot = slotIndex + 1;

  const top = document.createElement("header");
  top.className = "team-card__top";
  const slotLabel = document.createElement("strong");
  slotLabel.textContent = `Team slot ${slotIndex + 1}`;
  top.append(slotLabel);
  if (slot.pokemonNumber) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "team-card__clear";
    clear.textContent = "Remove";
    clear.addEventListener("click", () => setTeamPokemon(slotIndex, null));
    top.append(clear);
  }
  card.append(top, createPokemonPicker(slotIndex, slot.pokemonNumber));

  const pokemon = pokemonByNumber.get(slot.pokemonNumber);
  if (!pokemon) {
    const empty = document.createElement("div");
    empty.className = "team-card__empty";
    empty.innerHTML = `
      <span class="empty-state__stone" aria-hidden="true"></span>
      <strong>Choose your next team member</strong>
      <p>Pokemon details, nature, abilities, compatible moves, and evolution choices will appear here.</p>
    `;
    card.append(empty);
    return card;
  }

  const identity = document.createElement("div");
  identity.className = "team-card__identity";
  identity.innerHTML = `
    <div class="team-sprite-well">
      <img src="${pokemon.sprite}" alt="" width="96" height="96" loading="lazy">
    </div>
    <div>
      <span>No. ${String(pokemon.number).padStart(3, "0")}</span>
      <h3></h3>
      <div class="team-pokemon-types"></div>
      <strong class="team-card__bst">BST ${pokemon.bst}</strong>
    </div>
  `;
  identity.querySelector("h3").textContent = pokemon.name.replaceAll("_", " ");
  renderTypeBadges(identity.querySelector(".team-pokemon-types"), pokemon.types);
  const stats = document.createElement("section");
  stats.className = "pokemon-stats team-card__stats";
  stats.setAttribute("aria-label", `${pokemon.name} base stats`);
  const profile = document.createElement("div");
  profile.className = "team-card__profile";
  profile.append(identity, stats);
  card.append(profile);
  renderPokemonStats(card, pokemon, slot.nature);
  const preferences = document.createElement("div");
  preferences.className = "team-card__preferences";
  preferences.append(
    createNatureSelector(slotIndex, slot.nature),
    createAbilitySelector(slotIndex, pokemon.number, slot.abilityId),
  );
  card.append(preferences);

  const moves = document.createElement("div");
  moves.className = "team-card__moves";
  slot.moves.forEach((moveId, moveIndex) => {
    moves.append(createTeamMoveSlot(slotIndex, moveIndex, pokemon.number, moveId));
  });
  card.append(moves);

  if (pokemon.evolvesTo.length) {
    const evolution = document.createElement("div");
    evolution.className = "team-card__evolutions";
    const label = document.createElement("span");
    label.textContent = "Evolve this team member";
    evolution.append(label);
    pokemon.evolvesTo.forEach((number) => {
      const evolved = pokemonByNumber.get(number);
      if (!evolved) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "team-evolve-button";
      button.innerHTML = `<img src="${evolved.sprite}" alt="" width="44" height="44"><span></span>`;
      button.querySelector("span").textContent = `Evolve to ${evolved.name.replaceAll("_", " ")}`;
      button.addEventListener("click", () => setTeamPokemon(slotIndex, number, true));
      evolution.append(button);
    });
    card.append(evolution);
  }
  return card;
}

function selectedOffensiveMoves(slots) {
  return slots.flatMap((slot) =>
    slot.moves
      .map((moveId) => moveById.get(moveId))
      .filter((move) => move && move.category !== "Status"),
  );
}

function renderOffensiveCoverage(container, slots) {
  if (!container) return;
  const moves = selectedOffensiveMoves(slots);
  const moveTypeCounts = new Map();
  moves.forEach((move) => {
    const type = move.type.toLowerCase();
    moveTypeCounts.set(type, (moveTypeCounts.get(type) || 0) + 1);
  });

  const heading = document.createElement("header");
  const moveTypeLabel = moveTypeCounts.size === 1 ? "move type" : "move types";
  const damagingMoveLabel = moves.length === 1 ? "damaging move" : "damaging moves";
  heading.innerHTML = `
    <div>
      <span>Offensive type coverage</span>
      <strong>${moveTypeCounts.size} ${moveTypeLabel} · ${moves.length} ${damagingMoveLabel}</strong>
    </div>
    <small>Based on selected moves; abilities are not considered</small>
  `;

  if (!moves.length) {
    const empty = document.createElement("p");
    empty.className = "offensive-coverage__empty";
    empty.textContent = "Choose damage-dealing moves to see your offensive type coverage.";
    container.replaceChildren(heading, empty);
    return;
  }

  const selected = document.createElement("section");
  selected.className = "offensive-coverage__group";
  const selectedLabel = document.createElement("strong");
  selectedLabel.textContent = "Offensive move types";
  const selectedTypes = document.createElement("div");
  selectedTypes.className = "offensive-coverage__types";
  battleTypes
    .filter((type) => moveTypeCounts.has(type))
    .forEach((type) => {
      const badge = document.createElement("span");
      badge.className = "type-badge coverage-type coverage-type--selected";
      badge.dataset.type = type;
      badge.innerHTML = `<span>${titleCase(type)}</span><b>×${moveTypeCounts.get(type)}</b>`;
      selectedTypes.append(badge);
    });
  selected.append(selectedLabel, selectedTypes);

  const effective = document.createElement("section");
  effective.className = "offensive-coverage__group";
  const effectiveLabel = document.createElement("strong");
  const coveredTypes = battleTypes.filter((targetType) =>
    [...moveTypeCounts.keys()].some((moveType) => moveEffectiveness(moveType, [targetType]) > 1),
  );
  effectiveLabel.textContent = `Super-effective against ${coveredTypes.length} / ${battleTypes.length}`;
  const targetTypes = document.createElement("div");
  targetTypes.className = "offensive-coverage__types offensive-coverage__targets";
  battleTypes.forEach((targetType) => {
    const coveringTypes = [...moveTypeCounts.keys()].filter(
      (moveType) => moveEffectiveness(moveType, [targetType]) > 1,
    );
    const badge = document.createElement("span");
    badge.className = "coverage-type";
    badge.classList.toggle("is-covered", coveringTypes.length > 0);
    if (coveringTypes.length) badge.classList.add("type-badge");
    badge.dataset.type = targetType;
    badge.textContent = titleCase(targetType);
    badge.title = coveringTypes.length
      ? `Covered by ${coveringTypes.map(titleCase).join(", ")}`
      : `No selected move is super effective against ${titleCase(targetType)}`;
    targetTypes.append(badge);
  });
  effective.append(effectiveLabel, targetTypes);
  container.replaceChildren(heading, selected, effective);
}

function renderTeam() {
  const fragment = document.createDocumentFragment();
  state.team.forEach((slot, index) => fragment.append(renderTeamCard(slot, index)));
  elements.teamGrid.replaceChildren(fragment);
  renderOffensiveCoverage(elements.teamOffensiveCoverage, state.team);
}

function setPlannerPokemon(slotIndex, pokemonNumber, retainPreferences = false) {
  const slot = state.planner[slotIndex];
  slot.pokemonNumber = pokemonByNumber.has(pokemonNumber) ? pokemonNumber : null;
  slot.moves = [null, null, null, null];
  slot.abilityId = null;
  if (!retainPreferences) slot.nature = null;
  persistPlanner();
  renderPlanner();
}

function setPlannerMove(slotIndex, moveIndex, moveId) {
  const slot = state.planner[slotIndex];
  const compatible = compatibleMoveIdsByPokemon.get(slot.pokemonNumber) || new Set();
  slot.moves[moveIndex] = compatible.has(moveId) ? moveId : null;
  persistPlanner();
  renderPlanner();
}

function setPlannerAbility(slotIndex, abilityId) {
  const slot = state.planner[slotIndex];
  const valid = (abilitiesByPokemon.get(slot.pokemonNumber) || []).some(
    (entry) => entry.ability.id === abilityId,
  );
  slot.abilityId = valid ? abilityId : null;
  persistPlanner();
  renderPlanner();
}

function setPlannerNature(slotIndex, nature) {
  state.planner[slotIndex].nature = validNature(nature);
  persistPlanner();
  renderPlanner();
}

function createMoveLearningSummary(pokemonNumber, moveId) {
  const summary = document.createElement("div");
  summary.className = "planner-move-methods";
  const label = document.createElement("strong");
  label.textContent = "How to learn";
  const methods = document.createElement("div");
  moveLearningLabels(pokemonNumber, moveId).forEach((method) => {
    const chip = document.createElement("span");
    chip.textContent = method;
    methods.append(chip);
  });
  summary.append(label, methods);
  return summary;
}

function createPlannerMoveSlot(slotIndex, moveIndex, pokemonNumber, selectedMoveId) {
  const wrapper = document.createElement("section");
  wrapper.className = "team-move-slot planner-move-slot";
  const label = document.createElement("label");
  label.textContent = `Planned move ${moveIndex + 1}`;
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Choose planned move ${moveIndex + 1} for shortlist slot ${slotIndex + 1}`);
  select.add(new Option("Choose a move...", ""));
  const compatibleMoves = [...(compatibleMoveIdsByPokemon.get(pokemonNumber) || [])]
    .map((id) => moveById.get(id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  compatibleMoves.forEach((move) => {
    const method = moveLearningLabels(pokemonNumber, move.id, true).join(" · ");
    select.add(new Option(`${move.name}${method ? ` — ${method}` : ""}`, move.id));
  });
  select.value = selectedMoveId || "";
  select.addEventListener("change", () => setPlannerMove(slotIndex, moveIndex, Number(select.value)));
  label.append(select);
  wrapper.append(label);

  const selectedMove = moveById.get(selectedMoveId);
  if (selectedMove) {
    wrapper.append(createMoveLearningSummary(pokemonNumber, selectedMove.id));
    wrapper.append(createTeamMoveDetails(selectedMove, false));
  }
  return wrapper;
}

function evolutionRoutesForPokemon(pokemonNumber) {
  const family = new Set([pokemonNumber]);
  const queue = [pokemonNumber];
  while (queue.length) {
    const current = queue.shift();
    const relatives = [
      ...(evolutionIncomingByNumber.get(current) || []).map((edge) => edge.fromGuideNumber),
      ...(evolutionOutgoingByNumber.get(current) || []).map((edge) => edge.toGuideNumber),
    ];
    relatives.forEach((relative) => {
      if (family.has(relative)) return;
      family.add(relative);
      queue.push(relative);
    });
  }
  if (family.size === 1) return [];

  const roots = [...family].filter(
    (number) =>
      !(evolutionIncomingByNumber.get(number) || []).some((edge) =>
        family.has(edge.fromGuideNumber),
      ),
  );
  const routes = [];
  const walk = (number, route, visited) => {
    const outgoing = groupEvolutionEdges(
      (evolutionOutgoingByNumber.get(number) || []).filter((edge) =>
        family.has(edge.toGuideNumber),
      ),
      "toGuideNumber",
    );
    if (!outgoing.length) {
      routes.push(route);
      return;
    }
    outgoing.forEach(({ number: nextNumber, methods }) => {
      if (visited.has(nextNumber)) {
        routes.push(route);
        return;
      }
      walk(
        nextNumber,
        [...route, { number: nextNumber, method: [...methods].join(" / ") }],
        new Set([...visited, nextNumber]),
      );
    });
  };
  (roots.length ? roots : [pokemonNumber]).forEach((root) =>
    walk(root, [{ number: root, method: "" }], new Set([root])),
  );
  return [
    ...new Map(
      routes
        .filter((route) => route.some((stage) => stage.number === pokemonNumber))
        .map((route) => [route.map((stage) => `${stage.number}:${stage.method}`).join(">"), route]),
    ).values(),
  ];
}

function createPlannerEvolutionPath(pokemon, slotIndex) {
  const routes = evolutionRoutesForPokemon(pokemon.number);
  if (!routes.length) return null;

  const section = document.createElement("section");
  section.className = "planner-evolution-path";
  const heading = document.createElement("strong");
  heading.textContent = "Evolution path";
  const routeList = document.createElement("div");
  routeList.className = "planner-evolution-routes";
  routes.forEach((route) => {
    const routeRow = document.createElement("div");
    routeRow.className = "planner-evolution-route";
    route.forEach((stage, index) => {
      if (index > 0) {
        const method = document.createElement("span");
        method.className = "planner-evolution-method";
        method.textContent = stage.method;
        routeRow.append(method);
      }
      const stagePokemon = pokemonByNumber.get(stage.number);
      if (!stagePokemon) return;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "planner-evolution-node";
      button.classList.toggle("is-current", stage.number === pokemon.number);
      button.setAttribute(
        "aria-label",
        stage.number === pokemon.number
          ? `${stagePokemon.name}, current planned Pokemon`
          : `Plan for ${stagePokemon.name}`,
      );
      button.innerHTML = `
        <img src="${stagePokemon.sprite}" alt="" width="42" height="42" loading="lazy">
        <span>${stagePokemon.name.replaceAll("_", " ")}</span>
      `;
      if (stage.number !== pokemon.number) {
        button.addEventListener("click", () => setPlannerPokemon(slotIndex, stage.number, true));
      }
      routeRow.append(button);
    });
    routeList.append(routeRow);
  });
  section.append(heading, routeList);
  return section;
}

function renderPlannerCard(slot, slotIndex) {
  const card = document.createElement("article");
  card.className = "planner-card";
  card.dataset.slot = slotIndex + 1;

  const top = document.createElement("header");
  top.className = "team-card__top";
  const slotLabel = document.createElement("strong");
  slotLabel.textContent = `Shortlist slot ${slotIndex + 1}`;
  top.append(slotLabel);
  if (slot.pokemonNumber) {
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "team-card__clear";
    clear.textContent = "Remove";
    clear.addEventListener("click", () => setPlannerPokemon(slotIndex, null));
    top.append(clear);
  }
  card.append(
    top,
    createPokemonPicker(slotIndex, slot.pokemonNumber, {
      scope: "planner",
      onSelect: setPlannerPokemon,
      labelText: "Target Pokemon",
    }),
  );

  const pokemon = pokemonByNumber.get(slot.pokemonNumber);
  if (!pokemon) {
    const empty = document.createElement("div");
    empty.className = "planner-card__empty";
    empty.innerHTML = `
      <span class="empty-state__stone" aria-hidden="true"></span>
      <strong>Choose a future team member</strong>
      <p>Preferred nature, base stats, evolution path, and learn methods for planned moves will appear here.</p>
    `;
    card.append(empty);
    return card;
  }

  const identity = document.createElement("div");
  identity.className = "team-card__identity";
  identity.innerHTML = `
    <div class="team-sprite-well">
      <img src="${pokemon.sprite}" alt="" width="96" height="96" loading="lazy">
    </div>
    <div>
      <span>No. ${String(pokemon.number).padStart(3, "0")}</span>
      <h3></h3>
      <div class="team-pokemon-types"></div>
      <strong class="team-card__bst">BST ${pokemon.bst}</strong>
    </div>
  `;
  identity.querySelector("h3").textContent = pokemon.name.replaceAll("_", " ");
  renderTypeBadges(identity.querySelector(".team-pokemon-types"), pokemon.types);
  const stats = document.createElement("section");
  stats.className = "pokemon-stats team-card__stats";
  stats.setAttribute("aria-label", `${pokemon.name} base stats`);
  const profile = document.createElement("div");
  profile.className = "team-card__profile";
  profile.append(identity, stats);
  card.append(profile);
  renderPokemonStats(card, pokemon, slot.nature);

  const preferences = document.createElement("div");
  preferences.className = "team-card__preferences";
  preferences.append(
    createNatureSelector(slotIndex, slot.nature, {
      scope: "planner",
      labelText: "Preferred nature",
      onChange: setPlannerNature,
    }),
    createAbilitySelector(slotIndex, pokemon.number, slot.abilityId, {
      scope: "planner",
      labelText: "Preferred ability",
      onChange: setPlannerAbility,
    }),
  );
  card.append(preferences);

  const moves = document.createElement("div");
  moves.className = "team-card__moves planner-card__moves";
  slot.moves.forEach((moveId, moveIndex) => {
    moves.append(createPlannerMoveSlot(slotIndex, moveIndex, pokemon.number, moveId));
  });
  card.append(moves);
  const evolutionPath = createPlannerEvolutionPath(pokemon, slotIndex);
  if (evolutionPath) card.append(evolutionPath);
  return card;
}

function renderPlanner() {
  if (!elements.plannerGrid) return;
  const fragment = document.createDocumentFragment();
  state.planner.forEach((slot, index) => fragment.append(renderPlannerCard(slot, index)));
  elements.plannerGrid.replaceChildren(fragment);
  renderOffensiveCoverage(elements.plannerOffensiveCoverage, state.planner);
}

function openPokemonLearnset(pokemon) {
  const moves = levelUpMovesForPokemon(pokemon.number);
  elements.learnsetDialogSprite.src = pokemon.sprite;
  elements.learnsetDialogSprite.alt = `${pokemon.name.replaceAll("_", " ")} sprite`;
  elements.learnsetDialogNumber.textContent = `No. ${String(pokemon.number).padStart(3, "0")}`;
  elements.learnsetDialogTitle.textContent = `${pokemon.name.replaceAll("_", " ")} learnset`;
  renderTypeBadges(elements.learnsetDialogTypes, pokemon.types);

  const fragment = document.createDocumentFragment();
  moves.forEach((learning) => {
    const row = document.createElement("article");
    row.className = "learnset-entry";
    const levels = [...learning.levelUp].sort((a, b) => a - b);
    row.innerHTML = `
      <strong class="learnset-entry__level">Lv. ${levels.join(" / ")}</strong>
      <div class="learnset-entry__move">
        <header>
          <strong></strong>
          <span class="type-badge" data-type="${learning.move.type.toLowerCase()}">${learning.move.type}</span>
          <span class="move-category" data-category="${learning.move.category.toLowerCase()}">${learning.move.category}</span>
        </header>
        <p></p>
      </div>
      <dl>
        <div><dt>Power</dt><dd>${learning.move.power || "—"}</dd></div>
        <div><dt>Accuracy</dt><dd>${learning.move.accuracy ? `${learning.move.accuracy}%` : "—"}</dd></div>
      </dl>
    `;
    row.querySelector(".learnset-entry__move header > strong").textContent = learning.move.name;
    row.querySelector(".learnset-entry__move p").textContent =
      learning.move.description || "No description extracted.";
    fragment.append(row);
  });
  if (!moves.length) {
    const empty = document.createElement("p");
    empty.className = "learnset-list__empty";
    empty.textContent = "No level-up moves are listed for this Pokémon.";
    fragment.append(empty);
  }
  elements.learnsetDialogList.replaceChildren(fragment);
  if (typeof elements.learnsetDialog.showModal === "function") elements.learnsetDialog.showModal();
  else elements.learnsetDialog.setAttribute("open", "");
}

function syncPokemonCardCaughtState(card, pokemon) {
  const caught = isCaught(pokemon);
  const caughtButton = card.querySelector(".caught-button");
  card.classList.toggle("is-caught", caught);
  caughtButton.setAttribute("aria-pressed", String(caught));
  caughtButton.setAttribute("aria-label", `${caught ? "Mark uncaught" : "Mark caught"}: ${pokemon.name}`);
  caughtButton.querySelector(".caught-button__text").textContent = caught ? "Caught" : "Mark caught";
}

function syncPokemonCardTeamMatchups(card, pokemon) {
  if (Number(card.dataset.teamMatchupRevision) === teamMatchupRevision) return;
  const container = card.querySelector(".team-matchups");
  container.replaceChildren();
  renderTeamMatchups(container, pokemon);
  card.dataset.teamMatchupRevision = String(teamMatchupRevision);
}

function renderPokemonCard(pokemon) {
  const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
  const caughtButton = card.querySelector(".caught-button");
  const sprite = card.querySelector(".pokemon-sprite");
  const region = card.querySelector(".region-badge");
  const note = card.querySelector(".pokemon-note");

  card.dataset.number = pokemon.number;
  card.id = `pokemon-${pokemon.number}`;
  caughtButton.addEventListener("click", () => toggleCaught(pokemon));
  syncPokemonCardCaughtState(card, pokemon);

  sprite.src = pokemon.sprite;
  sprite.alt = `${pokemon.name}${pokemon.region ? ` (${pokemon.region})` : ""} sprite`;
  card.querySelector(".pokemon-number").textContent = `No. ${String(pokemon.number).padStart(3, "0")}`;
  card.querySelector(".pokemon-name").textContent = pokemon.name.replaceAll("_", " ");
  card.querySelector(".learnset-button").addEventListener("click", () => openPokemonLearnset(pokemon));
  renderTypeBadges(card.querySelector(".pokemon-types"), pokemon.types);
  const encounterLocations = pokerexLocationsForPokemon(pokemon);
  renderLocationLinks(
    card.querySelector(".pokemon-location"),
    encounterLocations,
    locationFallbackForPokemon(pokemon),
  );
  const rarity = card.querySelector(".pokemon-rarity");
  rarity.textContent = pokemon.rarity || "N/A";
  rarity.dataset.rarity = pokemon.rarity;
  card.querySelector(".pokemon-bst").textContent = pokemon.bst || "N/A";
  renderPokemonStats(card, pokemon);
  syncPokemonCardTeamMatchups(card, pokemon);

  if (pokemon.region) {
    region.hidden = false;
    region.textContent = pokemon.region;
  }

  if (pokemon.notes) {
    note.hidden = false;
    note.querySelector("p").textContent = pokemon.notes;
  }

  const evolvesFrom = evolutionIncomingByNumber.get(pokemon.number) || [];
  const evolvesTo = evolutionOutgoingByNumber.get(pokemon.number) || [];
  if (evolvesFrom.length || evolvesTo.length) {
    card.querySelector(".pokemon-evolutions").hidden = false;
    renderEvolutionLinks(card, evolvesFrom, ".evolves-from", "fromGuideNumber");
    renderEvolutionLinks(card, evolvesTo, ".evolves-to", "toGuideNumber");
  }

  return card;
}

function filteredPokemon() {
  const f = state.filters;
  const rarityOrder = { Unique: 0, Rare: 1, Uncommon: 2, Common: 3, "": 4 };
  const search = f.search.toLowerCase();
  const result = data.dex.filter((pokemon) => {
    const encounterLocations = pokerexLocationsForPokemon(pokemon);
    if (search && !pokemonSearchTextByNumber.get(pokemon.number).includes(search)) return false;
    if (f.location && !encounterLocations.includes(f.location)) return false;
    if (f.rarity && pokemon.rarity !== f.rarity) return false;
    if (f.region && pokemon.region !== f.region) return false;
    if (f.type && !pokemon.types.includes(f.type)) return false;
    if (f.availability && pokemon.availability !== f.availability) return false;
    if (f.progress === "caught" && !isCaught(pokemon)) return false;
    if (f.progress === "uncaught" && isCaught(pokemon)) return false;
    return true;
  });

  result.sort((a, b) => {
    if (f.sort === "name") return a.name.localeCompare(b.name);
    if (f.sort === "location") {
      return (
        (pokerexLocationsForPokemon(a)[0] || "zzz").localeCompare(
          pokerexLocationsForPokemon(b)[0] || "zzz",
        ) || a.number - b.number
      );
    }
    if (f.sort === "rarity") return rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.number - b.number;
    if (f.sort === "bst-desc") return b.bst - a.bst || a.number - b.number;
    if (f.sort === "bst-asc") return a.bst - b.bst || a.number - b.number;
    return a.number - b.number;
  });
  return result;
}

function renderDex(resetLimit = false) {
  if (resetLimit) state.dexLimit = pageSize;
  const pokemon = filteredPokemon();
  const visible = pokemon.slice(0, state.dexLimit);
  const fragment = document.createDocumentFragment();
  visible.forEach((entry) => {
    let card = dexCardByNumber.get(entry.number);
    if (!card) {
      card = renderPokemonCard(entry);
      dexCardByNumber.set(entry.number, card);
    } else {
      syncPokemonCardCaughtState(card, entry);
      syncPokemonCardTeamMatchups(card, entry);
    }
    fragment.append(card);
  });
  elements.grid.replaceChildren(fragment);
  elements.emptyState.hidden = pokemon.length !== 0;
  elements.dexLoadMore.hidden = visible.length === pokemon.length;
  elements.dexLoadMore.textContent = `Load next ${pageSize} Pokémon · ${pokemon.length - visible.length} remaining`;
  elements.resultCount.textContent =
    pokemon.length === data.dex.length
      ? `Showing ${visible.length} of all ${data.dex.length} Pokémon`
      : `Showing ${visible.length} of ${pokemon.length} matching Pokémon`;
  updateSearchClearButtons();
}

function renderCollection() {
  const search = state.collectionSearch.toLowerCase();
  const pokemon = collectionDex.filter((entry) => {
    if (state.collectionStatus === "caught" && !isCaught(entry)) return false;
    if (state.collectionStatus === "missing" && isCaught(entry)) return false;
    if (!search) return true;
    return [entry.name, entry.region, pokerexLocationsForPokemon(entry).join(" "), entry.types.join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

  const fragment = document.createDocumentFragment();
  pokemon.forEach((entry) => {
    const caught = isCaught(entry);
    const card = document.createElement("article");
    card.className = "collection-card";
    card.classList.toggle("is-caught", caught);

    const jump = document.createElement("button");
    jump.type = "button";
    jump.className = "collection-card__jump";
    jump.setAttribute("aria-label", `Open encounter details for ${entry.name}`);
    jump.innerHTML = `
      <span class="collection-card__sprite">
        <img src="${entry.sprite}" alt="" width="64" height="64" loading="lazy">
      </span>
      <span class="collection-card__copy">
        <small>${entry.number ? `No. ${String(entry.number).padStart(3, "0")}` : "Additional wild entry"}</small>
        <strong>${entry.name.replaceAll("_", " ")}</strong>
        <span>${formatLocations(pokerexLocationsForPokemon(entry), 1) || locationFallbackForPokemon(entry)}</span>
      </span>
    `;
    jump.addEventListener("click", () => openCollectionEntry(entry));

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "collection-card__toggle";
    toggle.setAttribute("aria-pressed", String(caught));
    toggle.setAttribute("aria-label", `${caught ? "Mark missing" : "Mark caught"}: ${entry.name}`);
    toggle.innerHTML = `
      <span class="caught-button__ball" aria-hidden="true"></span>
      <span>${caught ? "Caught" : "Missing"}</span>
    `;
    toggle.addEventListener("click", () => toggleCaught(entry));

    card.append(jump, toggle);
    fragment.append(card);
  });

  elements.collectionGrid.replaceChildren(fragment);
  elements.collectionEmptyState.hidden = pokemon.length !== 0;
  elements.collectionResultCount.textContent = `Showing ${pokemon.length} of ${collectionDex.length} Pokémon`;
  updateSearchClearButtons();
}

function renderMoveLearners(container, move) {
  const fragment = document.createDocumentFragment();
  learnerMethodDefinitions.forEach(({ key, label }) => {
    const learners = move.learners[key];
    if (!learners.length) return;
    const group = document.createElement("section");
    group.className = "move-learner-group";
    const heading = document.createElement("h4");
    heading.textContent = `${label} · ${learners.length}`;
    const list = document.createElement("div");
    list.className = "move-learner-list";
    learners.forEach((learner) => {
      const entry = document.createElement(learner.guideNumber ? "button" : "span");
      if (learner.guideNumber) {
        entry.type = "button";
        entry.className = "move-learner is-linked";
        entry.addEventListener("click", () => focusPokemon(learner.guideNumber));
      } else {
        entry.className = "move-learner";
      }
      entry.textContent = `${learner.name}${Number.isFinite(learner.level) ? ` · Lv. ${learner.level}` : ""}`;
      list.append(entry);
    });
    group.append(heading, list);
    fragment.append(group);
  });
  container.replaceChildren(fragment);
}

function renderMoveCard(move) {
  const card = document.createElement("article");
  card.className = "move-card";
  const header = document.createElement("header");
  header.className = "move-card__heading";
  header.innerHTML = `
    <div>
      <span>No. ${String(move.id).padStart(3, "0")}</span>
      <h3></h3>
    </div>
    <div class="move-card__badges">
      <span class="type-badge" data-type="${move.type.toLowerCase()}">${move.type}</span>
      <span class="move-category" data-category="${move.category.toLowerCase()}">${move.category}</span>
    </div>
  `;
  header.querySelector("h3").textContent = move.name;

  const metrics = document.createElement("dl");
  metrics.className = "move-card__metrics";
  [
    ["Power", move.power || "—"],
    ["Accuracy", move.accuracy ? `${move.accuracy}%` : "—"],
    ["PP", move.pp || "—"],
    ["Priority", Number.isFinite(move.priority) ? (move.priority > 0 ? `+${move.priority}` : move.priority) : "—"],
    ["Contact", move.contact ? "Yes" : "No"],
    ["Learners", move.learnerCount],
  ].forEach(([label, value]) => {
    const fact = document.createElement("div");
    fact.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
    metrics.append(fact);
  });

  const copy = document.createElement("div");
  copy.className = "move-card__copy";
  const description = document.createElement("p");
  description.textContent = move.description || "No description extracted.";
  copy.append(description);
  if (move.effect) {
    const effect = document.createElement("p");
    effect.className = "move-card__effect";
    const label = document.createElement("strong");
    label.textContent = "Effect";
    effect.append(label, document.createTextNode(move.effect));
    copy.append(effect);
  }

  const tutorLocations = tutorsByMoveId.get(move.id) || [];
  if (state.moveMode === "tutors" && tutorLocations.length) {
    const locations = document.createElement("div");
    locations.className = "move-tutor-locations";
    const label = document.createElement("strong");
    label.textContent = tutorLocations.length === 1 ? "Tutor location" : "Tutor locations";
    const list = document.createElement("div");
    uniqueInOrder(tutorLocations.map((tutor) => tutor.location)).forEach((location) => {
      const badge = document.createElement("span");
      badge.textContent = location;
      list.append(badge);
    });
    locations.append(label, list);
    copy.append(locations);
  }

  const methodSummary = document.createElement("div");
  methodSummary.className = "move-method-summary";
  learnerMethodDefinitions.forEach(({ key, label }) => {
    if (!move.learners[key].length) return;
    const chip = document.createElement("span");
    chip.dataset.method = key;
    chip.textContent = `${label} ${move.learners[key].length}`;
    methodSummary.append(chip);
  });

  card.append(header, metrics, copy, methodSummary);
  if (Object.values(move.learners).some((learners) => learners.length)) {
    const details = document.createElement("details");
    details.className = "move-learners";
    const summary = document.createElement("summary");
    summary.textContent = `Learner details · ${move.learnerCount} species / forms`;
    const body = document.createElement("div");
    body.className = "move-learners__body";
    details.addEventListener("toggle", () => {
      if (details.open && !body.childElementCount) renderMoveLearners(body, move);
    });
    details.append(summary, body);
    card.append(details);
  }
  return card;
}

function filteredMoves() {
  const filters = state.moveFilters;
  const search = filters.search.toLowerCase();
  const sourceMoves =
    state.moveMode === "tutors" ? moveData.moves.filter((move) => tutorMoveIds.has(move.id)) : moveData.moves;
  const result = sourceMoves.filter((move) => {
    if (search && !moveSearchTextById.get(move.id).includes(search)) return false;
    if (filters.type && move.type !== filters.type) return false;
    if (filters.category && move.category !== filters.category) return false;
    if (filters.method && !move.learners[filters.method].length) return false;
    return true;
  });
  result.sort((a, b) => {
    if (filters.sort === "name") return a.name.localeCompare(b.name);
    if (filters.sort === "power") return b.power - a.power || a.name.localeCompare(b.name);
    if (filters.sort === "learners") return b.learnerCount - a.learnerCount || a.name.localeCompare(b.name);
    return a.id - b.id;
  });
  return result;
}

function renderMoves(resetLimit = false) {
  if (resetLimit) state.moveLimit = pageSize;
  const moves = filteredMoves();
  const visible = moves.slice(0, state.moveLimit);
  const fragment = document.createDocumentFragment();
  visible.forEach((move) => fragment.append(renderMoveCard(move)));
  elements.moveList.replaceChildren(fragment);
  elements.moveEmptyState.hidden = moves.length !== 0;
  elements.showMoreMoves.hidden = visible.length === moves.length;
  elements.showMoreMoves.textContent = `Load next ${pageSize} moves · ${moves.length - visible.length} remaining`;
  const total = state.moveMode === "tutors" ? tutorMoveIds.size : moveData.moves.length;
  const noun = state.moveMode === "tutors" ? "move tutors" : "moves";
  elements.moveResultCount.textContent =
    moves.length === total
      ? `Showing ${visible.length} of all ${total} ${noun}`
      : `Showing ${visible.length} of ${moves.length} matching ${noun}`;
  updateSearchClearButtons();
}

function renderAbilityUsers(container, ability) {
  const fragment = document.createDocumentFragment();
  ability.users.forEach((user) => {
    const entry = document.createElement(user.guideNumber ? "button" : "span");
    if (user.guideNumber) {
      entry.type = "button";
      entry.className = "ability-user is-linked";
      entry.addEventListener("click", () => focusPokemon(user.guideNumber));
    } else {
      entry.className = "ability-user";
    }
    entry.textContent = `${user.name}${user.hidden ? " · Hidden Ability" : ""}`;
    fragment.append(entry);
  });
  container.replaceChildren(fragment);
}

function renderAbilityCard(ability) {
  const card = document.createElement("article");
  card.className = "ability-card";
  const heading = document.createElement("header");
  heading.innerHTML = `
    <div><span>No. ${String(ability.id).padStart(3, "0")}</span><h3></h3></div>
    <strong>${ability.userCount} Pokémon / forms</strong>
  `;
  heading.querySelector("h3").textContent = ability.name;
  const description = document.createElement("p");
  description.textContent = ability.description || "No description extracted.";
  card.append(heading, description);
  if (ability.users.length) {
    const details = document.createElement("details");
    details.className = "ability-users";
    const summary = document.createElement("summary");
    summary.textContent = `Pokémon users · ${ability.userCount}`;
    const users = document.createElement("div");
    users.className = "ability-user-list";
    details.addEventListener("toggle", () => {
      if (details.open && !users.childElementCount) renderAbilityUsers(users, ability);
    });
    details.append(summary, users);
    card.append(details);
  }
  return card;
}

function filteredAbilities() {
  const search = state.abilityFilters.search.toLowerCase();
  const abilities = abilityData.abilities.filter(
    (ability) => !search || abilitySearchTextById.get(ability.id).includes(search),
  );
  abilities.sort((a, b) => {
    if (state.abilityFilters.sort === "name") return a.name.localeCompare(b.name);
    if (state.abilityFilters.sort === "users") return b.userCount - a.userCount || a.name.localeCompare(b.name);
    return a.id - b.id;
  });
  return abilities;
}

function renderAbilities(resetLimit = false) {
  if (resetLimit) state.abilityLimit = pageSize;
  const abilities = filteredAbilities();
  const visible = abilities.slice(0, state.abilityLimit);
  const fragment = document.createDocumentFragment();
  visible.forEach((ability) => fragment.append(renderAbilityCard(ability)));
  elements.abilityList.replaceChildren(fragment);
  elements.abilityEmptyState.hidden = abilities.length !== 0;
  elements.abilityLoadMore.hidden = visible.length === abilities.length;
  elements.abilityLoadMore.textContent =
    `Load next ${pageSize} abilities · ${abilities.length - visible.length} remaining`;
  elements.abilityResultCount.textContent =
    abilities.length === abilityData.abilities.length
      ? `Showing ${visible.length} of all ${abilityData.abilities.length} abilities`
      : `Showing ${visible.length} of ${abilities.length} matching abilities`;
  updateSearchClearButtons();
}

function updateSearchClearButtons() {
  document.querySelectorAll("[data-clear-search]").forEach((button) => {
    const input = document.querySelector(button.dataset.clearSearch);
    button.hidden = !input?.value;
  });
}

function observeAutoLoadTrigger(trigger) {
  if (trigger && autoLoadObserver) autoLoadObserver.observe(trigger);
}

function initializeAutoLoading() {
  if (!("IntersectionObserver" in window)) return;
  autoLoadObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.hidden) entry.target.click();
      });
    },
    { rootMargin: "700px 0px" },
  );
  [elements.dexLoadMore, elements.showMoreMoves, elements.abilityLoadMore].forEach(observeAutoLoadTrigger);
}

function activateView(viewName) {
  document.querySelectorAll(".view-tab").forEach((button) => {
    const active = button.dataset.view === viewName;
    button.classList.toggle("is-active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  document.querySelectorAll(".guide-view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewName}`);
  });
  if (viewName === "caught") renderCollection();
  if (viewName === "moves") renderMoves();
  if (viewName === "abilities") renderAbilities();
  if (viewName === "trainers") renderTrainers();
  if (viewName === "gyms") renderGyms();
  if (viewName === "team") renderTeam();
  if (viewName === "planner") renderPlanner();
  if (viewName === "save") {
    updateSaveSummary();
    updateSyncControls();
  }
}

function resetDexFilters() {
  Object.assign(state.filters, {
    search: "",
    location: "",
    rarity: "",
    region: "",
    type: "",
    availability: "",
    progress: "",
    sort: "number",
  });
  document.querySelector("#filters").reset();
  document.querySelector("#search").value = "";
  renderQuickLocations();
}

function focusPokemon(number) {
  if (!pokemonByNumber.has(number)) return;
  resetDexFilters();
  activateView("dex");
  state.dexLimit = Math.max(pageSize, filteredPokemon().findIndex((pokemon) => pokemon.number === number) + 1);
  renderDex();
  history.replaceState(null, "", `#pokemon-${number}`);
  requestAnimationFrame(() => {
    const card = document.querySelector(`#pokemon-${number}`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("is-highlighted");
    window.setTimeout(() => card.classList.remove("is-highlighted"), 2200);
  });
}

function openLocation(location) {
  activateView("locations");
  elements.locationSearch.value = location;
  renderLocations(location);
  requestAnimationFrame(() => {
    const card = [...document.querySelectorAll(".location-card")].find(
      (element) => element.dataset.location === location,
    );
    card?.scrollIntoView({ behavior: "smooth", block: "start" });
    card?.classList.add("is-highlighted");
    window.setTimeout(() => card?.classList.remove("is-highlighted"), 2200);
  });
}

function openCollectionEntry(entry) {
  if (entry.number) {
    focusPokemon(entry.number);
    return;
  }
  const location = entry.locations?.[0];
  if (location) openLocation(location);
}

function renderLocations(search = "") {
  const normalizedSearch = search.trim().toLowerCase();
  const fragment = document.createDocumentFragment();
  pokerexOrderedLocations
    .filter((location) => {
      if (!normalizedSearch) return true;
      return (
        location.name.toLowerCase().includes(normalizedSearch) ||
        location.methods.some((method) =>
          method.species.some((pokemon) => pokemon.name.toLowerCase().includes(normalizedSearch)),
        )
      );
    })
    .forEach((location) => {
      const uniquePokemon = new Map();
      location.methods.forEach((method) =>
        method.species.forEach((pokemon) => uniquePokemon.set(pokemon.trackingId, pokemon)),
      );
      const caughtCount = [...uniquePokemon.values()].filter(isCaught).length;
      const card = document.createElement("details");
      card.className = "location-card";
      card.dataset.location = location.name;
      card.open = Boolean(normalizedSearch) || locationOpenGroups.has(location.name);
      const summary = document.createElement("summary");
      summary.className = "location-card__heading";
      summary.innerHTML = `
          <div>
            <span>${location.mapType || "wild area"}</span>
            <h3>${location.name}</h3>
          </div>
          <span>${caughtCount} / ${uniquePokemon.size} caught</span>
      `;
      const content = document.createElement("div");
      content.className = "location-card__content";
      const populate = () => {
        if (content.childElementCount) return;
        content.innerHTML = `
          <div class="location-card__body">
            <a class="location-map" href="${location.map.fullImage}" target="_blank" rel="noreferrer">
              <img src="${location.map.thumbnail}" alt="${location.name} map" loading="lazy">
              <span>Open full map · ${location.map.width} × ${location.map.height}px</span>
            </a>
            <div class="encounter-methods"></div>
          </div>
          <a class="map-reference-link" href="${location.map.pokerexUrl}" target="_blank" rel="noreferrer">
            Open map reference
          </a>
        `;
        const methods = content.querySelector(".encounter-methods");
        location.methods.forEach((method) => {
          const section = document.createElement("section");
          section.className = "encounter-method";
          section.innerHTML = `
            <header>
              <h4>${method.label}</h4>
              <span>Encounter rate ${method.encounterRate}</span>
            </header>
            <div class="location-card__pokemon"></div>
          `;
          const list = section.querySelector(".location-card__pokemon");
          method.species.forEach((entry) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "location-pokemon";
            button.classList.toggle("is-caught", isCaught(entry));
            button.setAttribute(
              "aria-label",
              `${isCaught(entry) ? "Mark uncaught" : "Mark caught"}: ${entry.name}`,
            );
            button.innerHTML = `
              <img src="${entry.sprite}" alt="" width="52" height="52" loading="lazy">
              <span>
                <strong>${entry.name.replaceAll("_", " ")}</strong>
                <span>Lv. ${entry.minLevel}${entry.maxLevel !== entry.minLevel ? `–${entry.maxLevel}` : ""} · ${entry.rate}%</span>
              </span>
            `;
            button.addEventListener("click", () => toggleCaught(entry));
            list.append(button);
          });
          methods.append(section);
        });
      };
      card._populate = populate;
      card._clear = () => content.replaceChildren();
      card.addEventListener("toggle", () => {
        if (card.open) {
          if (!normalizedSearch) locationOpenGroups.add(location.name);
          populate();
        } else {
          locationOpenGroups.delete(location.name);
          card._clear();
        }
      });
      if (card.open) populate();
      card.append(summary, content);
      fragment.append(card);
    });
  elements.locationList.replaceChildren(fragment);
  updateSearchClearButtons();
}

function renderMegas() {
  elements.megaNote.innerHTML = `
    <span class="guide-tip__label">Choice rules</span>
    <div>
      <strong>Four Mega Stones are available</strong>
      <p>
        You receive Aerodactylite, one Kanto starter Mega Stone, one Mega Stone from the choices
        below, and Diancite.
      </p>
    </div>
  `;
  const fragment = document.createDocumentFragment();
  data.megas.forEach((mega) => {
    const card = document.createElement("article");
    card.className = "mega-card";
    card.innerHTML = `
      <img src="${mega.sprite}" alt="${mega.name} Mega Evolution sprite" width="88" height="88" loading="lazy">
      <strong>${mega.name}</strong>
    `;
    fragment.append(card);
  });
  elements.megaGrid.replaceChildren(fragment);
}

const itemMoney = (value) => `₽${Number(value).toLocaleString("en-GB")}`;

function createItemSourceGroup(label, entries) {
  if (!entries.length) return null;
  const section = document.createElement("section");
  section.className = "item-source-group";
  const heading = document.createElement("strong");
  heading.textContent = label;
  const list = document.createElement("div");
  entries.forEach((entry) => {
    const chip = document.createElement("span");
    chip.textContent = entry;
    list.append(chip);
  });
  section.append(heading, list);
  return section;
}

function renderItemCard(item) {
  const card = document.createElement("article");
  card.className = "item-card";
  card.dataset.itemId = item.id;

  const identity = document.createElement("header");
  identity.className = "item-card__identity";
  identity.innerHTML = `
    <span class="item-sprite-well"><img src="${item.icon}" alt="" width="56" height="56" loading="lazy"></span>
    <span>
      <small>No. ${String(item.id).padStart(3, "0")}</small>
      <h3></h3>
      <em>${item.category}</em>
    </span>
  `;
  identity.querySelector("h3").textContent = item.name;

  const copy = document.createElement("div");
  copy.className = "item-card__copy";
  const description = document.createElement("p");
  description.textContent = item.description || "No item description was extracted.";
  copy.append(description);
  const prices = document.createElement("dl");
  prices.className = "item-card__prices";
  if (item.cost) {
    const cost = document.createElement("div");
    cost.innerHTML = `<dt>Shop cost</dt><dd>${itemMoney(item.cost)}</dd>`;
    prices.append(cost);
  }
  if (item.sellValue) {
    const sell = document.createElement("div");
    sell.innerHTML = `<dt>Sell value</dt><dd>${itemMoney(item.sellValue)}</dd>`;
    prices.append(sell);
  }

  const sources = document.createElement("div");
  sources.className = "item-card__sources";
  const shopSources = item.acquisition.shops.map((entry) => `Sold in ${entry.location}`);
  if (item.acquisition.unmappedShop) shopSources.push("Sold in a shop");
  const sourceGroups = [
    createItemSourceGroup("Shop", uniqueInOrder(shopSources)),
    createItemSourceGroup(
      "NPC / field source",
      uniqueInOrder([
        ...item.acquisition.foundIn.map((entry) => entry.location),
        ...item.acquisition.npcSources.map((entry) => entry.location),
      ]),
    ),
    createItemSourceGroup(
      "Held by wild Pokémon",
      item.acquisition.heldByWild.map((entry) => `${entry.pokemon} · ${entry.chance}`),
    ),
    createItemSourceGroup(
      "Carried by trainers",
      item.acquisition.carriedBy.map(
        (entry) => `${entry.trainer}${entry.location ? ` · ${entry.location}` : ""}`,
      ),
    ),
  ].filter(Boolean);
  if (sourceGroups.length) sources.append(...sourceGroups);
  else {
    const empty = document.createElement("p");
    empty.className = "item-card__no-source";
    empty.textContent = "No acquisition source is documented.";
    sources.append(empty);
  }

  card.append(identity, copy);
  if (prices.children.length) card.append(prices);
  card.append(sources);
  return card;
}

function itemMatchesSearch(item, search) {
  if (!search) return true;
  return [
    item.name,
    item.category,
    item.description,
    item.acquisition.soldInShop ? "sold shop" : "",
    ...item.acquisition.shops.map((entry) => entry.location),
    ...item.acquisition.npcSources.map((entry) => entry.location),
    ...item.acquisition.foundIn.map((entry) => entry.location),
    ...item.acquisition.heldByWild.flatMap((entry) => [entry.pokemon, entry.chance]),
    ...item.acquisition.carriedBy.flatMap((entry) => [entry.trainer, entry.trainerClass, entry.location]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(search);
}

function renderItems() {
  const search = state.itemSearch.trim().toLowerCase();
  const filtered = itemData.items.filter((item) => itemMatchesSearch(item, search));
  const fragment = document.createDocumentFragment();
  itemData.categories.forEach((category) => {
    const items = filtered.filter((item) => item.category === category.name);
    if (!items.length) return;
    const group = document.createElement("details");
    group.className = "item-category";
    group.dataset.category = category.name;
    group.open = Boolean(search) || itemOpenCategories.has(category.name);
    const summary = document.createElement("summary");
    summary.innerHTML = `<span><strong></strong><small>${items.length} ${items.length === 1 ? "item" : "items"}</small></span><span aria-hidden="true">+</span>`;
    summary.querySelector("strong").textContent = category.name;
    const grid = document.createElement("div");
    grid.className = "item-grid";
    const populate = () => {
      const limit = itemCategoryLimits.get(category.name) || pageSize;
      const visible = items.slice(0, limit);
      const cards = document.createDocumentFragment();
      visible.forEach((item) => cards.append(renderItemCard(item)));
      if (visible.length < items.length) {
        const loadMore = document.createElement("button");
        loadMore.type = "button";
        loadMore.className = "auto-load-trigger item-load-more";
        loadMore.textContent = `Load next ${pageSize} items · ${items.length - visible.length} remaining`;
        loadMore.addEventListener("click", () => {
          itemCategoryLimits.set(category.name, limit + pageSize);
          populate();
        });
        cards.append(loadMore);
        requestAnimationFrame(() => observeAutoLoadTrigger(loadMore));
      }
      grid.replaceChildren(cards);
    };
    group._populate = populate;
    group._clear = () => grid.replaceChildren();
    group.addEventListener("toggle", () => {
      if (group.open) {
        if (!search) itemOpenCategories.add(category.name);
        populate();
      } else {
        itemOpenCategories.delete(category.name);
        group._clear();
      }
    });
    if (group.open) populate();
    group.append(summary, grid);
    fragment.append(group);
  });
  elements.itemList.replaceChildren(fragment);
  elements.itemEmptyState.hidden = filtered.length !== 0;
  elements.itemResultCount.textContent =
    filtered.length === itemData.items.length
      ? `Showing all ${itemData.items.length} items`
      : `Showing ${filtered.length} of ${itemData.items.length} items`;
  updateSearchClearButtons();
}

function setNotesHidden(hidden) {
  state.notesHidden = hidden;
  document.body.classList.toggle("notes-hidden", hidden);
  elements.spoilerToggle.textContent = hidden ? "Notes hidden" : "Notes visible";
  elements.spoilerToggle.setAttribute("aria-pressed", String(hidden));
  localStorage.setItem(notesKey, String(hidden));
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.textContent = theme === "dark" ? "Light mode" : "Dark mode";
  elements.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  localStorage.setItem(themeKey, theme);
}

function bindControls() {
  const bindings = {
    "#search": "search",
    "#location-filter": "location",
    "#rarity-filter": "rarity",
    "#region-filter": "region",
    "#type-filter": "type",
    "#availability-filter": "availability",
    "#progress-filter": "progress",
    "#sort": "sort",
  };

  Object.entries(bindings).forEach(([selector, key]) => {
    const control = document.querySelector(selector);
    control.addEventListener("input", () => {
      state.filters[key] = control.value;
      if (key === "location") renderQuickLocations();
      renderDex(true);
    });
  });

  document.querySelector("#clear-filters").addEventListener("click", () => {
    resetDexFilters();
    renderDex(true);
  });

  elements.locationSearch.addEventListener("input", () => renderLocations(elements.locationSearch.value));
  document.querySelector("#expand-locations").addEventListener("click", () => {
    elements.locationList.querySelectorAll(".location-card").forEach((location) => {
      locationOpenGroups.add(location.dataset.location);
      location.open = true;
      location._populate?.();
    });
  });
  document.querySelector("#collapse-locations").addEventListener("click", () => {
    locationOpenGroups.clear();
    elements.locationList.querySelectorAll(".location-card").forEach((location) => {
      location.open = false;
      location._clear?.();
    });
  });
  elements.itemSearch.addEventListener("input", () => {
    state.itemSearch = elements.itemSearch.value;
    itemCategoryLimits.clear();
    renderItems();
  });
  document.querySelector("#expand-item-categories").addEventListener("click", () => {
    document.querySelectorAll(".item-category").forEach((category) => {
      category.open = true;
      itemOpenCategories.add(category.dataset.category);
      category._populate?.();
    });
  });
  document.querySelector("#collapse-item-categories").addEventListener("click", () => {
    document.querySelectorAll(".item-category").forEach((category) => {
      category.open = false;
      itemOpenCategories.delete(category.dataset.category);
      category._clear?.();
    });
  });
  elements.trainerSearch.addEventListener("input", () => {
    state.trainerFilters.search = elements.trainerSearch.value;
    renderTrainers();
  });
  document.querySelector("#expand-trainer-locations").addEventListener("click", () => {
    elements.trainerLocationList
      .querySelectorAll(".trainer-location-group")
      .forEach((group) => {
        group.open = true;
        group._populate?.();
      });
  });
  document.querySelector("#collapse-trainer-locations").addEventListener("click", () => {
    elements.trainerLocationList
      .querySelectorAll(".trainer-location-group")
      .forEach((group) => {
        group.open = false;
        group._clear?.();
      });
  });
  const moveBindings = {
    "#move-search": "search",
    "#move-type-filter": "type",
    "#move-category-filter": "category",
    "#move-method-filter": "method",
    "#move-sort": "sort",
  };
  Object.entries(moveBindings).forEach(([selector, key]) => {
    const control = document.querySelector(selector);
    control.addEventListener("input", () => {
      state.moveFilters[key] = control.value;
      renderMoves(true);
    });
  });
  document.querySelector("#clear-move-filters").addEventListener("click", () => {
    Object.assign(state.moveFilters, { search: "", type: "", category: "", method: "", sort: "id" });
    document.querySelector("#move-filters").reset();
    renderMoves(true);
  });
  document.querySelectorAll("[data-move-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.moveMode = button.dataset.moveMode;
      document.querySelectorAll("[data-move-mode]").forEach((entry) => {
        entry.classList.toggle("is-active", entry === button);
      });
      renderMoves(true);
    });
  });
  elements.showMoreMoves.addEventListener("click", () => {
    state.moveLimit += pageSize;
    renderMoves();
  });
  elements.dexLoadMore.addEventListener("click", () => {
    state.dexLimit += pageSize;
    renderDex();
  });
  const abilityBindings = {
    "#ability-search": "search",
    "#ability-sort": "sort",
  };
  Object.entries(abilityBindings).forEach(([selector, key]) => {
    const control = document.querySelector(selector);
    control.addEventListener("input", () => {
      state.abilityFilters[key] = control.value;
      renderAbilities(true);
    });
  });
  document.querySelector("#clear-ability-filters").addEventListener("click", () => {
    Object.assign(state.abilityFilters, { search: "", sort: "id" });
    document.querySelector("#ability-filters").reset();
    renderAbilities(true);
  });
  elements.abilityLoadMore.addEventListener("click", () => {
    state.abilityLimit += pageSize;
    renderAbilities();
  });
  document.querySelector("#export-save").addEventListener("click", exportSave);
  document.querySelector("#import-save-button").addEventListener("click", () => {
    document.querySelector("#import-save-file").click();
  });
  document.querySelector("#import-save-file").addEventListener("change", (event) => {
    importSaveFile(event.target.files?.[0]);
    event.target.value = "";
  });
  document.querySelector("#create-sync-code").addEventListener("click", () => {
    state.syncCode = crypto.randomUUID();
    localStorage.setItem(syncCodeKey, state.syncCode);
    updateSyncControls();
    setSaveStatus("New private sync UUID created. Save it somewhere secure.", "success");
  });
  elements.syncCode.addEventListener("input", () => {
    state.syncCode = elements.syncCode.value.trim();
    if (state.syncCode) localStorage.setItem(syncCodeKey, state.syncCode);
    else localStorage.removeItem(syncCodeKey);
    document.querySelector("#copy-sync-code").disabled = !state.syncCode;
    document.querySelector("#forget-sync-code").disabled = !state.syncCode;
  });
  document.querySelector("#copy-sync-code").addEventListener("click", () => {
    copySyncCode().catch((error) => setSaveStatus(error.message, "error"));
  });
  document.querySelector("#upload-cloud-save").addEventListener("click", async () => {
    try {
      await cloudSave("PUT");
      setSaveStatus("Encrypted save uploaded to the cloud.", "success");
    } catch (error) {
      setSaveStatus(error.message || "Cloud upload failed.", "error");
    }
  });
  document.querySelector("#download-cloud-save").addEventListener("click", async () => {
    try {
      const save = await cloudSave("GET");
      if (!window.confirm("Replace this device's current progress with the encrypted cloud save?")) return;
      applySaveDocument(save);
      setSaveStatus("Encrypted cloud save loaded successfully.", "success");
    } catch (error) {
      setSaveStatus(error.message || "Cloud download failed.", "error");
    }
  });
  document.querySelector("#forget-sync-code").addEventListener("click", () => {
    state.syncCode = "";
    localStorage.removeItem(syncCodeKey);
    updateSyncControls();
    setSaveStatus("This device forgot the sync UUID. The encrypted cloud save was not deleted.", "success");
  });
  document.querySelector("#clear-team").addEventListener("click", () => {
    if (
      !state.team.some((slot) => slot.pokemonNumber) ||
      !window.confirm("Clear all Pokemon, natures, abilities, and moves from your team?")
    ) {
      return;
    }
    state.team = Array.from({ length: 6 }, () => ({
      pokemonNumber: null,
      moves: [null, null, null, null],
      abilityId: null,
      nature: null,
    }));
    persistTeam();
    refreshTeamAndDex();
  });
  document.querySelector("#clear-planner").addEventListener("click", () => {
    if (
      !state.planner.some((slot) => slot.pokemonNumber) ||
      !window.confirm("Clear all Pokemon, preferred natures, abilities, and planned moves from your shortlist?")
    ) {
      return;
    }
    state.planner = Array.from({ length: 6 }, () => ({
      pokemonNumber: null,
      moves: [null, null, null, null],
      abilityId: null,
      nature: null,
    }));
    persistPlanner();
    renderPlanner();
  });
  elements.collectionSearch.addEventListener("input", () => {
    state.collectionSearch = elements.collectionSearch.value;
    renderCollection();
  });
  document.querySelectorAll("[data-clear-search]").forEach((button) => {
    const input = document.querySelector(button.dataset.clearSearch);
    input?.addEventListener("input", updateSearchClearButtons);
    button.addEventListener("click", () => {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
    });
  });
  document.querySelectorAll("[data-collection-status]").forEach((button) => {
    button.addEventListener("click", () => {
      state.collectionStatus = button.dataset.collectionStatus;
      document.querySelectorAll("[data-collection-status]").forEach((entry) => {
        entry.classList.toggle("is-active", entry === button);
      });
      renderCollection();
    });
  });
  elements.spoilerToggle.addEventListener("click", () => setNotesHidden(!state.notesHidden));
  elements.themeToggle.addEventListener("click", () => setTheme(state.theme === "dark" ? "light" : "dark"));
  document.querySelector("#reset-progress").addEventListener("click", () => {
    if (!state.caught.size || !window.confirm("Clear all caught Pokémon from this guide?")) return;
    state.caught.clear();
    persistCaught();
    renderDex();
    renderLocations(elements.locationSearch.value);
    renderCollection();
  });

  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.addEventListener("click", () => activateView(tab.dataset.view));
  });
  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activateView(button.dataset.openView);
      document.querySelector(".view-tabs").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

initializeSummary();
setNotesHidden(state.notesHidden);
setTheme(state.theme);
updateSyncControls();
bindControls();
initializeAutoLoading();
updateProgress();
renderQuickLocations();
renderDex();
renderJourneyOverview();
renderTrainerQuickLocations();
renderTrainers();
renderGyms();
renderTeam();
renderPlanner();
renderMoves();
renderAbilities();
renderCollection();
renderLocations();
renderMegas();
renderItems();
const initialPokemonNumber = Number(location.hash.match(/^#pokemon-(\d+)$/)?.[1]);
if (initialPokemonNumber) focusPokemon(initialPokemonNumber);
