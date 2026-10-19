const FALLBACK_NEW_DAYS = 3;
const DAY_MS = 86_400_000;

export const seenAt = l => l.firstSeenAt ?? `${l.firstSeen}T00:00:00`;

export const newSince = (previousVisit, now = Date.now()) =>
  previousVisit ?? new Date(now - FALLBACK_NEW_DAYS * DAY_MS).toISOString();

export const markNew = (listings, since) => {
  const sinceMs = new Date(since).getTime();
  return listings.map(l => ({ ...l, isNew: new Date(seenAt(l)).getTime() > sinceMs }));
};

export function startVisit({ local, session }, now = new Date().toISOString()) {
  const sessionBaseline = session.get();
  if (sessionBaseline !== null) return sessionBaseline.previousVisit;
  const previousVisit = local.get();
  session.set({ previousVisit });
  local.set(now);
  return previousVisit;
}
