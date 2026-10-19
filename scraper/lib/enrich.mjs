import { detectFeatures, matchesAny } from "./text.mjs";
import { estimateMinutes } from "./geo.mjs";

export function zoneRisk(locationText, dangerZones) {
  if (matchesAny(locationText, dangerZones.high)) return "high";
  if (matchesAny(locationText, dangerZones.medium)) return "medium";
  return null;
}

export const pricePerM2 = listing => {
  const m2 = listing.type === "casa" ? listing.supC : listing.supT;
  return listing.usd && m2 > 0 ? Math.round(listing.usd / m2) : null;
};

export function enrich(listing, config) {
  const found = detectFeatures(listing.text, config.features);
  return {
    ...listing,
    features: {
      credito: found.credito && !found.noCredito,
      patio: found.patio,
      cochera: found.cochera || listing.cocheraAttr,
      posesion: found.posesion,
      reciclar: found.reciclar,
    },
    minutes: estimateMinutes(listing, config.centro, config.minutesPerKm),
    risk: zoneRisk(listing.locationText, config.dangerZones),
    ppm: pricePerM2(listing),
  };
}
