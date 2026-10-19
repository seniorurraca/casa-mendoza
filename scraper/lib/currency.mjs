import { fetchJson } from "./http.mjs";

export async function getUsdRate(kind) {
  const { venta } = await fetchJson(`https://dolarapi.com/v1/dolares/${kind}`);
  return venta;
}

export function parsePrice(raw, usdRate) {
  const amount = Number((raw || "").replace(/\D/g, ""));
  if (!amount) return null;
  return raw.includes("US$") ? amount : Math.round(amount / usdRate);
}
