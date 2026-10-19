import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import * as inmoclick from "./sources/inmoclick.mjs";
import * as inmoup from "./sources/inmoup.mjs";
import { getUsdRate } from "./lib/currency.mjs";
import { enrich } from "./lib/enrich.mjs";
import { AREA_RULES, OFFER_RULES, partition } from "./lib/filters.mjs";
import { buildMarket, zoneMedian } from "./lib/market.mjs";
import { scoreListing } from "./lib/score.mjs";
import { readPrevious, upsert, withHistory } from "./lib/history.mjs";
import { dedupe } from "./lib/dedupe.mjs";
import { sourcesFor } from "./lib/sources.mjs";

const SOURCES = { inmoclick, inmoup };

const PUBLIC_FIELDS = ["id", "source", "type", "url", "photo", "photosApi", "photoCount", "usd", "priceRaw", "supT", "supC", "dorm", "banos",
  "lat", "lng", "department", "address", "locationText", "publishedAt", "agency", "features", "minutes", "ppm", "alsoOn"];

const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k]]));
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value));

const { values: args } = parseArgs({ options: { "max-pages": { type: "string" }, mode: { type: "string", default: "full" } } });
const mode = args.mode;
const config = JSON.parse(readFileSync("config.json", "utf8"));
const detailsPath = join(dirname(config.output), "details.json");
const now = new Date().toISOString();
const today = now.slice(0, 10);

const usdRate = await getUsdRate(config.usdRate);
const scraped = [];
for (const [name, options] of sourcesFor(config.sources, mode)) {
  const maxPages = Number(args["max-pages"] ?? options.maxPages);
  scraped.push(...(await SOURCES[name].fetchAll({ ...options, maxPages, usdRate })).map(l => enrich(l, config)));
}

const previous = readPrevious(config.output, detailsPath);
const area = partition(scraped, config, AREA_RULES);
const pool = mode === "full" ? area.kept : upsert(previous.hydrated, area.kept);
const unique = dedupe(pool);
const market = mode === "full" ? buildMarket(unique, config.segment) : previous.data.market;
const offer = partition(unique, config, OFFER_RULES);

const listings = offer.kept
  .map(l => ({ ...pick(l, PUBLIC_FIELDS), ...scoreListing(l, zoneMedian(market, l, config.segment.minSamples), config.scoring, config.maxMinutes) }))
  .map(l => withHistory(l, previous.byId, today))
  .sort((a, b) => b.score - a.score);

const fullStats = { scanned: scraped.length, duplicates: pool.length - unique.length, kept: listings.length, discarded: { ...area.discarded, ...offer.discarded } };
const result = {
  generatedAt: now,
  lastFullAt: mode === "full" ? now : previous.data.lastFullAt ?? previous.data.generatedAt,
  usdRate,
  stats: mode === "full" ? fullStats : { ...previous.data.stats, kept: listings.length, quickNew: listings.filter(l => !previous.byId.has(l.id)).length },
  dangerZones: config.dangerZones,
  zonePenalty: config.scoring.penalties.zonaMedia,
  market,
  listings,
};

mkdirSync(dirname(config.output), { recursive: true });
writeJson(config.output, result);
writeJson(detailsPath, Object.fromEntries(offer.kept.map(l => [l.id, { description: l.description, photos: l.photos ?? [] }])));
console.log(mode, JSON.stringify(result.stats, null, 2));
