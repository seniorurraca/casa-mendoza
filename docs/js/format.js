const usdFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export const formatUsd = n => `USD ${usdFormatter.format(n)}`;

export const formatPercent = ratio => `${Math.round(ratio * 100)}%`;

export const daysSince = isoDate => Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000);

export const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);
