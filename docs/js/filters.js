import { seenAt } from "./visits.js";

export const DEFAULT_FILTERS = {
  minUsd: 0,
  maxUsd: 62000,
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

export const sourcesOf = l => [l.source, ...(l.alsoOn ?? []).map(o => o.source)];

const matches = (l, f) =>
  l.zone?.level !== "high" &&
  l.usd >= f.minUsd &&
  l.usd <= f.maxUsd &&
  allows(f.types, l.type) &&
  allows(f.departments, l.department) &&
  allows(f.sources, ...sourcesOf(l)) &&
  (l.minutes === null || l.minutes <= f.maxMinutes) &&
  (!f.onlyCredito || l.features.credito) &&
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

const ADVANCED_FILTERS = ["minUsd", "sources", "maxMinutes", "onlyPatio", "hideSuspicious"];

const isActive = (value, fallback) => (Array.isArray(value) ? value.length > 0 : value !== fallback);

export const advancedCount = filters => ADVANCED_FILTERS.filter(key => isActive(filters[key], DEFAULT_FILTERS[key])).length;
