const SEARCH_URL = "https://www.google.com/maps/search/?api=1&query=";

const hasCoords = l => Number.isFinite(l.lat) && Number.isFinite(l.lng) && l.lat !== 0 && l.lng !== 0;

export const mapsUrl = listing => SEARCH_URL + encodeURIComponent(
  hasCoords(listing) ? `${listing.lat},${listing.lng}` : `${listing.address}, ${listing.department}, Mendoza, Argentina`,
);
