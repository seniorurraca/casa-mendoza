import { fetchGroups, fetchPaginated } from "../lib/sources.mjs";
import { normalize } from "../lib/text.mjs";

const BASE_URL = "https://inmoup.com.ar";
const CREDITO_FLAG = { Si: true, No: false };
const DESCRIPTION_REF = /^\$\w+$/;

export const pageUrl = (group, page, maxUsd) =>
  `${BASE_URL}/${group}-en-mendoza${maxUsd ? `-y-${maxUsd}-o-menos-dolares` : ""}${page > 1 ? `-y-pag-${page}` : ""}`;

function flightPayload(html) {
  return [...html.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)]
    .map(m => { try { return JSON.parse(m[1])[1] ?? ""; } catch { return ""; } })
    .join("");
}

function jsonValueAt(text, start) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "[" || c === "{") depth++;
    else if ((c === "]" || c === "}") && --depth === 0) return { value: JSON.parse(text.slice(start, i + 1)), end: i + 1 };
  }
  throw new Error("JSON incompleto en payload de Inmoup");
}

function readItemsAndTotal(payload) {
  const at = payload.indexOf('"initialItems":');
  if (at < 0) return { items: [], total: 0 };
  const { value: items, end } = jsonValueAt(payload, at + '"initialItems":'.length);
  const total = Number(payload.slice(end).match(/^,"total":(\d+)/)?.[1] ?? 0);
  return { items, total };
}

function ldDescriptions(html) {
  const lists = [...html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap(m => JSON.parse(m[1])["@graph"] ?? [])
    .flatMap(node => node.mainEntity?.mainEntity?.itemListElement ?? []);
  return new Map(lists.map(entry => [entry.item?.url, entry.item?.description]));
}

const service = (item, name) => item.servicios.find(s => s.desc === name)?.val ?? null;
const toNumber = value => Number(value) || null;

function toListing(item, type, usdRate, descriptions) {
  const url = `${BASE_URL}/${item.inmobiliaria.id}-${item.inmobiliaria.slug}/inmuebles/${item.id}/ficha/${item.slug}`;
  const [lat, lng] = (item.coordenadas ?? "").split(",").map(Number);
  const description = DESCRIPTION_REF.test(item.descripcion) ? descriptions.get(url) ?? "" : item.descripcion ?? "";
  const cochera = service(item, "Cochera");
  return {
    id: `inmoup-${item.inmobiliaria.id}-${item.id}`,
    source: "inmoup",
    type,
    url,
    photo: item.img?.[0] ?? null,
    photos: item.img ?? [],
    photosApi: null,
    photoCount: item.img?.length ?? 0,
    priceRaw: `${item.dolar ? "US$" : "$"} ${item.precio}`,
    usd: item.ocultarPrecio || !item.precio ? null : item.dolar ? item.precio : Math.round(item.precio / usdRate),
    supT: toNumber(service(item, "Superficie Total m2")),
    supC: toNumber(service(item, "Superficie Cubierta m2")),
    dorm: toNumber(service(item, "Dormitorios")),
    banos: toNumber(service(item, "Baños")),
    cocheraAttr: Boolean(cochera) && cochera !== "Sin Cochera",
    lat: lat || null,
    lng: lng || null,
    department: item.localidad,
    address: item.direccion?.trim() ?? "",
    locationText: normalize(`${item.direccion} ${item.slug.replace(/-/g, " ")}`),
    description,
    text: normalize(description),
    publishedAt: item.fechaPublicacion?.slice(0, 10) ?? null,
    agency: item.inmobiliaria.nombre,
    creditoFlag: CREDITO_FLAG[service(item, "Apto Crédito Hipotecario")] ?? null,
  };
}

export function parsePage(html, type, usdRate) {
  const { items, total } = readItemsAndTotal(flightPayload(html));
  const descriptions = ldDescriptions(html);
  return { total, listings: items.map(item => toListing(item, type, usdRate, descriptions)) };
}

const fetchGroup = (group, type, { usdRate, maxUsd, operation, ...options }) => fetchPaginated({
  ...options,
  label: `inmoup ${group}`,
  firstPage: 1,
  urlFor: page => pageUrl(group, page, operation === "venta" ? maxUsd : null),
  parse: html => parsePage(html, type, usdRate),
});

export const fetchAll = ({ groups, ...options }) => fetchGroups(groups, fetchGroup, options);
