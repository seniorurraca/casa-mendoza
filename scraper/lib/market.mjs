export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

const m2Of = listing => (listing.type === "casa" ? listing.supC : listing.supT);

const inSegment = (listing, range) =>
  listing.ppm && listing.usd >= range.minUsd && listing.usd <= range.maxUsd &&
  m2Of(listing) >= range.minM2 && m2Of(listing) <= range.maxM2;

const summarize = listings => ({ median: median(listings.map(l => l.ppm)), n: listings.length });

export function buildMarket(listings, segment) {
  const market = {};
  for (const type of ["casa", "terreno"]) {
    const comparable = listings.filter(l => l.type === type && inSegment(l, segment[type]));
    const byDepartment = Object.groupBy(comparable, l => l.department);
    market[type] = {
      overall: summarize(comparable),
      byDepartment: Object.fromEntries(Object.entries(byDepartment).map(([dep, ls]) => [dep, summarize(ls)])),
    };
  }
  return market;
}

export function zoneMedian(market, listing, minSamples) {
  const { overall, byDepartment } = market[listing.type];
  const zone = byDepartment[listing.department];
  return zone && zone.n >= minSamples ? zone.median : overall.median;
}
