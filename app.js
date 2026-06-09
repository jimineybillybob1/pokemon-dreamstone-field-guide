const data = window.DREAMSTONE_DATA;
const encounters = window.DREAMSTONE_ENCOUNTERS;
const moveData = window.DREAMSTONE_MOVES;
const storageKey = "dreamstone-field-guide-caught";
const notesKey = "dreamstone-field-guide-notes-hidden-v2";
const themeKey = "dreamstone-field-guide-theme";
const teamStorageKey = "dreamstone-field-guide-team";

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
    }));
  } catch {
    return Array.from({ length: 6 }, () => ({
      pokemonNumber: null,
      moves: [null, null, null, null],
    }));
  }
}

const state = {
  caught: new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")),
  notesHidden: localStorage.getItem(notesKey) === "true",
  theme: document.documentElement.dataset.theme || "light",
  collectionStatus: "all",
  collectionSearch: "",
  moveLimit: 100,
  team: loadTeam(),
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
  cardTemplate: document.querySelector("#pokemon-card-template"),
  emptyState: document.querySelector("#empty-state"),
  resultCount: document.querySelector("#result-count"),
  caughtCount: document.querySelector("#caught-count"),
  totalCount: document.querySelector("#total-count"),
  progressBar: document.querySelector("#progress-bar"),
  progressPercent: document.querySelector("#progress-percent"),
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
  teamGrid: document.querySelector("#team-grid"),
  megaGrid: document.querySelector("#mega-grid"),
  megaNote: document.querySelector("#mega-note"),
  itemList: document.querySelector("#item-list"),
};

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
const uniqueInOrder = (values) => [...new Set(values.filter(Boolean))];
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
const isCaught = (pokemon) => state.caught.has(dexId(pokemon));
const pokemonByNumber = new Map(data.dex.map((pokemon) => [pokemon.number, pokemon]));
const moveById = new Map(moveData.moves.map((move) => [move.id, move]));
const compatibleMoveIdsByPokemon = new Map(data.dex.map((pokemon) => [pokemon.number, new Set()]));
moveData.moves.forEach((move) => {
  Object.values(move.learners)
    .flat()
    .forEach((learner) => {
      if (learner.guideNumber) compatibleMoveIdsByPokemon.get(learner.guideNumber)?.add(move.id);
    });
});
const pokemonOptions = [...data.dex].sort((a, b) => a.number - b.number);
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
const locationsForPokemon = (pokemon) => {
  const pokerexLocations = uniqueSorted([
    ...(encounterLocationsByGuideNumber.get(pokemon.number) || []),
    ...(pokemon.locations || []),
  ]);
  return pokerexLocations.length ? pokerexLocations : uniqueSorted([pokemon.location]);
};
const quickLocations = uniqueInOrder(encounters.locations.map((location) => location.name));
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
const moveSearchTextById = new Map(
  moveData.moves.map((move) => [
    move.id,
    [
      move.name,
      move.type,
      move.category,
      move.description,
      move.effect,
      ...Object.values(move.learners).flatMap((learners) => learners.map((learner) => learner.name)),
    ]
      .join(" ")
      .toLowerCase(),
  ]),
);

function setSelectOptions(id, values) {
  const select = document.querySelector(id);
  values.forEach((value) => select.add(new Option(value, value)));
}

