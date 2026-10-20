import { readJson } from "./files.mjs";

const detailOf = entry => (typeof entry === "string" ? { description: entry, photos: [] } : entry ?? { description: "", photos: [] });

export function readPrevious(outputPath, detailsPath) {
  const data = readJson(outputPath, { listings: [] });
  const details = readJson(detailsPath, {});
  return {
    data,
    byId: new Map(data.listings.map(l => [l.id, l])),
    hydrated: data.listings.map(l => ({ ...l, ...detailOf(details[l.id]) })),
  };
}

const legacySeenAt = l => l.firstSeenAt ?? `${l.firstSeen}T00:00:00.000Z`;

export function registerSeen(seen, previousListings, scraped, now) {
  const next = { ...seen };
  for (const l of previousListings) next[l.id] ??= legacySeenAt(l);
  for (const l of scraped) next[l.id] ??= now;
  return next;
}

export function withHistory(listing, previousById, seen) {
  const before = previousById.get(listing.id);
  const firstSeenAt = seen[listing.id];
  const prevUsd = !before ? null : before.usd !== listing.usd ? before.usd : before.prevUsd;
  return { ...listing, firstSeen: firstSeenAt.slice(0, 10), firstSeenAt, prevUsd };
}

export const upsert = (existing, incoming) => {
  const incomingIds = new Set(incoming.map(l => l.id));
  return [...existing.filter(l => !incomingIds.has(l.id)), ...incoming];
};
