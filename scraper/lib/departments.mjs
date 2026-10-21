import { readJson } from "./files.mjs";
import { haversineKm, hasCoords } from "./geo.mjs";

const DEPARTMENTS = readJson(new URL("../data/departamentos-mendoza.json", import.meta.url));
const PLACEHOLDER_RADIUS_KM = 0.1;

function insideRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const insidePolygon = (point, [outer, ...holes]) => insideRing(point, outer) && !holes.some(hole => insideRing(point, hole));

export function departmentAt(point) {
  if (!hasCoords(point)) return null;
  const lngLat = [point.lng, point.lat];
  return DEPARTMENTS.find(d => d.polygons.some(polygon => insidePolygon(lngLat, polygon)))?.name ?? null;
}

export const isPlaceholder = (point, placeholders) =>
  hasCoords(point) && placeholders.some(pin => haversineKm(pin, point) <= PLACEHOLDER_RADIUS_KM);
