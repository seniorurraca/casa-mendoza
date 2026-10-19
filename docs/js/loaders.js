const photoCache = new Map();
let details = null;

async function loadDetails(id) {
  details ??= fetch("data/details.json").then(res => res.json()).catch(() => ({}));
  const entry = (await details)[id];
  return typeof entry === "string" ? { description: entry } : entry ?? {};
}

async function fetchApiPhotos(url) {
  try {
    const { fotos } = await (await fetch(url)).json();
    return fotos ?? [];
  } catch {
    return [];
  }
}

async function fetchPhotos(listing) {
  const photos = listing.photosApi ? await fetchApiPhotos(listing.photosApi) : (await loadDetails(listing.id)).photos ?? [];
  return photos.length ? photos : [listing.photo].filter(Boolean);
}

export function loadPhotos(listing) {
  if (!photoCache.has(listing.id)) photoCache.set(listing.id, fetchPhotos(listing));
  return photoCache.get(listing.id);
}

export const loadDescription = async id => (await loadDetails(id)).description ?? "";
