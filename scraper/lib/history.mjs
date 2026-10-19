import { existsSync, readFileSync } from "node:fs";

export function readPrevious(path) {
  if (!existsSync(path)) return new Map();
  const { listings } = JSON.parse(readFileSync(path, "utf8"));
  return new Map(listings.map(l => [l.id, l]));
}

export function withHistory(listing, previous, today) {
  const before = previous.get(listing.id);
  if (!before) return { ...listing, firstSeen: today, prevUsd: null };
  const prevUsd = before.usd !== listing.usd ? before.usd : before.prevUsd;
  return { ...listing, firstSeen: before.firstSeen, prevUsd };
}
