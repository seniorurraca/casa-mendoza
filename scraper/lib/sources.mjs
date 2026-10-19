export async function fetchGroups(groups, fetchGroup, options) {
  const all = [];
  for (const [group, type] of Object.entries(groups)) all.push(...await fetchGroup(group, type, options));
  return [...new Map(all.map(listing => [listing.id, listing])).values()];
}

export const sourcesFor = (sources, mode) => Object.entries(sources)
  .filter(([, options]) => mode === "full" || options.quick)
  .map(([name, { quick, ...options }]) => [name, mode === "full" ? options : { ...options, ...quick }]);
