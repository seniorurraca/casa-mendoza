import { fetchText, sleep, withRetry } from "../lib/http.mjs";
import { fetchGroups } from "../lib/sources.mjs";
import { parsePrice } from "../lib/currency.mjs";
import { decodeEntities, normalize } from "../lib/text.mjs";

const BASE_URL = "https://inmoclick.com";
const DISABLED = "disable";
const EMBEDDED_MARKER = "var propiedades = ";
const CREDITO_FLAG = { Si: true, No: false };

const attr = (block, name) => block.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const capture = (block, regex) => decodeEntities(block.match(regex)?.[1] ?? "").trim();
const toNumber = value => Number(value) || null;
const isEnabled = value => Boolean(value) && value !== DISABLED;

const ORDER_PARAM = { recent: "&ordenar=recientes" };

const pageUrl = (group, page, order) => `${BASE_URL}/inmuebles/venta/${group}/mendoza?limit=48&page=${page}${ORDER_PARAM[order] ?? ""}`;
const photosApiUrl = (usuario, propiedad) => `${BASE_URL}/json/inmuebles/fotos?usuario=${usuario}&propiedad=${propiedad}`;

export const lastPage = html => Math.max(1, ...[...html.matchAll(/(?:\?|&amp;|&)page=(\d+)/g)].map(m => Number(m[1])));

export function parseEmbedded(html) {
  const start = html.indexOf(EMBEDDED_MARKER);
  if (start < 0) return new Map();
  const line = html.slice(start + EMBEDDED_MARKER.length, html.indexOf("\n", start)).trim().replace(/;$/, "");
  const items = Object.values(JSON.parse(line));
  return new Map(items.map(p => [`${p.usuario_id}-${p.propiedad_id}`, {
    publishedAt: p.prp_alta?.slice(0, 10) ?? null,
    agency: p.nombre ?? null,
    creditoFlag: CREDITO_FLAG[p.hipotecario] ?? null,
  }]));
}

function parseArticle(block, type, usdRate, embedded) {
  const usuario = attr(block, "usr_id");
  const propiedad = attr(block, "prp_id");
  const path = capture(block, /href="([^"]*\/ficha\/[^"]*)"/);
  const address = capture(block, /class="inmobiliaria">([^<]*)/);
  const slug = path.split("/").pop().replace(/-/g, " ");
  const description = capture(block, /<p>([\s\S]*?)<\/p><\/a>/);
  return {
    id: `inmoclick-${usuario}-${propiedad}`,
    source: "inmoclick",
    type,
    url: BASE_URL + path,
    photo: attr(block, "data-defer-src") ?? null,
    photosApi: photosApiUrl(usuario, propiedad),
    photoCount: null,
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
    description,
    text: normalize(description),
    publishedAt: null,
    agency: null,
    creditoFlag: null,
    ...embedded.get(`${usuario}-${propiedad}`),
  };
}

export function parseListings(html, type, usdRate) {
  const embedded = parseEmbedded(html);
  return html.split("<article").slice(1).map(chunk => parseArticle(chunk.split("</article>")[0], type, usdRate, embedded));
}

async function fetchPage(group, page, { retry, order }) {
  const url = pageUrl(group, page, order);
  return withRetry(async () => {
    const html = await fetchText(url);
    if (!html.includes("<article")) throw new Error(`página sin avisos ${url}`);
    return html;
  }, retry);
}

async function fetchGroup(group, type, { usdRate, delayMs, maxPages, ...options }) {
  const firstHtml = await fetchPage(group, 1, options);
  const pages = Math.min(lastPage(firstHtml), maxPages);
  const listings = parseListings(firstHtml, type, usdRate);
  for (let page = 2; page <= pages; page++) {
    await sleep(delayMs);
    listings.push(...parseListings(await fetchPage(group, page, options), type, usdRate));
    console.log(`inmoclick ${group} ${page}/${pages}`);
  }
  return listings;
}

export const fetchAll = ({ groups, ...options }) => fetchGroups(groups, fetchGroup, options);
