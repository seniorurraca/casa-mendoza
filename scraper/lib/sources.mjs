export async function fetchGroups(groups, fetchGroup, options) {
  const all = [];
  for (const [group, type] of Object.entries(groups)) all.push(...await fetchGroup(group, type, options));
  return [...new Map(all.map(listing => [listing.id, listing])).values()];
}
