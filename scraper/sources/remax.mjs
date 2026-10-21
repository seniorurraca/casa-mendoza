import { fetchGroups, fetchPaginated } from "../lib/sources.mjs";
import { normalize } from "../lib/text.mjs";

const BASE_URL = "https://www.remax.com.ar";
const PHOTO_BASE = "https://d1acdg20u0pmxj.cloudfront.net";
const PHOTO_SIZE = "860x440";

export const pageUrl = (group, page) => `${BASE_URL}/${group}-en-venta-en-mendoza${page > 0 ? `?page=${page}` : ""}`;

function readListingsResponse(html) {
  const json = html.match(/<script id="ng-state" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!json) return { data: [], totalItems: 0 };
  const entry = Object.values(JSON.parse(json)).find(value => value?.u?.includes("/listings/findAll"));
  return entry?.b?.data ?? { data: [], totalItems: 0 };
}

const photoUrl = ({ rawValue }) => {
  const [folder, entity, file] = rawValue.split("/");
  return `${PHOTO_BASE}/${folder}/${entity}/${PHOTO_SIZE}/${file}.jpg`;
};

const departmentOf = geoLabel => geoLabel?.split(",").map(s => s.trim()).at(-2) ?? null;

function toListing(item, type, usdRate) {
  const [lng, lat] = item.location?.coordinates ?? [];
  const photos = (item.photos ?? []).map(photoUrl);
  const priced = item.priceExposure && item.price;
  return {
    id: `remax-${item.id}`,
    source: "remax",
    type,
    url: `${BASE_URL}/listings/${item.slug}`,
    photo: photos[0] ?? null,
    photos,
    photosApi: null,
    photoCount: photos.length,
    priceRaw: priced ? `${item.currency?.value === "USD" ? "US$" : "$"} ${item.price}` : "Consultar",
    usd: !priced ? null : item.currency?.value === "USD" ? item.price : Math.round(item.price / usdRate),
    supT: item.dimensionLand || null,
    supC: item.dimensionCovered || null,
    dorm: item.bedrooms || null,
    banos: item.bathrooms || null,
    cocheraAttr: false,
    lat: lat || null,
    lng: lng || null,
    department: departmentOf(item.geoLabel),
    address: item.displayAddress?.trim() ?? "",
    locationText: normalize(`${item.displayAddress} ${item.geoLabel} ${item.slug.replace(/-/g, " ")}`),
    description: item.title ?? "",
    text: normalize(item.title),
    publishedAt: null,
    agency: item.associate?.officeName ?? null,
    creditoFlag: null,
  };
}

export function parsePage(html, type, usdRate) {
  const { data, totalItems } = readListingsResponse(html);
  return { total: totalItems, listings: data.map(item => toListing(item, type, usdRate)) };
}

const fetchGroup = (group, type, { usdRate, ...options }) => fetchPaginated({
  ...options,
  label: `remax ${group}`,
  firstPage: 0,
  urlFor: page => pageUrl(group, page),
  parse: html => parsePage(html, type, usdRate),
});

export const fetchAll = ({ groups, ...options }) => fetchGroups(groups, fetchGroup, options);
