import { normalize } from "./text.js";

export const DEFAULT_ZONE_PREFS = { disabled: [], custom: [] };

const escapeRegex = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const customZone = (name, level) => ({ name: name.trim(), pattern: escapeRegex(normalize(name)), level, custom: true });

export const activeZones = (defaults, prefs) =>
  [...defaults.filter(z => !prefs.disabled.includes(z.name)), ...prefs.custom]
    .map(z => ({ ...z, regex: new RegExp(z.pattern) }));

export const zoneFor = (listing, zones) => {
  const matches = zones.filter(z => z.regex.test(listing.locationText));
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

export const countMatches = (listings, zone) => {
  const regex = new RegExp(zone.pattern);
  return listings.filter(l => regex.test(l.locationText)).length;
};
