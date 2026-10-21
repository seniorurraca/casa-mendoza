import { fetchJson, sleep, withRetry } from "../lib/http.mjs";
import { fetchGroups } from "../lib/sources.mjs";
import { normalize } from "../lib/text.mjs";

const BASE_URL = "https://www.mendozaprop.com";
const SALE = 2;
const USD = 1;
const PAGE_SIZE = 100;
const DEPARTMENTS = {
  mendoza: "Capital",
  godoycruz: "Godoy Cruz",
  guaymallen: "Guaymallen",
  lasheras: "Las Heras",
  lujandecuyo: "Lujan de Cuyo",
  maipu: "Maipu",
};

export const apiUrl = (propertyTypes, page, limit = PAGE_SIZE) =>
  `${BASE_URL}/api/properties?limit=${limit}&offset=${page * limit}&isMap=false&operationType=${SALE}&propertyType=${propertyTypes}`;

export function toListing(item, type, usdRate) {
  const price = Number(item.price) || null;
  const region = item.regions?.[0] ?? "";
  return {
    id: `mendozaprop-${item.id}`,
    source: "mendozaprop",
    type,
    url: `${BASE_URL}/venta-${type}/${item.id}`,
    photo: item.images?.[0] ?? null,
    photos: item.images ?? [],
    photosApi: null,
    photoCount: item.images?.length ?? 0,
    priceRaw: price ? `${item.currency_id === USD ? "US$" : "$"} ${price}` : "Consultar",
    usd: !price ? null : item.currency_id === USD ? price : Math.round(price / usdRate),
    supT: item.m2 || null,
    supC: item.m2_covered || null,
    dorm: item.bedrooms || null,
    banos: item.bathrooms || null,
    cocheraAttr: item.parking > 0,
    lat: null,
    lng: null,
    department: DEPARTMENTS[region] ?? region,
    address: item.address?.replace(/, Argentina$/, "").trim() ?? "",
    locationText: normalize(`${item.address} ${item.title}`),
    description: item.description ?? "",
    text: normalize(`${item.title} ${item.description}`),
    publishedAt: null,
    agency: item.owner_company ?? null,
    creditoFlag: item.credit === 1 ? true : null,
  };
}

async function fetchGroup(propertyTypes, type, { delayMs, maxPages, retry, usdRate }) {
  const listings = [];
  for (let page = 0; page < maxPages; page++) {
    if (page > 0) await sleep(delayMs);
    const items = await withRetry(() => fetchJson(apiUrl(propertyTypes, page)), retry);
    listings.push(...items.filter(item => item.active).map(item => toListing(item, type, usdRate)));
    console.log(`mendozaprop ${type} ${page + 1}`);
    if (items.length < PAGE_SIZE) break;
  }
  return listings;
}

export const fetchAll = ({ groups, ...options }) => fetchGroups(groups, fetchGroup, options);
