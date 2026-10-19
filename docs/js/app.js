import { DEFAULT_FILTERS, applyFilters } from "./filters.js";
import { renderCard } from "./card.js";
import { renderDetail, renderThumbs } from "./detail.js";
import { createCarousel } from "./carousel.js";
import { createSettings } from "./settings.js";
import { DEFAULT_ZONE_PREFS, activeZones, applyZones } from "./zones.js";
import { loadDescription, loadPhotos } from "./loaders.js";
import { formatUsd } from "./format.js";
import { title } from "./listing-view.js";
import { load, save } from "./storage.js";

const FILTERS_KEY = "casa-mendoza:filters";
const FAVORITES_KEY = "casa-mendoza:favorites";
const ZONES_KEY = "casa-mendoza:zones";
const PAGE_SIZE = 40;

const form = document.querySelector("#filters");
const list = document.querySelector("#list");
const summary = document.querySelector("#summary");
const moreButton = document.querySelector("#more");
const detailDialog = document.querySelector("#detail");
const carousel = createCarousel(document.querySelector("#carousel"));

let data = { listings: [] };
let rawListings = [];
let listings = [];
let filters = { ...DEFAULT_FILTERS, ...load(FILTERS_KEY, {}) };
let favorites = new Set(load(FAVORITES_KEY, []));
let zonePrefs = { ...DEFAULT_ZONE_PREFS, ...load(ZONES_KEY, {}) };
let visible = PAGE_SIZE;

const byId = id => listings.find(l => l.id === id);
const fieldValue = el => (el.type === "checkbox" ? el.checked : el.type === "number" || el.type === "range" ? Number(el.value) : el.value);

function syncForm() {
  for (const el of form.elements) {
    if (!(el.name in filters)) continue;
    if (el.type === "checkbox") el.checked = filters[el.name];
    else el.value = filters[el.name];
  }
  form.querySelector("#maxMinutes-out").textContent = `${filters.maxMinutes} min`;
}

function fillDepartments() {
  const departments = [...new Set(rawListings.map(l => l.department))].sort();
  form.department.insertAdjacentHTML("beforeend", departments.map(d => `<option>${d}</option>`).join(""));
}

function recomputeZones() {
  listings = applyZones(rawListings, activeZones(data.dangerZones ?? [], zonePrefs), data.zonePenalty ?? 0);
}

function render() {
  const results = applyFilters(listings, filters, favorites);
  const credito = results.filter(l => l.features.credito).length;
  const hidden = listings.filter(l => l.zone?.level === "high").length;
  summary.textContent = `${results.length} resultados · ${credito} aptos crédito · ${hidden} ocultos por zona · ${data.stats.scanned} avisos revisados · dólar ${formatUsd(data.usdRate).replace("USD ", "$")} · actualizado ${new Date(data.generatedAt).toLocaleString("es-AR")}`;
  list.innerHTML = results.slice(0, visible).map(l => renderCard(l, favorites.has(l.id))).join("") ||
    `<p class="empty">Nada con estos filtros. Subí el precio máximo o sacá algún filtro.</p>`;
  moreButton.hidden = results.length <= visible;
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
  filters = { ...filters, [event.target.name]: fieldValue(event.target) };
  save(FILTERS_KEY, filters);
  visible = PAGE_SIZE;
  syncForm();
  render();
});

form.addEventListener("reset", event => {
  event.preventDefault();
  filters = { ...DEFAULT_FILTERS };
  save(FILTERS_KEY, filters);
  syncForm();
  render();
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

data = await (await fetch("data/listings.json", { cache: "no-cache" })).json();
rawListings = data.listings.map(l => ({ ...l, baseScore: l.score, baseBreakdown: l.breakdown }));
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

fillDepartments();
syncForm();
render();
