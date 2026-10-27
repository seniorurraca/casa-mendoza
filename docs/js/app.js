import { DEFAULT_FILTERS, advancedCount, applyFilters, favoriteListings, loadFilters, monthlyArs, operationOf, sourcesOf } from "./filters.js";
import { createMultiSelect } from "./multiselect.js";
import { renderCard } from "./card.js";
import { renderDetail, renderThumbs } from "./detail.js";
import { createCarousel } from "./carousel.js";
import { createSettings } from "./settings.js";
import { createRunsDialog } from "./runs-dialog.js";
import { createAccount } from "./account.js";
import { ADMIN_EMAILS, FAVORITES_API } from "./account-config.js";
import { tokenClaims } from "./google-token.js";
import { createThemePicker } from "./theme.js";
import { favoritesApi } from "./favorites-api.js";
import { DEFAULT_ZONE_PREFS, activeZones, applyZones, areaZone, countMatches } from "./zones.js";
import { loadDescription, loadPhotos } from "./loaders.js";
import { formatDateTime, formatUsd } from "./format.js";
import { SOURCE_LABEL, title } from "./listing-view.js";
import { fillIcons } from "./icons.js";
import { load, save } from "./storage.js";

const FILTERS_KEY = "casa-mendoza:filters";
const FAVORITES_KEY = "casa-mendoza:favorites";
const ZONES_KEY = "casa-mendoza:zones";
const PAGE_SIZE = 40;

const form = document.querySelector("#filters");
const list = document.querySelector("#list");
const summary = document.querySelector("#summary");
const moreButton = document.querySelector("#more");
const newBanner = document.querySelector("#new-banner");
const tabs = document.querySelectorAll(".tab");
const favCount = document.querySelector("#fav-count");
const allCount = document.querySelector("#all-count");
const listNote = document.querySelector("#list-note");
const moreFilters = document.querySelector(".more-filters");
const moreCount = document.querySelector("#more-count");
const sortField = document.querySelector(".sort");
const detailDialog = document.querySelector("#detail");
const runsButton = document.querySelector("#open-runs");
const carousel = createCarousel(document.querySelector("#carousel"));

let data = { listings: [] };
let rawListings = [];
let listings = [];
let filters = loadFilters(load(FILTERS_KEY, {}));
let multiSelects = [];
let favorites = new Set(load(FAVORITES_KEY, []));
let zonePrefs = { ...DEFAULT_ZONE_PREFS, ...load(ZONES_KEY, {}) };
let visible = PAGE_SIZE;
let tab = "all";
let remoteFavorites = null;

const byId = id => listings.find(l => l.id === id);
const fieldValue = el => (el.type === "checkbox" ? el.checked : el.type === "number" || el.type === "range" ? Number(el.value) : el.value);

const typeChoice = types => (types.length === 1 ? types[0] : "");

function syncForm() {
  for (const el of form.elements) {
    if (el.name === "typeChoice") el.checked = el.value === typeChoice(filters.types);
    if (!(el.name in filters) || Array.isArray(filters[el.name])) continue;
    if (el.type === "checkbox") el.checked = filters[el.name];
    else if (el.type === "radio") el.checked = el.value === filters[el.name];
    else el.value = filters[el.name];
  }
  form.dataset.operation = filters.operation;
  form.querySelector("#maxMinutes-out").textContent = `${filters.maxMinutes} min`;
  const advanced = advancedCount(filters);
  moreCount.textContent = advanced;
  moreCount.hidden = !advanced;
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
    ["departments", "Departamento", optionsFrom(rawListings.map(l => l.department)), "Todos los departamentos"],
    ["sources", "Portales", optionsFrom(rawListings.flatMap(sourcesOf), SOURCE_LABEL)],
  ];
  multiSelects = specs.map(([name, label, options, allLabel]) => createMultiSelect(document.querySelector(`#${name}-select`), {
    name, label, options, allLabel,
    getSelected: () => filters[name],
    onChange: selected => setFilters({ ...filters, [name]: selected }),
  }));
}

function updateZonePrefs(prefs) {
  zonePrefs = prefs;
  save(ZONES_KEY, zonePrefs);
  recomputeZones();
  render();
}

function ignoreArea(listing, radiusM) {
  const zone = areaZone(listing, radiusM);
  const count = countMatches(rawListings, zone);
  if (!confirm(`Se van a ocultar ${count} ${count === 1 ? "aviso" : "avisos"} a menos de ${radiusM} m de ${listing.address}. Lo podés deshacer en ⚙ Configuración.`)) return;
  updateZonePrefs({ ...zonePrefs, areas: [...zonePrefs.areas.filter(a => a.id !== zone.id), zone] });
}

function recomputeZones() {
  listings = applyZones(rawListings, activeZones(data.dangerZones ?? [], zonePrefs), data.zonePenalty ?? 0);
}

const formatCount = n => n.toLocaleString("es-AR");

function summaryText() {
  const hidden = listings.filter(l => l.zone?.level === "high").length;
  return `${formatCount(data.stats.scanned)} avisos revisados · ${hidden} ocultos por zona · dólar ${formatUsd(data.usdRate).replace("USD ", "$")} · actualizado ${formatDateTime(data.generatedAt)}`;
}

function favoriteResults() {
  const { found, missing } = favoriteListings(listings, favorites);
  const note = missing ? `${missing} ${missing === 1 ? "favorito ya no está publicado" : "favoritos ya no están publicados"}.` : "";
  return { results: found, note, empty: "Todavía no guardaste favoritos. Tocá el corazón de un aviso." };
}

