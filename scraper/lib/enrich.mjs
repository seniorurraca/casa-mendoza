import { detectFeatures } from "./text.mjs";
import { estimateMinutes } from "./geo.mjs";

export const pricePerM2 = listing => {
  const m2 = listing.type === "casa" ? listing.supC : listing.supT;
  return listing.usd && m2 > 0 ? Math.round(listing.usd / m2) : null;
};

export function enrich(listing, config) {
  const found = detectFeatures(listing.text, config.features);
  return {
    ...listing,
    features: {
      credito: listing.creditoFlag ?? (found.credito && !found.noCredito),
      patio: found.patio,
      cochera: found.cochera || listing.cocheraAttr,
      posesion: found.posesion,
      reciclar: found.reciclar,
    },
    minutes: estimateMinutes(listing, config.centro, config.minutesPerKm),
    ppm: pricePerM2(listing),
  };
}
