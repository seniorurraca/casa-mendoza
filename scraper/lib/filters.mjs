import { normalize } from "./text.mjs";

export const AREA_RULES = [
  ["sin precio", (l) => !l.usd],
  ["fuera de Gran Mendoza", (l, c) => !c.departments.map(normalize).includes(normalize(l.department))],
  ["lejos del centro", (l, c) => l.minutes !== null && l.minutes > c.maxMinutes],
  ["zona peligrosa", (l) => l.risk === "high"],
];

export const OFFER_RULES = [
  ["precio alto", (l, c) => l.usd > c.maxUsdStored],
  ["terreno caro", (l, c) => l.type === "terreno" && l.usd > c.terreno.maxUsd],
  ["terreno chico", (l, c) => l.type === "terreno" && !(l.supT >= c.terreno.minM2)],
];

export const discardReason = (listing, config, rules) => rules.find(([, rule]) => rule(listing, config))?.[0] ?? null;

export function partition(listings, config, rules) {
  const kept = [];
  const discarded = {};
  for (const listing of listings) {
    const reason = discardReason(listing, config, rules);
    if (reason) discarded[reason] = (discarded[reason] ?? 0) + 1;
    else kept.push(listing);
  }
  return { kept, discarded };
}
