const photoCache = new Map();
let descriptions = null;

async function fetchPhotos(listing) {
  const fallback = listing.photo ? [listing.photo] : [];
  try {
    const res = await fetch(listing.photosApi);
    const { fotos } = await res.json();
    return fotos?.length ? fotos : fallback;
  } catch {
    return fallback;
  }
}

export function loadPhotos(listing) {
  if (!photoCache.has(listing.id)) photoCache.set(listing.id, fetchPhotos(listing));
  return photoCache.get(listing.id);
}

export async function loadDescription(id) {
  descriptions ??= fetch("data/details.json").then(res => res.json()).catch(() => ({}));
  return (await descriptions)[id] ?? "";
}
