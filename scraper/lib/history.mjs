import { existsSync, readFileSync } from "node:fs";

const readJson = (path, fallback) => (existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : fallback);

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

export function withHistory(listing, previousById, today) {
  const before = previousById.get(listing.id);
  if (!before) return { ...listing, firstSeen: today, prevUsd: null };
  const prevUsd = before.usd !== listing.usd ? before.usd : before.prevUsd;
  return { ...listing, firstSeen: before.firstSeen, prevUsd };
}

export const upsert = (existing, incoming) => {
  const incomingIds = new Set(incoming.map(l => l.id));
  return [...existing.filter(l => !incomingIds.has(l.id)), ...incoming];
};
