import { escapeHtml, formatArs, formatPercent, formatUsd } from "./format.js";
import { mapsUrl } from "./maps.js";
import { ICONS } from "./icons.js";

export const TYPE_LABEL = { casa: "Casa", terreno: "Terreno", departamento: "Departamento" };

export const isRent = l => l.operation === "alquiler";

export const formatPrice = l => (isRent(l) ? `${formatArs(l.ars)}<small>/mes</small>` : formatUsd(l.usd));
export const SOURCE_LABEL = { inmoclick: "Inmoclick", inmoup: "Inmoup", remax: "RE/MAX", mendozaprop: "MendozaProp" };

const sourceLink = (source, url) =>
  `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${SOURCE_LABEL[source] ?? escapeHtml(source)}</a>`;

export const sources = l => [sourceLink(l.source, l.url), ...(l.alsoOn ?? []).map(o => sourceLink(o.source, o.url))].join(" · ");

export const title = l => `${TYPE_LABEL[l.type]} en ${escapeHtml(l.department)}`;

export const scoreTone = score => (score >= 75 ? "good" : score >= 55 ? "mid" : "low");

export const discountText = l => (l.discount === null ? null : `${l.discount >= 0 ? "−" : "+"}${formatPercent(Math.abs(l.discount))} vs zona`);

export function chips(l) {
  const list = [
    [l.features.credito && !isRent(l), "good", "Apto crédito"],
    [l.type !== "terreno" && l.features.patio, "good", "Patio"],
    [l.type !== "terreno" && l.features.cochera, "info", "Cochera"],
    [l.prevUsd && l.usd < l.prevUsd, "good", `Bajó ${l.prevUsd ? formatPercent(1 - l.usd / l.prevUsd) : ""}`],
    [l.suspicious, "warn", "Precio sospechoso"],
    [l.zone?.level === "medium", "warn", `Zona a verificar: ${escapeHtml(l.zone?.name)}`],
    [l.features.posesion, "bad", "Posesión / boleto"],
  ];
  return list.filter(([show]) => show).map(([, tone, label]) => `<span class="chip ${tone}">${label}</span>`).join("");
}

export function factList(l) {
  const items = [
    [l.dorm, ICONS.bed, `${l.dorm} dorm.`],
    [l.type !== "terreno" && l.supC, ICONS.area, `${l.supC} m² cub.`],
    [l.supT, ICONS.land, `${l.supT} m² terreno`],
    [l.minutes !== null, ICONS.clock, `${l.minutes} min al centro`],
  ];
  return `<ul class="facts">${items.filter(([show]) => show).map(([, icon, text]) => `<li>${icon}<span>${escapeHtml(text)}</span></li>`).join("")}</ul>`;
}

export const scorePill = l => `<span class="score-pill ${scoreTone(l.score)}" title="Puntaje de oportunidad">${l.score}<small>pts</small></span>`;

export const discountPill = l =>
  l.discount === null ? "" : `<span class="discount ${l.discount >= 0 ? "below" : "above"}">${discountText(l)}</span>`;

export const breakdownList = l =>
  `<ul class="breakdown">${l.breakdown.map(b => `<li><span>${escapeHtml(b.label)}</span><span>${b.pts > 0 ? "+" : ""}${b.pts}</span></li>`).join("")}</ul>`;

const externalLink = (href, icon, { text, className, label }) =>
  `<a class="${className}" href="${escapeHtml(href)}" target="_blank" rel="noopener" title="${label}" aria-label="${label}">${icon}${text ? `<span>${text}</span>` : ""}</a>`;

export const avisoLink = (l, { text = "", className = "icon-btn" } = {}) =>
  externalLink(l.url, ICONS.external, { text, className, label: "Abrir aviso original" });

export const mapsLink = (l, { text = "", className = "icon-btn" } = {}) =>
  externalLink(mapsUrl(l), ICONS.map, { text, className, label: "Ver en Google Maps" });

export const favButton = (l, isFavorite) => {
  const label = isFavorite ? "Quitar de favoritos" : "Guardar en favoritos";
  return `<button type="button" class="icon-btn fav ${isFavorite ? "on" : ""}" data-fav="${escapeHtml(l.id)}" title="${label}" aria-label="${label}" aria-pressed="${isFavorite}">${ICONS.heart}</button>`;
};

export const newTag = l => (l.isNew ? `<span class="new-tag">Nuevo</span>` : "");

export function photoBadge(l) {
  if (l.photoCount === null || l.photoCount === undefined) return `<span class="photo-badge">${ICONS.camera}</span>`;
  return l.photoCount > 1 ? `<span class="photo-badge">${ICONS.camera}1/${l.photoCount}</span>` : "";
}
