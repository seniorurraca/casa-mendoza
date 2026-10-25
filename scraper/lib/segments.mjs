export const SEGMENTS = ["venta", "deptos", "alquiler"];

const RENT = "alquiler";

export const operationOf = segment => (segment === RENT ? RENT : "venta");

export function segmentOf(listing) {
  if (listing.operation === RENT) return RENT;
  return listing.type === "departamento" ? "deptos" : "venta";
}

export const replaceSegment = (existing, incoming, segment, keepSources = []) =>
  [...existing.filter(l => segmentOf(l) !== segment || keepSources.includes(l.source)), ...incoming];

export const marketKey = listing => (listing.operation === RENT ? `${RENT}-${listing.type}` : listing.type);

export const MARKET_KEYS = { venta: ["casa", "terreno"], deptos: ["departamento"], alquiler: ["alquiler-casa", "alquiler-departamento"] };
