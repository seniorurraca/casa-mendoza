import { detectFeatures } from "./text.mjs";
import { estimateMinutes } from "./geo.mjs";
import { usefulArea } from "./area.mjs";
import { departmentAt, isPlaceholder } from "./departments.mjs";

export const pricePerM2 = listing => {
  const m2 = usefulArea(listing);
  return listing.usd && m2 > 0 ? Math.round(listing.usd / m2) : null;
};

function locate(listing, config) {
  if (isPlaceholder(listing, config.placeholderCoords)) return { ...listing, lat: null, lng: null };
  return { ...listing, department: departmentAt(listing) ?? listing.department };
}

export function enrich(scraped, config) {
  const listing = locate(scraped, config);
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
