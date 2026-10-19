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
  onlyFavorites: false,
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

const matches = (l, f, favorites) =>
  l.zone?.level !== "high" &&
  l.usd >= f.minUsd &&
  l.usd <= f.maxUsd &&
  allows(f.types, l.type) &&
  allows(f.departments, l.department) &&
  allows(f.sources, ...sourcesOf(l)) &&
  (l.minutes === null || l.minutes <= f.maxMinutes) &&
  (!f.onlyCredito || l.features.credito) &&
  (!f.onlyPatio || l.features.patio) &&
  (!f.hideSuspicious || !l.suspicious) &&
  (!f.onlyFavorites || favorites.has(l.id));

export const applyFilters = (listings, filters, favorites = new Set()) =>
  listings.filter(l => matches(l, filters, favorites)).sort(SORTERS[filters.sort]);

export function loadFilters(saved) {
  const known = Object.fromEntries(Object.entries(saved ?? {}).filter(([key]) => key in DEFAULT_FILTERS));
  return { ...DEFAULT_FILTERS, ...known };
}