function initializeSummary() {
  document.querySelector("#available-count").textContent = encounters.encounterSpecies.length;
  document.querySelector("#special-count").textContent = collectionDex.length;
  document.querySelector("#unobtainable-count").textContent = data.dex.length;
  document.querySelector("#location-count").textContent = encounters.locations.length;

  setSelectOptions("#location-filter", locationFilterOptions);
  setSelectOptions("#rarity-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.rarity)));
  setSelectOptions("#region-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.region)));
  setSelectOptions("#type-filter", uniqueSorted(data.dex.flatMap((pokemon) => pokemon.types)));
  setSelectOptions("#move-type-filter", uniqueSorted(moveData.moves.map((move) => move.type)));
  setSelectOptions("#move-category-filter", uniqueSorted(moveData.moves.map((move) => move.category)));
  setSelectOptions(
    "#availability-filter",
    uniqueSorted(data.dex.map((pokemon) => pokemon.availability)),
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
  renderDex();
}

function updateProgress() {
  const caughtCount = collectionDex.filter(isCaught).length;
  const percent = Math.round((caughtCount / collectionDex.length) * 100);
  elements.caughtCount.textContent = caughtCount;
  elements.totalCount.textContent = collectionDex.length;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
  elements.caughtTabCount.textContent = caughtCount;
  elements.collectionCaughtCount.textContent = caughtCount;
  elements.collectionMissingCount.textContent = collectionDex.length - caughtCount;
  elements.collectionPercent.textContent = `${percent}%`;
  elements.collectionProgressBar.style.width = `${percent}%`;
  elements.progressBar.parentElement.setAttribute(
    "aria-label",
    `${caughtCount} of ${collectionDex.length} Pokémon caught`,
  );
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

function renderEvolutionLinks(card, relationNumbers, selector) {
  const group = card.querySelector(selector);
  if (!relationNumbers.length) return;

  group.hidden = false;
  const links = group.querySelector(".evolution-links");
  relationNumbers.forEach((number) => {
    const related = pokemonByNumber.get(number);
    if (!related) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "evolution-link";
    button.setAttribute("aria-label", `Go to ${related.name}`);
    button.innerHTML = `
      <img src="${related.sprite}" alt="" width="38" height="38" loading="lazy">
      <span>${related.name.replaceAll("_", " ")}</span>
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
  locations.forEach((location) => {
    const hasEncounterMap = encounters.locations.some(
      (encounterLocation) => encounterLocation.name === location,
    );
    if (!hasEncounterMap) {
      const label = document.createElement("span");
      label.className = "pokemon-location-label";
      label.textContent = location;
      fragment.append(label);
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pokemon-location-link";
    button.textContent = location;
    button.setAttribute("aria-label", `Open encounters for ${location}`);
    button.addEventListener("click", () => openLocation(location));
    fragment.append(button);
  });
  container.replaceChildren(fragment);
}

function renderPokemonStats(card, pokemon) {
  const section = card.querySelector(".pokemon-stats");
  if (!pokemon.bst || !pokemon.stats) return;

  section.hidden = false;
  const heading = document.createElement("header");
  heading.innerHTML = `
    <span>Base stats</span>
  `;
  const rows = document.createElement("div");
  rows.className = "pokemon-stats__rows";
  statDefinitions.forEach(({ key, label, max }) => {
    const value = key === "bst" ? pokemon.bst : pokemon.stats[key];
    if (!Number.isFinite(value)) return;
    const row = document.createElement("div");
    row.className = `pokemon-stat pokemon-stat--${key}`;
    row.innerHTML = `
      <span>${label}</span>
      <div class="pokemon-stat__track" title="${label}: ${value}">
        <span class="pokemon-stat__fill" style="width: ${Math.min((value / max) * 100, 100)}%"></span>
      </div>
      <strong>${value}</strong>
    `;
    rows.append(row);
  });
  section.append(heading, rows);
}

function persistTeam() {
  localStorage.setItem(teamStorageKey, JSON.stringify(state.team));
}

function refreshTeamAndDex() {
  renderTeam();
  elements.grid.querySelectorAll(".pokemon-card").forEach((card) => {
    const pokemon = pokemonByNumber.get(Number(card.dataset.number));
    const container = card.querySelector(".team-matchups");
    if (!pokemon || !container) return;
    container.replaceChildren();
    renderTeamMatchups(container, pokemon);
  });
}

function setTeamPokemon(slotIndex, pokemonNumber, retainMoves = false) {
  const slot = state.team[slotIndex];
  slot.pokemonNumber = pokemonByNumber.has(pokemonNumber) ? pokemonNumber : null;
  if (!retainMoves) slot.moves = [null, null, null, null];
  persistTeam();
  refreshTeamAndDex();
}

function setTeamMove(slotIndex, moveIndex, moveId) {
  state.team[slotIndex].moves[moveIndex] = moveById.has(moveId) ? moveId : null;
  persistTeam();
  refreshTeamAndDex();
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

function createPokemonPicker(slotIndex, selectedNumber) {
  const label = document.createElement("label");
  label.className = "team-pokemon-picker";
  const text = document.createElement("span");
  text.textContent = "Pokemon";
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Choose Pokemon for team slot ${slotIndex + 1}`);
  select.add(new Option("Choose a Pokemon...", ""));
  pokemonOptions.forEach((pokemon) => {
    select.add(
      new Option(
        `No. ${String(pokemon.number).padStart(3, "0")} - ${pokemon.name.replaceAll("_", " ")}`,
        pokemon.number,
      ),
    );
  });
  select.value = selectedNumber || "";
  select.addEventListener("change", () => setTeamPokemon(slotIndex, Number(select.value)));
  label.append(text, select);
  return label;
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
      <p>Pokemon details, compatible moves, and evolution choices will appear here.</p>
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
  card.append(identity);

  const stats = document.createElement("section");
  stats.className = "pokemon-stats team-card__stats";
  stats.setAttribute("aria-label", `${pokemon.name} base stats`);
  card.append(stats);
  renderPokemonStats(card, pokemon);

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

  const moves = document.createElement("div");
  moves.className = "team-card__moves";
  slot.moves.forEach((moveId, moveIndex) => {
    moves.append(createTeamMoveSlot(slotIndex, moveIndex, pokemon.number, moveId));
  });
  card.append(moves);
  return card;
}

function renderTeam() {
  const fragment = document.createDocumentFragment();
  state.team.forEach((slot, index) => fragment.append(renderTeamCard(slot, index)));
  elements.teamGrid.replaceChildren(fragment);
}

function renderPokemonCard(pokemon) {
  const card = elements.cardTemplate.content.firstElementChild.cloneNode(true);
  const caughtButton = card.querySelector(".caught-button");
  const sprite = card.querySelector(".pokemon-sprite");
  const region = card.querySelector(".region-badge");
  const note = card.querySelector(".pokemon-note");
  const caught = isCaught(pokemon);

  card.classList.toggle("is-caught", caught);
  card.dataset.number = pokemon.number;
  card.id = `pokemon-${pokemon.number}`;
  caughtButton.setAttribute("aria-pressed", String(caught));
  caughtButton.setAttribute("aria-label", `${caught ? "Mark uncaught" : "Mark caught"}: ${pokemon.name}`);
  caughtButton.querySelector(".caught-button__text").textContent = caught ? "Caught" : "Mark caught";
  caughtButton.addEventListener("click", () => toggleCaught(pokemon));

  sprite.src = pokemon.sprite;
  sprite.alt = `${pokemon.name}${pokemon.region ? ` (${pokemon.region})` : ""} sprite`;
  card.querySelector(".pokemon-number").textContent = `No. ${String(pokemon.number).padStart(3, "0")}`;
  card.querySelector(".pokemon-name").textContent = pokemon.name.replaceAll("_", " ");
  renderTypeBadges(card.querySelector(".pokemon-types"), pokemon.types);
  const encounterLocations = locationsForPokemon(pokemon);
  renderLocationLinks(
    card.querySelector(".pokemon-location"),
    encounterLocations,
    pokemon.availability === "Unobtainable" ? "Unobtainable" : "Evolve / special method",
  );
  const rarity = card.querySelector(".pokemon-rarity");
  rarity.textContent = pokemon.rarity || (pokemon.location ? "Not listed" : "N/A");
  rarity.dataset.rarity = pokemon.rarity;
  card.querySelector(".pokemon-bst").textContent = pokemon.bst || "N/A";
  renderPokemonStats(card, pokemon);
  renderTeamMatchups(card.querySelector(".team-matchups"), pokemon);

  if (pokemon.region) {
    region.hidden = false;
    region.textContent = pokemon.region;
  }

  if (pokemon.notes) {
    note.hidden = false;
    note.querySelector("p").textContent = pokemon.notes;
  }

  if (pokemon.evolvesFrom.length || pokemon.evolvesTo.length) {
    card.querySelector(".pokemon-evolutions").hidden = false;
    renderEvolutionLinks(card, pokemon.evolvesFrom, ".evolves-from");
    renderEvolutionLinks(card, pokemon.evolvesTo, ".evolves-to");
  }

  return card;
}

function filteredPokemon() {
  const f = state.filters;
  const rarityOrder = { Unique: 0, Rare: 1, Uncommon: 2, Common: 3, "": 4 };
  const search = f.search.toLowerCase();
  const result = data.dex.filter((pokemon) => {
    const encounterLocations = locationsForPokemon(pokemon);
    const relatedNames = [...pokemon.evolvesFrom, ...pokemon.evolvesTo]
      .map((number) => pokemonByNumber.get(number)?.name || "")
      .join(" ");
    const haystack = [
      pokemon.name,
      pokemon.region,
      encounterLocations.join(" "),
      pokemon.rarity,
      pokemon.notes,
      pokemon.types.join(" "),
      relatedNames,
    ]
      .join(" ")
      .toLowerCase();
    if (search && !haystack.includes(search)) return false;
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
      return (locationsForPokemon(a)[0] || "zzz").localeCompare(locationsForPokemon(b)[0] || "zzz") || a.number - b.number;
    }
    if (f.sort === "rarity") return rarityOrder[a.rarity] - rarityOrder[b.rarity] || a.number - b.number;
    return a.number - b.number;
  });
  return result;
}

function renderDex() {
  const pokemon = filteredPokemon();
  const fragment = document.createDocumentFragment();
  pokemon.forEach((entry) => fragment.append(renderPokemonCard(entry)));
  elements.grid.replaceChildren(fragment);
  elements.emptyState.hidden = pokemon.length !== 0;
  elements.resultCount.textContent =
    pokemon.length === data.dex.length
      ? `Showing all ${data.dex.length} Pokémon`
      : `Showing ${pokemon.length} of ${data.dex.length} Pokémon`;
}

function renderCollection() {
  const search = state.collectionSearch.toLowerCase();
  const pokemon = collectionDex.filter((entry) => {
    if (state.collectionStatus === "caught" && !isCaught(entry)) return false;
    if (state.collectionStatus === "missing" && isCaught(entry)) return false;
    if (!search) return true;
    return [entry.name, entry.region, locationsForPokemon(entry).join(" "), entry.types.join(" ")]
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
        <small>${entry.number ? `No. ${String(entry.number).padStart(3, "0")}` : "Pokerex wild entry"}</small>
        <strong>${entry.name.replaceAll("_", " ")}</strong>
        <span>${formatLocations(locationsForPokemon(entry), 1) || "Evolution / special"}</span>
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
  const result = moveData.moves.filter((move) => {
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
  if (resetLimit) state.moveLimit = 100;
  const moves = filteredMoves();
  const visible = moves.slice(0, state.moveLimit);
  const fragment = document.createDocumentFragment();
  visible.forEach((move) => fragment.append(renderMoveCard(move)));
  elements.moveList.replaceChildren(fragment);
  elements.moveEmptyState.hidden = moves.length !== 0;
  elements.showMoreMoves.hidden = visible.length === moves.length;
  elements.showMoreMoves.textContent = `Show more moves · ${moves.length - visible.length} remaining`;
  elements.moveResultCount.textContent =
    moves.length === moveData.moves.length
      ? `Showing ${visible.length} of all ${moveData.moves.length} moves`
      : `Showing ${visible.length} of ${moves.length} matching moves`;
}

function activateView(viewName) {
  document.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".guide-view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewName}`);
  });
  if (viewName === "caught") renderCollection();
  if (viewName === "moves") renderMoves();
  if (viewName === "team") renderTeam();
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
  encounters.locations
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
      const card = document.createElement("article");
      card.className = "location-card";
      card.dataset.location = location.name;
      card.innerHTML = `
        <div class="location-card__heading">
          <div>
            <span>${location.mapType || "wild area"}</span>
            <h3>${location.name}</h3>
          </div>
          <span>${caughtCount} / ${uniquePokemon.size} caught</span>
        </div>
        <div class="location-card__body">
          <a class="location-map" href="${location.map.fullImage}" target="_blank" rel="noreferrer">
            <img src="${location.map.thumbnail}" alt="${location.name} map" loading="lazy">
            <span>Open full map · ${location.map.width} × ${location.map.height}px</span>
          </a>
          <div class="encounter-methods"></div>
        </div>
        <a class="pokerex-map-link" href="${location.map.pokerexUrl}" target="_blank" rel="noreferrer">
          View this map on Pokerex
        </a>
      `;
      const methods = card.querySelector(".encounter-methods");
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
      fragment.append(card);
    });
  elements.locationList.replaceChildren(fragment);
}

function renderMegas() {
  elements.megaNote.textContent = data.sourceNotes.megas;
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

function renderItems() {
  const fragment = document.createDocumentFragment();
  data.importantItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";
    card.innerHTML = `
      <div><span>Item</span><h3>${item.name}</h3></div>
      <div><span>Function</span><p>${item.function}</p></div>
      <div><span>How to get it</span><p class="item-card__location">${item.location}</p></div>
    `;
    fragment.append(card);
  });
  elements.itemList.replaceChildren(fragment);
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
      renderDex();
    });
  });

  document.querySelector("#clear-filters").addEventListener("click", () => {
    resetDexFilters();
    renderDex();
  });

  elements.locationSearch.addEventListener("input", () => renderLocations(elements.locationSearch.value));
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
  elements.showMoreMoves.addEventListener("click", () => {
    state.moveLimit += 100;
    renderMoves();
  });
  document.querySelector("#clear-team").addEventListener("click", () => {
    if (
      !state.team.some((slot) => slot.pokemonNumber) ||
      !window.confirm("Clear all Pokemon and moves from your team?")
    ) {
      return;
    }
    state.team = Array.from({ length: 6 }, () => ({
      pokemonNumber: null,
      moves: [null, null, null, null],
    }));
    persistTeam();
    refreshTeamAndDex();
  });
  elements.collectionSearch.addEventListener("input", () => {
    state.collectionSearch = elements.collectionSearch.value;
    renderCollection();
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
  document.querySelector("#back-to-top").addEventListener("click", () => {
    document.querySelector("#top").scrollIntoView({ behavior: "smooth", block: "start" });
  });

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
}

initializeSummary();
setNotesHidden(state.notesHidden);
setTheme(state.theme);
bindControls();
updateProgress();
renderQuickLocations();
renderDex();
renderTeam();
renderMoves();
renderCollection();
renderLocations();
renderMegas();
renderItems();

const initialPokemonNumber = Number(location.hash.match(/^#pokemon-(\d+)$/)?.[1]);
if (initialPokemonNumber) focusPokemon(initialPokemonNumber);
