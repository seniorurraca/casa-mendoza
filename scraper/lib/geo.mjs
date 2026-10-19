const EARTH_DIAMETER_KM = 12742;
const RAD = Math.PI / 180;

export function haversineKm(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLng = (b.lng - a.lng) * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2;
  return EARTH_DIAMETER_KM * Math.asin(Math.sqrt(h));
}

export const hasCoords = p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== 0 && p.lng !== 0;

export const estimateMinutes = (point, centro, minutesPerKm) =>
  hasCoords(point) ? Math.round(haversineKm(centro, point) * minutesPerKm) : null;
