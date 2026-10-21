import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import * as inmoclick from "./sources/inmoclick.mjs";
import * as inmoup from "./sources/inmoup.mjs";
import * as remax from "./sources/remax.mjs";
import * as mendozaprop from "./sources/mendozaprop.mjs";
import { getUsdRate } from "./lib/currency.mjs";
import { enrich } from "./lib/enrich.mjs";
import { AREA_RULES, OFFER_RULES, partition } from "./lib/filters.mjs";
import { buildMarket, zoneMedian } from "./lib/market.mjs";
import { scoreListing } from "./lib/score.mjs";
import { flagNew, readPrevious, registerSeen, upsert, withHistory } from "./lib/history.mjs";
import { dataFile, readJson, writeJson } from "./lib/files.mjs";
import { appendRun, runUrl } from "./lib/runs.mjs";
import { dedupe } from "./lib/dedupe.mjs";
import { sourcesFor } from "./lib/sources.mjs";
import { MARKET_KEYS, SEGMENTS, operationOf, replaceSegment } from "./lib/segments.mjs";

const SOURCES = { inmoclick, inmoup, remax, mendozaprop };

const PUBLIC_FIELDS = ["id", "source", "type", "operation", "url", "photo", "photosApi", "photoCount", "usd", "priceRaw", "supT", "supC", "dorm", "banos",
  "lat", "lng", "department", "address", "locationText", "publishedAt", "agency", "features", "minutes", "ppm", "alsoOn"];

const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj[k]]));

const { values: args } = parseArgs({
  options: { "max-pages": { type: "string" }, mode: { type: "string", default: "full" }, segment: { type: "string", default: "venta" } },
});
const mode = args.mode;
const segment = mode === "full" ? args.segment : "venta";
if (!SEGMENTS.includes(segment)) throw new Error(`segmento desconocido: ${segment}`);
const operation = operationOf(segment);
const config = JSON.parse(readFileSync("config.json", "utf8"));
const detailsPath = dataFile(config, "details.json");
const seenPath = dataFile(config, "seen.json");
const runsPath = dataFile(config, "runs.json");
const startedAt = new Date().toISOString();

const usdRate = await getUsdRate(config.usdRate);
const scraped = [];
const scannedBySource = {};
for (const [name, options] of sourcesFor(config.sources, mode, segment)) {
  const maxPages = Number(args["max-pages"] ?? options.maxPages);
  const found = await SOURCES[name].fetchAll({ ...options, maxPages, usdRate, operation });
  scannedBySource[name] = found.length;
  scraped.push(...found.map(l => enrich({ ...l, operation }, config)));
}

const previous = readPrevious(config.output, detailsPath);
const area = partition(scraped, config, AREA_RULES);
const pool = mode === "full" ? replaceSegment(previous.hydrated, area.kept, segment) : upsert(previous.hydrated, area.kept);
const unique = dedupe(pool);
const market = mode === "full" ? { ...previous.data.market, ...buildMarket(unique, config.segment, MARKET_KEYS[segment]) } : previous.data.market;
const offer = partition(unique, config, OFFER_RULES);

const now = new Date().toISOString();
const seen = registerSeen(readJson(seenPath, {}), previous.data.listings, scraped, now);
const previousFullBySegment = previous.data.lastFullBySegment ?? { venta: previous.data.lastFullAt };
const segmentRanBefore = Boolean(previousFullBySegment[segment]);
const lastFullBySegment = mode === "full" ? { ...previousFullBySegment, [segment]: now } : previousFullBySegment;
const scored = offer.kept
  .map(l => ({ ...pick(l, PUBLIC_FIELDS), ...scoreListing(l, zoneMedian(market, l, config.segment.minSamples), config.scoring, config.maxMinutes) }))
  .map(l => withHistory(l, previous.byId, seen))
  .sort((a, b) => b.score - a.score);
const listings = flagNew(scored, { mode, segment, now, previousById: previous.byId, segmentRanBefore });
const newCount = listings.filter(l => l.firstSeenAt === now).length;

const segmentStats = { ...previous.data.stats?.segments, [segment]: { scanned: scraped.length, discarded: { ...area.discarded, ...offer.discarded } } };
const fullStats = {
  scanned: Object.values(segmentStats).reduce((sum, s) => sum + s.scanned, 0),
  duplicates: pool.length - unique.length,
  kept: listings.length,
  segments: segmentStats,
};
const result = {
  generatedAt: now,
  startedAt,
  lastFullAt: mode === "full" ? now : previous.data.lastFullAt ?? previous.data.generatedAt,
  lastFullBySegment,
  usdRate,
  stats: mode === "full" ? fullStats : { ...previous.data.stats, kept: listings.length, quickNew: newCount },
  dangerZones: config.dangerZones,
  zonePenalty: config.scoring.penalties.zonaMedia,
  market,
  listings,
};

mkdirSync(dirname(config.output), { recursive: true });
writeJson(config.output, result);
writeJson(detailsPath, Object.fromEntries(offer.kept.map(l => [l.id, { description: l.description, photos: l.photos ?? [] }])));
writeJson(seenPath, seen);
writeJson(runsPath, appendRun(readJson(runsPath, []), {
  mode, segment, ok: true, startedAt, finishedAt: now, scanned: scannedBySource, kept: listings.length, new: newCount, error: null, url: runUrl(process.env),
}));
console.log(mode, segment, JSON.stringify(result.stats, null, 2));
