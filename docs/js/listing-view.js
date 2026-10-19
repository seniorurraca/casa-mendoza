import { daysSince, escapeHtml, formatPercent, formatUsd } from "./format.js";
import { mapsUrl } from "./maps.js";

const NEW_DAYS = 3;
const TYPE_LABEL = { casa: "Casa", terreno: "Terreno" };
const SOURCE_LABEL = { inmoclick: "Inmoclick", inmoup: "Inmoup" };

const sourceLink = (source, url) =>
  `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${SOURCE_LABEL[source] ?? escapeHtml(source)}</a>`;

export const sources = l => [sourceLink(l.source, l.url), ...(l.alsoOn ?? []).map(o => sourceLink(o.source, o.url))].join(" · ");

export const title = l => `${TYPE_LABEL[l.type]} en ${escapeHtml(l.department)}`;

export const scoreTone = score => (score >= 75 ? "good" : score >= 55 ? "mid" : "low");

export const discountText = l => (l.discount === null ? null : `${l.discount >= 0 ? "−" : "+"}${formatPercent(Math.abs(l.discount))} vs zona`);

export function chips(l) {
  const list = [
    [l.features.credito, "good", "Apto crédito"],
    [l.type === "casa" && l.features.patio, "good", "Patio"],
    [l.type === "casa" && l.features.cochera, "info", "Cochera"],
    [daysSince(l.firstSeen) <= NEW_DAYS, "info", "Nuevo"],
    [l.prevUsd && l.usd < l.prevUsd, "good", `Bajó ${l.prevUsd ? formatPercent(1 - l.usd / l.prevUsd) : ""}`],
    [l.suspicious, "warn", "Precio sospechoso"],
    [l.zone?.level === "medium", "warn", `Zona a verificar: ${escapeHtml(l.zone?.name)}`],
    [l.features.posesion, "bad", "Posesión / boleto"],
  ];
  return list.filter(([show]) => show).map(([, tone, label]) => `<span class="chip ${tone}">${label}</span>`).join("");
}

export function facts(l) {
  const items = [
    l.type === "casa" && l.supC && `${l.supC} m² cub.`,
    l.supT && `${l.supT} m² terreno`,
    l.dorm && `${l.dorm} dorm.`,
    l.minutes !== null && `~${l.minutes} min al centro`,
    l.ppm && `${formatUsd(l.ppm)}/m²`,
    discountText(l),
  ];
  return items.filter(Boolean).map(escapeHtml).join(" · ");
}

export const breakdownList = l =>
  `<ul class="breakdown">${l.breakdown.map(b => `<li><span>${escapeHtml(b.label)}</span><span>${b.pts > 0 ? "+" : ""}${b.pts}</span></li>`).join("")}</ul>`;

const externalLink = (href, label, className) =>
  `<a class="${className}" href="${escapeHtml(href)}" target="_blank" rel="noopener">${label}</a>`;

export const avisoLink = (l, label = "Ver aviso", className = "btn") => externalLink(l.url, label, className);

export const mapsLink = l => externalLink(mapsUrl(l), "Google Maps", "btn");

export const favButton = (l, isFavorite) =>
  `<button type="button" class="btn fav ${isFavorite ? "on" : ""}" data-fav="${escapeHtml(l.id)}" aria-label="Favorito">${isFavorite ? "★" : "☆"}</button>`;
