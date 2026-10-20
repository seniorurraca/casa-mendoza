import { haversineKm, hasCoords } from "../../docs/js/geo.js";

export { haversineKm, hasCoords };

export const estimateMinutes = (point, centro, minutesPerKm) =>
  hasCoords(point) ? Math.round(haversineKm(centro, point) * minutesPerKm) : null;
