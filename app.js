const data = window.DREAMSTONE_DATA;
const encounters = window.DREAMSTONE_ENCOUNTERS;
const storageKey = "dreamstone-field-guide-caught";
const notesKey = "dreamstone-field-guide-notes-hidden";
const themeKey = "dreamstone-field-guide-theme";

const state = {
  caught: new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")),
  notesHidden: localStorage.getItem(notesKey) !== "false",
  theme: document.documentElement.dataset.theme || "light",
  collectionStatus: "all",
  collectionSearch: "",
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
  megaGrid: document.querySelector("#mega-grid"),
  megaNote: document.querySelector("#mega-note"),
  itemList: document.querySelector("#item-list"),
};

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
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
const locationsForPokemon = (pokemon) => {
  const pokerexLocations = uniqueSorted([
    ...(encounterLocationsByGuideNumber.get(pokemon.number) || []),
    ...(pokemon.locations || []),
  ]);
  return pokerexLocations.length ? pokerexLocations : uniqueSorted([pokemon.location]);
};
const directLocations = uniqueSorted(encounters.locations.map((location) => location.name));
const formatLocations = (locations, limit = 3) => {
  if (!locations.length) return "";
  const visible = locations.slice(0, limit).join(", ");
  return locations.length > limit ? `${visible} +${locations.length - limit} more` : visible;
};

function setSelectOptions(id, values) {
  const select = document.querySelector(id);
  values.forEach((value) => select.add(new Option(value, value)));
}

function initializeSummary() {
  document.querySelector("#available-count").textContent = encounters.encounterSpecies.length;
  document.querySelector("#special-count").textContent = collectionDex.length;
  document.querySelector("#unobtainable-count").textContent = data.dex.length;
  document.querySelector("#location-count").textContent = encounters.locations.length;

  setSelectOptions("#location-filter", directLocations);
  setSelectOptions("#rarity-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.rarity)));
  setSelectOptions("#region-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.region)));
  setSelectOptions("#type-filter", uniqueSorted(data.dex.flatMap((pokemon) => pokemon.types)));
  setSelectOptions(
    "#availability-filter",
    uniqueSorted(data.dex.map((pokemon) => pokemon.availability)),
  );
}

function renderQuickLocations() {
  const fragment = document.createDocumentFragment();
  ["", ...directLocations].forEach((location) => {
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
  card.querySelector(".pokemon-location").textContent =
    formatLocations(encounterLocations) ||
    (pokemon.availability === "Unobtainable" ? "Unobtainable" : "Evolve / special method");
  const rarity = card.querySelector(".pokemon-rarity");
  rarity.textContent = pokemon.rarity || (pokemon.location ? "Not listed" : "N/A");
  rarity.dataset.rarity = pokemon.rarity;

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

function activateView(viewName) {
  document.querySelectorAll(".view-tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });
  document.querySelectorAll(".guide-view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewName}`);
  });
  if (viewName === "caught") renderCollection();
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

function openCollectionEntry(entry) {
  if (entry.number) {
    focusPokemon(entry.number);
    return;
  }
  const location = entry.locations?.[0];
  if (!location) return;
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
renderCollection();
renderLocations();
renderMegas();
renderItems();

const initialPokemonNumber = Number(location.hash.match(/^#pokemon-(\d+)$/)?.[1]);
if (initialPokemonNumber) focusPokemon(initialPokemonNumber);
