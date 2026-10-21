import { usefulArea } from "./area.mjs";
import { marketKey } from "./segments.mjs";

export function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return Math.round(sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2);
}

const inSegment = (listing, range) =>
  listing.ppm && listing.usd >= range.minUsd && listing.usd <= range.maxUsd &&
  usefulArea(listing) >= range.minM2 && usefulArea(listing) <= range.maxM2;

const summarize = listings => ({ median: median(listings.map(l => l.ppm)), n: listings.length });

export function buildMarket(listings, segment, keys) {
  const market = {};
  for (const key of keys) {
    const comparable = listings.filter(l => marketKey(l) === key && inSegment(l, segment[key]));
    const byDepartment = Object.groupBy(comparable, l => l.department);
    market[key] = {
      overall: summarize(comparable),
      byDepartment: Object.fromEntries(Object.entries(byDepartment).map(([dep, ls]) => [dep, summarize(ls)])),
    };
  }
  return market;
}

export function zoneMedian(market, listing, minSamples) {
  const { overall, byDepartment } = market[marketKey(listing)] ?? { overall: {}, byDepartment: {} };
  const zone = byDepartment[listing.department];
  return zone && zone.n >= minSamples ? zone.median : overall.median;
}
