export const DEFAULT_FILTERS = {
  minUsd: 0,
  maxUsd: 62000,
  type: "",
  department: "",
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
  newest: (a, b) => b.firstSeen.localeCompare(a.firstSeen) || b.score - a.score,
};

const matches = (l, f, favorites) =>
  l.usd >= f.minUsd &&
  l.usd <= f.maxUsd &&
  (!f.type || l.type === f.type) &&
  (!f.department || l.department === f.department) &&
  (l.minutes === null || l.minutes <= f.maxMinutes) &&
  (!f.onlyCredito || l.features.credito) &&
  (!f.onlyPatio || l.features.patio) &&
  (!f.hideSuspicious || !l.suspicious) &&
  (!f.onlyFavorites || favorites.has(l.id));

export const applyFilters = (listings, filters, favorites = new Set()) =>
  listings.filter(l => matches(l, filters, favorites)).sort(SORTERS[filters.sort]);
