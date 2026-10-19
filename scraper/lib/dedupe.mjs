import { hasCoords, haversineKm } from "./geo.mjs";

const PRICE_TOLERANCE = 0.02;
const AREA_TOLERANCE = 0.1;
const MAX_DISTANCE_KM = 0.2;

const close = (a, b, tolerance) => Math.abs(a - b) <= tolerance * Math.max(a, b);
const areaOf = l => (l.type === "casa" ? l.supC : l.supT);

export const isSameProperty = (a, b) =>
  a.source !== b.source &&
  a.type === b.type &&
  close(a.usd, b.usd, PRICE_TOLERANCE) &&
  hasCoords(a) && hasCoords(b) && haversineKm(a, b) <= MAX_DISTANCE_KM &&
  (!areaOf(a) || !areaOf(b) || close(areaOf(a), areaOf(b), AREA_TOLERANCE));

const richness = l => (l.photos?.length ?? 0) * 1000 + (l.description?.length ?? 0);

function merge(group) {
  const [best, ...others] = [...group].sort((a, b) => richness(b) - richness(a));
  return { ...best, alsoOn: others.map(o => ({ source: o.source, url: o.url })) };
}

export function dedupe(listings) {
  const sorted = [...listings].sort((a, b) => a.usd - b.usd);
  const groupOf = new Map();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length && close(sorted[i].usd, sorted[j].usd, PRICE_TOLERANCE); j++) {
      if (groupOf.has(sorted[j]) || !isSameProperty(sorted[i], sorted[j])) continue;
      const group = groupOf.get(sorted[i]) ?? [sorted[i]];
      group.push(sorted[j]);
      groupOf.set(sorted[i], group).set(sorted[j], group);
    }
  }
  const seen = new Set();
  return sorted.flatMap(l => {
    const group = groupOf.get(l);
    if (!group) return [{ ...l, alsoOn: [] }];
    if (seen.has(group)) return [];
    seen.add(group);
    return [merge(group)];
  });
}