function renderTabs(searchCount) {
  tabs.forEach(button => {
    const selected = button.dataset.tab === tab;
    button.classList.toggle("on", selected);
    button.setAttribute("aria-selected", selected);
  });
  allCount.textContent = formatCount(searchCount);
  favCount.textContent = favorites.size || "";
  form.hidden = tab === "favorites";
  sortField.hidden = tab === "favorites";
}

function render() {
  const search = applyFilters(listings, filters);
  const { results, note, empty } = tab === "favorites" ? favoriteResults()
    : { results: search, note: "", empty: "Nada con estos filtros. Subí el precio máximo o sacá algún filtro." };
  renderTabs(search.length);
  summary.textContent = summaryText();
  listNote.textContent = note;
  listNote.hidden = !note;
  list.innerHTML = results.slice(0, visible).map(l => renderCard(l, favorites.has(l.id))).join("") || `<p class="empty">${empty}</p>`;
  moreButton.hidden = results.length <= visible;
  renderNewBanner(results);
}

function renderNewBanner(results) {
  const count = results.filter(l => l.isNew).length;
  newBanner.textContent = count ? `${count} ${count === 1 ? "aviso nuevo" : "avisos nuevos"} hoy` : "Sin avisos nuevos hoy";
  newBanner.title = "Nuevo = no estaba en la corrida completa anterior. Deja de serlo en la próxima corrida diaria (06:00).";
  newBanner.classList.toggle("has-new", count > 0);
}

function showFavorites(next, id) {
  favorites = next;
  render();
  if (id && detailDialog.open) openDetail(id);
}

async function toggleFavorite(id) {
  const adding = !favorites.has(id);
  const before = new Set(favorites);
  const next = new Set(favorites);
  adding ? next.add(id) : next.delete(id);
  showFavorites(next, id);
  if (!remoteFavorites) return save(FAVORITES_KEY, [...favorites]);
  try {
    await (adding ? remoteFavorites.add(id) : remoteFavorites.remove(id));
  } catch {
    showFavorites(before, id);
    alert("No se pudo guardar el favorito. Si sigue fallando, salí y volvé a entrar con Google.");
  }
}

async function useAccount(token) {
  runsButton.hidden = !ADMIN_EMAILS.includes(tokenClaims(token).email);
  const api = favoritesApi(FAVORITES_API, token);
  try {
    const ids = await api.merge(load(FAVORITES_KEY, []));
    save(FAVORITES_KEY, []);
    remoteFavorites = api;
    showFavorites(new Set(ids));
  } catch {
    account.logout();
    alert("No se pudieron cargar tus favoritos. Probá entrar de nuevo.");
  }
}

function useGuest() {
  runsButton.hidden = true;
  remoteFavorites = null;
  showFavorites(new Set(load(FAVORITES_KEY, [])));
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

document.addEventListener("input", event => {
  const { name, form: owner, value } = event.target;
  if (owner !== form || !name) return;
  if (name === "typeChoice") return setFilters({ ...filters, types: value ? [value] : [] });
  if (name === "operation") return setFilters({ ...filters, operation: value, types: [] });
  setFilters({ ...filters, [name]: fieldValue(event.target) });
});

document.addEventListener("click", event => {
  if (moreFilters.open && !moreFilters.contains(event.target)) moreFilters.open = false;
  document.querySelectorAll(".ignore-menu[open]").forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
});

form.addEventListener("reset", event => {
  event.preventDefault();
  setFilters({ ...DEFAULT_FILTERS });
  multiSelects.forEach(m => m.render());
});

list.addEventListener("click", event => {
  const favId = event.target.closest("[data-fav]")?.dataset.fav;
  if (favId) return toggleFavorite(favId);
  if (event.target.closest("a")) return;
  const radius = event.target.closest("[data-ignore-radius]")?.dataset.ignoreRadius;
  const menu = event.target.closest(".ignore-menu");
  if (radius) menu.open = false;
  if (radius) return ignoreArea(byId(event.target.closest(".card").dataset.id), Number(radius));
  if (menu) return;
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

tabs.forEach(button => button.addEventListener("click", () => {
  tab = button.dataset.tab;
  visible = PAGE_SIZE;
  render();
}));

moreButton.addEventListener("click", () => {
  visible += PAGE_SIZE;
  render();
});

fillIcons(document);
createThemePicker(document.querySelector("#theme-picker"));

const fetchJson = url => fetch(url, { cache: "no-cache" }).then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status} ${url}`))));

const runs = await fetchJson("data/runs.json").catch(() => []);
createRunsDialog(document.querySelector("#runs"), runsButton, runs);

data = await fetchJson("data/listings.json");
rawListings = data.listings.map(l => ({
  ...l,
  ars: operationOf(l) === "alquiler" ? monthlyArs(l.usd, data.usdRate) : null,
  baseScore: l.score,
  baseBreakdown: l.breakdown,
}));
recomputeZones();

const settings = createSettings(document.querySelector("#settings"), {
  defaults: data.dangerZones ?? [],
  getListings: () => rawListings,
  getPrefs: () => zonePrefs,
  onChange: updateZonePrefs,
});
document.querySelector("#open-settings").addEventListener("click", () => settings.open());

createFilterSelects();
syncForm();
render();
const account = createAccount(document.querySelector("#account"), { onLogin: useAccount, onLogout: useGuest });
