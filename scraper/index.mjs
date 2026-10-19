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
import { readPrevious, withHistory } from "./lib/history.mjs";
import { dedupe } from "./lib/dedupe.mjs";

const SOURCES = { inmoclick, inmoup };

const PUBLIC_FIELDS = ["id", "source", "type", "url", "photo", "photosApi", "usd", "priceRaw", "supT", "supC", "dorm", "banos",
  "lat", "lng", "department", "address", "locationText", "publishedAt", "agency", "features", "minutes", "ppm", "alsoOn"];

const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k]]));
const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value));

const { values: args } = parseArgs({ options: { "max-pages": { type: "string" } } });
const config = JSON.parse(readFileSync("config.json", "utf8"));
const today = new Date().toISOString().slice(0, 10);

const usdRate = await getUsdRate(config.usdRate);
const scraped = [];
for (const [name, options] of Object.entries(config.sources)) {
  const maxPages = Number(args["max-pages"] ?? options.maxPages);
  scraped.push(...(await SOURCES[name].fetchAll({ ...options, maxPages, usdRate })).map(l => enrich(l, config)));
}

const area = partition(scraped, config, AREA_RULES);
const unique = dedupe(area.kept);
const market = buildMarket(unique, config.segment);
const offer = partition(unique, config, OFFER_RULES);
const previous = readPrevious(config.output);

const listings = offer.kept
  .map(l => ({ ...pick(l, PUBLIC_FIELDS), ...scoreListing(l, zoneMedian(market, l, config.segment.minSamples), config.scoring, config.maxMinutes) }))
  .map(l => withHistory(l, previous, today))
  .sort((a, b) => b.score - a.score);

const result = {
  generatedAt: new Date().toISOString(),
  usdRate,
  stats: { scanned: scraped.length, duplicates: area.kept.length - unique.length, kept: listings.length, discarded: { ...area.discarded, ...offer.discarded } },
  dangerZones: config.dangerZones,
  zonePenalty: config.scoring.penalties.zonaMedia,
  market,
  listings,
};

mkdirSync(dirname(config.output), { recursive: true });
writeJson(config.output, result);
writeJson(join(dirname(config.output), "details.json"), Object.fromEntries(offer.kept.map(l => [l.id, { description: l.description, photos: l.photos ?? [] }])));
console.log(JSON.stringify(result.stats, null, 2));
