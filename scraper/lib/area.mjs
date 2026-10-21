export function usefulArea(listing) {
  if (listing.type === "casa") return listing.supC;
  if (listing.type === "terreno") return listing.supT;
  return listing.supC ?? listing.supT;
}
