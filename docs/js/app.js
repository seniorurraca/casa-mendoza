import { DEFAULT_FILTERS, applyFilters, loadFilters, sourcesOf } from "./filters.js";
import { createMultiSelect } from "./multiselect.js";
import { renderCard } from "./card.js";
import { renderDetail, renderThumbs } from "./detail.js";
import { createCarousel } from "./carousel.js";
import { createSettings } from "./settings.js";
import { createRunsDialog } from "./runs-dialog.js";
import { DEFAULT_ZONE_PREFS, activeZones, applyZones } from "./zones.js";
import { loadDescription, loadPhotos } from "./loaders.js";
import { formatDateTime, formatUsd } from "./format.js";
import { SOURCE_LABEL, TYPE_LABEL, title } from "./listing-view.js";
import { load, save, storedValue } from "./storage.js";
import { markNew, newSince, startVisit } from "./visits.js";

const FILTERS_KEY = "casa-mendoza:filters";
const FAVORITES_KEY = "casa-mendoza:favorites";
const ZONES_KEY = "casa-mendoza:zones";
const VISIT_KEY = "casa-mendoza:last-visit";
const VISIT_SESSION_KEY = "casa-mendoza:visit-baseline";
const PAGE_SIZE = 40;

const form = document.querySelector("#filters");
const list = document.querySelector("#list");
const summary = document.querySelector("#summary");
const moreButton = document.querySelector("#more");
const newBanner = document.querySelector("#new-banner");
const detailDialog = document.querySelector("#detail");
const carousel = createCarousel(document.querySelector("#carousel"));

let data = { listings: [] };
let rawListings = [];
let listings = [];
let filters = loadFilters(load(FILTERS_KEY, {}));
let multiSelects = [];
let favorites = new Set(load(FAVORITES_KEY, []));
let zonePrefs = { ...DEFAULT_ZONE_PREFS, ...load(ZONES_KEY, {}) };
let visible = PAGE_SIZE;
const previousVisit = startVisit({ local: storedValue(VISIT_KEY), session: storedValue(VISIT_SESSION_KEY, "session") });

const byId = id => listings.find(l => l.id === id);
const fieldValue = el => (el.type === "checkbox" ? el.checked : el.type === "number" || el.type === "range" ? Number(el.value) : el.value);

function syncForm() {
  for (const el of form.elements) {
    if (!(el.name in filters) || Array.isArray(filters[el.name])) continue;
    if (el.type === "checkbox") el.checked = filters[el.name];
    else el.value = filters[el.name];
  }
  form.querySelector("#maxMinutes-out").textContent = `${filters.maxMinutes} min`;
}

function setFilters(next) {
  filters = next;
  save(FILTERS_KEY, filters);
  visible = PAGE_SIZE;
  syncForm();
  render();
}

const optionsFrom = (values, labels = {}) => [...new Set(values)].sort().map(value => ({ value, label: labels[value] ?? value }));

function createFilterSelects() {
  const specs = [
    ["types", "Tipo", optionsFrom(rawListings.map(l => l.type), TYPE_LABEL)],
    ["departments", "Departamento", optionsFrom(rawListings.map(l => l.department))],
    ["sources", "Portales", optionsFrom(rawListings.flatMap(sourcesOf), SOURCE_LABEL)],
  ];
  multiSelects = specs.map(([name, label, options]) => createMultiSelect(document.querySelector(`#${name}-select`), {
    name, label, options,
    getSelected: () => filters[name],
    onChange: selected => setFilters({ ...filters, [name]: selected }),
  }));
}

function recomputeZones() {
  listings = applyZones(rawListings, activeZones(data.dangerZones ?? [], zonePrefs), data.zonePenalty ?? 0);
}

function render() {
  const results = applyFilters(listings, filters, favorites);
  const credito = results.filter(l => l.features.credito).length;
  const hidden = listings.filter(l => l.zone?.level === "high").length;
  summary.textContent = `${results.length} resultados · ${credito} aptos crédito · ${hidden} ocultos por zona · ${data.stats.scanned} avisos revisados · dólar ${formatUsd(data.usdRate).replace("USD ", "$")} · actualizado ${formatDateTime(data.generatedAt)}`;
  list.innerHTML = results.slice(0, visible).map(l => renderCard(l, favorites.has(l.id))).join("") ||
    `<p class="empty">Nada con estos filtros. Subí el precio máximo o sacá algún filtro.</p>`;
  moreButton.hidden = results.length <= visible;
  renderNewBanner(results);
}

