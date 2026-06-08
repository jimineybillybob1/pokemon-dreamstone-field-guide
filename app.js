const data = window.DREAMSTONE_DATA;
const storageKey = "dreamstone-field-guide-caught";
const notesKey = "dreamstone-field-guide-notes-hidden";

const state = {
  caught: new Set(JSON.parse(localStorage.getItem(storageKey) || "[]")),
  notesHidden: localStorage.getItem(notesKey) !== "false",
  filters: {
    search: "",
    location: "",
    rarity: "",
    region: "",
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
  locationList: document.querySelector("#location-list"),
  locationSearch: document.querySelector("#location-search"),
  megaGrid: document.querySelector("#mega-grid"),
  megaNote: document.querySelector("#mega-note"),
  itemList: document.querySelector("#item-list"),
};

const uniqueSorted = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
const dexId = (pokemon) => String(pokemon.number);
const isCaught = (pokemon) => state.caught.has(dexId(pokemon));

function setSelectOptions(id, values) {
  const select = document.querySelector(id);
  values.forEach((value) => select.add(new Option(value, value)));
}

function initializeSummary() {
  const locations = uniqueSorted(
    data.dex.filter((pokemon) => pokemon.availability === "Available").map((pokemon) => pokemon.location),
  );
  document.querySelector("#available-count").textContent = data.dex.filter(
    (pokemon) => pokemon.availability === "Available",
  ).length;
  document.querySelector("#special-count").textContent = data.dex.filter(
    (pokemon) => pokemon.availability === "Evolution / special",
  ).length;
  document.querySelector("#unobtainable-count").textContent = data.dex.filter(
    (pokemon) => pokemon.availability === "Unobtainable",
  ).length;
  document.querySelector("#location-count").textContent = locations.length;

  setSelectOptions("#location-filter", locations);
  setSelectOptions("#rarity-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.rarity)));
  setSelectOptions("#region-filter", uniqueSorted(data.dex.map((pokemon) => pokemon.region)));
  setSelectOptions(
    "#availability-filter",
    uniqueSorted(data.dex.map((pokemon) => pokemon.availability)),
  );
}

function updateProgress() {
  const caughtCount = data.dex.filter(isCaught).length;
  const percent = Math.round((caughtCount / data.dex.length) * 100);
  elements.caughtCount.textContent = caughtCount;
  elements.totalCount.textContent = data.dex.length;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressBar.style.width = `${percent}%`;
  elements.progressBar.parentElement.setAttribute(
    "aria-label",
    `${caughtCount} of ${data.dex.length} Pokémon caught`,
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
  caughtButton.setAttribute("aria-pressed", String(caught));
  caughtButton.setAttribute("aria-label", `${caught ? "Mark uncaught" : "Mark caught"}: ${pokemon.name}`);
  caughtButton.querySelector(".caught-button__text").textContent = caught ? "Caught" : "Mark caught";
  caughtButton.addEventListener("click", () => toggleCaught(pokemon));

  sprite.src = pokemon.sprite;
  sprite.alt = `${pokemon.name}${pokemon.region ? ` (${pokemon.region})` : ""} sprite`;
  card.querySelector(".pokemon-number").textContent = `No. ${String(pokemon.number).padStart(3, "0")}`;
  card.querySelector(".pokemon-name").textContent = pokemon.name.replaceAll("_", " ");
  card.querySelector(".pokemon-location").textContent =
    pokemon.location || (pokemon.availability === "Unobtainable" ? "Unobtainable" : "Evolve / special method");
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

  return card;
}

function filteredPokemon() {
  const f = state.filters;
  const rarityOrder = { Unique: 0, Rare: 1, Uncommon: 2, Common: 3, "": 4 };
  const search = f.search.toLowerCase();
  const result = data.dex.filter((pokemon) => {
    const haystack = [pokemon.name, pokemon.region, pokemon.location, pokemon.rarity, pokemon.notes]
      .join(" ")
      .toLowerCase();
    if (search && !haystack.includes(search)) return false;
    if (f.location && pokemon.location !== f.location) return false;
    if (f.rarity && pokemon.rarity !== f.rarity) return false;
    if (f.region && pokemon.region !== f.region) return false;
    if (f.availability && pokemon.availability !== f.availability) return false;
    if (f.progress === "caught" && !isCaught(pokemon)) return false;
    if (f.progress === "uncaught" && isCaught(pokemon)) return false;
    return true;
  });

  result.sort((a, b) => {
    if (f.sort === "name") return a.name.localeCompare(b.name);
    if (f.sort === "location") return (a.location || "zzz").localeCompare(b.location || "zzz") || a.number - b.number;
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

function renderLocations(search = "") {
  const groups = new Map();
  const normalizedSearch = search.trim().toLowerCase();
  data.dex
    .filter((pokemon) => pokemon.availability === "Available")
    .forEach((pokemon) => {
      if (!groups.has(pokemon.location)) groups.set(pokemon.location, []);
      groups.get(pokemon.location).push(pokemon);
    });

  const fragment = document.createDocumentFragment();
  [...groups.entries()]
    .filter(([location]) => !normalizedSearch || location.toLowerCase().includes(normalizedSearch))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .forEach(([location, pokemon]) => {
      const card = document.createElement("article");
      card.className = "location-card";
      const caughtCount = pokemon.filter(isCaught).length;
      card.innerHTML = `
        <div class="location-card__heading">
          <h3>${location}</h3>
          <span>${caughtCount} / ${pokemon.length} caught</span>
        </div>
        <div class="location-card__pokemon"></div>
      `;
      const list = card.querySelector(".location-card__pokemon");
      pokemon
        .sort((a, b) => a.number - b.number)
        .forEach((entry) => {
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
              <span>${entry.rarity || "Rarity not listed"}${entry.region ? ` · ${entry.region}` : ""}</span>
            </span>
          `;
          button.addEventListener("click", () => toggleCaught(entry));
          list.append(button);
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

function bindControls() {
  const bindings = {
    "#search": "search",
    "#location-filter": "location",
    "#rarity-filter": "rarity",
    "#region-filter": "region",
    "#availability-filter": "availability",
    "#progress-filter": "progress",
    "#sort": "sort",
  };

  Object.entries(bindings).forEach(([selector, key]) => {
    const control = document.querySelector(selector);
    control.addEventListener("input", () => {
      state.filters[key] = control.value;
      renderDex();
    });
  });

  document.querySelector("#clear-filters").addEventListener("click", () => {
    document.querySelector("#filters").reset();
    Object.assign(state.filters, {
      search: "",
      location: "",
      rarity: "",
      region: "",
      availability: "",
      progress: "",
      sort: "number",
    });
    renderDex();
  });

  elements.locationSearch.addEventListener("input", () => renderLocations(elements.locationSearch.value));
  elements.spoilerToggle.addEventListener("click", () => setNotesHidden(!state.notesHidden));

  document.querySelector("#reset-progress").addEventListener("click", () => {
    if (!state.caught.size || !window.confirm("Clear all caught Pokémon from this guide?")) return;
    state.caught.clear();
    persistCaught();
    renderDex();
    renderLocations(elements.locationSearch.value);
  });

  document.querySelectorAll(".view-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".view-tab").forEach((button) => button.classList.remove("is-active"));
      document.querySelectorAll(".guide-view").forEach((view) => view.classList.remove("is-active"));
      tab.classList.add("is-active");
      document.querySelector(`#view-${tab.dataset.view}`).classList.add("is-active");
    });
  });
}

initializeSummary();
setNotesHidden(state.notesHidden);
bindControls();
updateProgress();
renderDex();
renderLocations();
renderMegas();
renderItems();
