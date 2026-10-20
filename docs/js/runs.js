const STALE_HOURS = 8;
const HOUR_MS = 3_600_000;

export function healthOf(runs, now = Date.now()) {
  const [latest] = runs;
  if (!latest) return "unknown";
  if (!latest.ok) return "fail";
  return now - Date.parse(latest.finishedAt) > STALE_HOURS * HOUR_MS ? "stale" : "ok";
}
