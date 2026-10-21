import { seenAt } from "./visits.js";

export const DEFAULT_FILTERS = {
  operation: "venta",
  minUsd: 0,
  maxUsd: 62000,
  minArs: 0,
  maxArs: 1000000,
  types: [],
  departments: [],
  sources: [],
  maxMinutes: 30,
  onlyCredito: false,
  onlyPatio: false,
  hideSuspicious: false,
  sort: "score",
};

const SORTERS = {
  score: (a, b) => b.score - a.score,
  price: (a, b) => a.usd - b.usd,
  discount: (a, b) => (b.discount ?? -1) - (a.discount ?? -1),
  newest: (a, b) => seenAt(b).localeCompare(seenAt(a)) || b.score - a.score,
};

const allows = (selected, ...values) => !selected.length || values.some(v => selected.includes(v));

const DEFAULT_TYPES = { venta: ["casa", "terreno"], alquiler: ["casa", "departamento"] };
const RENT = "alquiler";

export const operationOf = l => l.operation ?? "venta";

export const monthlyArs = (usd, usdRate) => Math.round((usd * usdRate) / 1000) * 1000;

const inPriceRange = (l, f) => (f.operation === RENT ? l.ars >= f.minArs && l.ars <= f.maxArs : l.usd >= f.minUsd && l.usd <= f.maxUsd);

const allowsType = (l, f) => (f.types.length ? f.types : DEFAULT_TYPES[f.operation]).includes(l.type);

export const sourcesOf = l => [l.source, ...(l.alsoOn ?? []).map(o => o.source)];

const matches = (l, f) =>
  l.zone?.level !== "high" &&
  operationOf(l) === f.operation &&
  inPriceRange(l, f) &&
  allowsType(l, f) &&
  allows(f.departments, l.department) &&
  allows(f.sources, ...sourcesOf(l)) &&
  (l.minutes === null || l.minutes <= f.maxMinutes) &&
  (!f.onlyCredito || f.operation === RENT || l.features.credito) &&
  (!f.onlyPatio || l.features.patio) &&
  (!f.hideSuspicious || !l.suspicious);

export const applyFilters = (listings, filters) =>
  listings.filter(l => matches(l, filters)).sort(SORTERS[filters.sort]);

export function favoriteListings(listings, favorites) {
  const byId = new Map(listings.map(l => [l.id, l]));
  const found = [...favorites].reverse().map(id => byId.get(id)).filter(Boolean);
  return { found, missing: favorites.size - found.length };
}

export function loadFilters(saved) {
  const known = Object.fromEntries(Object.entries(saved ?? {}).filter(([key]) => key in DEFAULT_FILTERS));
  return { ...DEFAULT_FILTERS, ...known };
}

const ADVANCED_FILTERS = ["minUsd", "minArs", "sources", "maxMinutes", "onlyPatio", "hideSuspicious"];

const isActive = (value, fallback) => (Array.isArray(value) ? value.length > 0 : value !== fallback);

export const advancedCount = filters => ADVANCED_FILTERS.filter(key => isActive(filters[key], DEFAULT_FILTERS[key])).length;
