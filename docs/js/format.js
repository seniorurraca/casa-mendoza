const usdFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export const formatUsd = n => `USD ${usdFormatter.format(n)}`;

export const formatArs = n => `$ ${usdFormatter.format(n)}`;

export const formatDateTime = iso =>
  new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export const formatPercent = ratio => `${Math.round(ratio * 100)}%`;

export const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