function renderNewBanner(results) {
  newBanner.hidden = !previousVisit;
  if (!previousVisit) return;
  const count = results.filter(l => l.isNew).length;
  const since = `desde tu última visita (${formatDateTime(previousVisit)})`;
  newBanner.textContent = count ? `${count} ${count === 1 ? "aviso nuevo" : "avisos nuevos"} ${since}` : `Sin avisos nuevos ${since}`;
  newBanner.classList.toggle("has-new", count > 0);
}

function toggleFavorite(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  save(FAVORITES_KEY, [...favorites]);
  render();
  if (detailDialog.open) openDetail(id);
}

async function openCarousel(listing, start = 0) {
  const photos = await loadPhotos(listing);
  if (!photos.length) return openDetail(listing.id);
  carousel.open(photos, start, title(listing));
}

async function openDetail(id) {
  const listing = byId(id);
  detailDialog.innerHTML = renderDetail(listing, favorites.has(id));
  if (!detailDialog.open) detailDialog.showModal();
  const [photos, description] = await Promise.all([loadPhotos(listing), loadDescription(id)]);
  if (detailDialog.querySelector(".detail")?.dataset.id !== id) return;
  detailDialog.querySelector(".thumbs").innerHTML = renderThumbs(photos);
  const text = detailDialog.querySelector(".description");
  text.textContent = description || "Sin descripción.";
  text.classList.remove("muted");
}

function selectThumb(index) {
  const main = detailDialog.querySelector(".gallery-main");
  const thumb = detailDialog.querySelector(`.thumb[data-index="${index}"]`);
  main.dataset.index = index;
  main.querySelector("img").src = thumb.querySelector("img").src;
  detailDialog.querySelectorAll(".thumb").forEach(t => t.classList.toggle("on", t === thumb));
}

form.addEventListener("input", event => {
  if (!event.target.name) return;
  setFilters({ ...filters, [event.target.name]: fieldValue(event.target) });
});

form.addEventListener("reset", event => {
  event.preventDefault();
  setFilters({ ...DEFAULT_FILTERS });
  multiSelects.forEach(m => m.render());
});

list.addEventListener("click", event => {
  const favId = event.target.closest("[data-fav]")?.dataset.fav;
  if (favId) return toggleFavorite(favId);
  const action = event.target.closest("[data-action]")?.dataset.action;
  const id = event.target.closest(".card")?.dataset.id;
  if (action === "carousel") openCarousel(byId(id));
  if (action === "detail") openDetail(id);
});

detailDialog.addEventListener("click", event => {
  const favId = event.target.closest("[data-fav]")?.dataset.fav;
  if (favId) return toggleFavorite(favId);
  const target = event.target.closest("[data-action]");
  const id = detailDialog.querySelector(".detail")?.dataset.id;
  if (target?.dataset.action === "thumb") selectThumb(target.dataset.index);
  if (target?.dataset.action === "gallery-open") openCarousel(byId(id), Number(target.dataset.index));
  if (target?.dataset.action === "close" || event.target === detailDialog) detailDialog.close();
});

moreButton.addEventListener("click", () => {
  visible += PAGE_SIZE;
  render();
});

const fetchJson = url => fetch(url, { cache: "no-cache" }).then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status} ${url}`))));

const runs = await fetchJson("data/runs.json").catch(() => []);
createRunsDialog(document.querySelector("#runs"), document.querySelector("#open-runs"), runs);

data = await fetchJson("data/listings.json");
rawListings = markNew(data.listings, newSince(previousVisit)).map(l => ({ ...l, baseScore: l.score, baseBreakdown: l.breakdown }));
recomputeZones();

const settings = createSettings(document.querySelector("#settings"), {
  defaults: data.dangerZones ?? [],
  getListings: () => rawListings,
  getPrefs: () => zonePrefs,
  onChange: prefs => {
    zonePrefs = prefs;
    save(ZONES_KEY, zonePrefs);
    recomputeZones();
    render();
  },
});
document.querySelector("#open-settings").addEventListener("click", () => settings.open());

createFilterSelects();
syncForm();
render();
