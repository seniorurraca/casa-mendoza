import { fetchText, sleep, withRetry } from "./http.mjs";

function fetchParsed(url, parse, retry) {
  return withRetry(async () => {
    const parsed = parse(await fetchText(url));
    if (!parsed.listings.length) throw new Error(`página sin avisos ${url}`);
    return parsed;
  }, retry);
}

export async function fetchPaginated({ label, firstPage, urlFor, parse, delayMs, maxPages, retry }) {
  const first = await fetchParsed(urlFor(firstPage), parse, retry);
  const pages = Math.min(Math.ceil(first.total / first.listings.length), maxPages);
  const listings = [...first.listings];
  for (let i = 1; i < pages; i++) {
    await sleep(delayMs);
    listings.push(...(await fetchParsed(urlFor(firstPage + i), parse, retry)).listings);
    console.log(`${label} ${i + 1}/${pages}`);
  }
  return listings;
}

export async function fetchGroups(groups, fetchGroup, options) {
  const all = [];
  for (const [group, type] of Object.entries(groups)) all.push(...await fetchGroup(group, type, options));
  return [...new Map(all.map(listing => [listing.id, listing])).values()];
}

export async function collectSources(entries, fetchSource) {
  const found = {};
  const failed = {};
  for (const [name, options] of entries) {
    try {
      found[name] = await fetchSource(name, options);
    } catch (error) {
      console.error(`${name} falló: ${error.message}`);
      failed[name] = error.message;
    }
  }
  return { found, failed };
}

export const sourcesFor = (sources, mode, segment) => Object.entries(sources)
  .filter(([, options]) => options.segments[segment] && (mode === "full" || options.quick))
  .map(([name, { quick, segments, ...options }]) => [name, { ...options, groups: segments[segment], ...(mode === "full" ? {} : quick) }]);
