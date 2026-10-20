import { normalize } from "./text.js";
import { hasCoords, haversineKm } from "./geo.js";

export const DEFAULT_ZONE_PREFS = { disabled: [], custom: [], areas: [] };

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const customZone = (name, level) => ({ name: name.trim(), pattern: escapeRegex(normalize(name)), level, custom: true });

export const areaZone = (listing, radiusM) => ({
  id: `${listing.lat},${listing.lng},${radiusM}`,
  name: `${radiusM} m alrededor de ${listing.address}`,
  lat: listing.lat,
  lng: listing.lng,
  radiusM,
  level: "high",
});

function matcherOf(zone) {
  if (zone.radiusM) return l => hasCoords(l) && haversineKm(zone, l) * 1000 <= zone.radiusM;
  const regex = new RegExp(zone.pattern);
  return l => regex.test(l.locationText);
}

export const activeZones = (defaults, prefs) =>
  [...defaults.filter(z => !prefs.disabled.includes(z.name)), ...prefs.custom, ...prefs.areas]
    .map(z => ({ ...z, matches: matcherOf(z) }));

export const zoneFor = (listing, zones) => {
  const matches = zones.filter(z => z.matches(listing));
  return matches.find(z => z.level === "high") ?? matches[0] ?? null;
};

export const applyZones = (listings, zones, penalty) => listings.map(l => {
  const zone = zoneFor(l, zones);
  const penalized = zone?.level === "medium";
  return {
    ...l,
    zone,
    score: Math.max(0, l.baseScore + (penalized ? penalty : 0)),
    breakdown: penalized ? [...l.baseBreakdown, { label: `Zona: ${zone.name}`, pts: penalty }] : l.baseBreakdown,
  };
});

export const countMatches = (listings, zone) => listings.filter(matcherOf(zone)).length;
