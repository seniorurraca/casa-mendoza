import { DEFAULT_FILTERS, applyFilters } from "./filters.js";
import { renderCard } from "./card.js";
import { formatUsd } from "./format.js";
import { load, save } from "./storage.js";

const FILTERS_KEY = "casa-mendoza:filters";
const FAVORITES_KEY = "casa-mendoza:favorites";
const PAGE_SIZE = 40;

const form = document.querySelector("#filters");
const list = document.querySelector("#list");
const summary = document.querySelector("#summary");
const moreButton = document.querySelector("#more");

let data = { listings: [] };
let filters = { ...DEFAULT_FILTERS, ...load(FILTERS_KEY, {}) };
let favorites = new Set(load(FAVORITES_KEY, []));
let visible = PAGE_SIZE;

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
  const departments = [...new Set(data.listings.map(l => l.department))].sort();
  form.department.insertAdjacentHTML("beforeend", departments.map(d => `<option>${d}</option>`).join(""));
}

function render() {
  const results = applyFilters(data.listings, filters, favorites);
  const credito = results.filter(l => l.features.credito).length;
  summary.textContent = `${results.length} resultados · ${credito} aptos crédito · ${data.stats.scanned} avisos revisados · dólar ${formatUsd(data.usdRate).replace("USD ", "$")} · actualizado ${new Date(data.generatedAt).toLocaleString("es-AR")}`;
  list.innerHTML = results.slice(0, visible).map(l => renderCard(l, favorites.has(l.id))).join("") ||
    `<p class="empty">Nada con estos filtros. Subí el precio máximo o sacá algún filtro.</p>`;
  moreButton.hidden = results.length <= visible;
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
  const id = event.target.closest("[data-fav]")?.dataset.fav;
  if (!id) return;
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  save(FAVORITES_KEY, [...favorites]);
  render();
});

moreButton.addEventListener("click", () => {
  visible += PAGE_SIZE;
  render();
});

data = await (await fetch("data/listings.json", { cache: "no-cache" })).json();
fillDepartments();
syncForm();
render();
