import { fetchText, sleep, withRetry } from "../lib/http.mjs";
import { parsePrice } from "../lib/currency.mjs";
import { decodeEntities, normalize } from "../lib/text.mjs";

const BASE_URL = "https://inmoclick.com";
const DISABLED = "disable";

const attr = (block, name) => block.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const capture = (block, regex) => decodeEntities(block.match(regex)?.[1] ?? "").trim();
const toNumber = value => Number(value) || null;
const isEnabled = value => Boolean(value) && value !== DISABLED;

const pageUrl = (group, page) => `${BASE_URL}/inmuebles/venta/${group}/mendoza?limit=48&page=${page}`;

export const lastPage = html => Math.max(1, ...[...html.matchAll(/(?:\?|&amp;|&)page=(\d+)/g)].map(m => Number(m[1])));

function parseArticle(block, type, usdRate) {
  const path = capture(block, /href="([^"]*\/ficha\/[^"]*)"/);
  const address = capture(block, /class="inmobiliaria">([^<]*)/);
  const slug = path.split("/").pop().replace(/-/g, " ");
  return {
    id: `inmoclick-${attr(block, "usr_id")}-${attr(block, "prp_id")}`,
    source: "inmoclick",
    type,
    url: BASE_URL + path,
    photo: attr(block, "data-defer-src") ?? null,
    priceRaw: attr(block, "precio") ?? "",
    usd: parsePrice(attr(block, "precio"), usdRate),
    supT: toNumber(attr(block, "sup_t")),
    supC: toNumber(attr(block, "sup_c")),
    dorm: toNumber(attr(block, "ser_1")),
    banos: toNumber(attr(block, "ser_2")),
    cocheraAttr: isEnabled(attr(block, "ser_3")),
    lat: toNumber(attr(block, "lat")),
    lng: toNumber(attr(block, "lng")),
    department: capture(block, /addressLocality">([^<]*)/),
    address,
    locationText: normalize(`${address} ${slug}`),
    text: normalize(capture(block, /<p>([\s\S]*?)<\/p><\/a>/)),
  };
}

export const parseListings = (html, type, usdRate) =>
  html.split("<article").slice(1).map(chunk => parseArticle(chunk.split("</article>")[0], type, usdRate));

async function fetchPage(group, page, retry) {
  return withRetry(async () => {
    const html = await fetchText(pageUrl(group, page));
    if (!html.includes("<article")) throw new Error(`página sin avisos ${pageUrl(group, page)}`);
    return html;
  }, retry);
}

async function fetchGroup(group, type, { usdRate, delayMs, maxPages, retry }) {
  const firstHtml = await fetchPage(group, 1, retry);
  const pages = Math.min(lastPage(firstHtml), maxPages);
  const listings = parseListings(firstHtml, type, usdRate);
  for (let page = 2; page <= pages; page++) {
    await sleep(delayMs);
    listings.push(...parseListings(await fetchPage(group, page, retry), type, usdRate));
    console.log(`inmoclick ${group} ${page}/${pages}`);
  }
  return listings;
}

export async function fetchAll({ groups, ...options }) {
  const all = [];
  for (const [group, type] of Object.entries(groups)) all.push(...await fetchGroup(group, type, options));
  return [...new Map(all.map(listing => [listing.id, listing])).values()];
}
