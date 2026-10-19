import { mapsUrl } from "./maps.js";
import { daysSince, escapeHtml, formatPercent, formatUsd } from "./format.js";

const NEW_DAYS = 3;
const TYPE_LABEL = { casa: "Casa", terreno: "Terreno" };

const scoreTone = score => (score >= 75 ? "good" : score >= 55 ? "mid" : "low");

function chips(l) {
  const list = [
    [l.features.credito, "good", "Apto crédito"],
    [l.type === "casa" && l.features.patio, "good", "Patio"],
    [l.type === "casa" && l.features.cochera, "info", "Cochera"],
    [daysSince(l.firstSeen) <= NEW_DAYS, "info", "Nuevo"],
    [l.prevUsd && l.usd < l.prevUsd, "good", `Bajó ${l.prevUsd ? formatPercent(1 - l.usd / l.prevUsd) : ""}`],
    [l.suspicious, "warn", "Precio sospechoso"],
    [l.risk === "medium", "warn", "Zona a verificar"],
    [l.features.posesion, "bad", "Posesión / boleto"],
  ];
  return list.filter(([show]) => show).map(([, tone, label]) => `<span class="chip ${tone}">${label}</span>`).join("");
}

function facts(l) {
  const items = [
    l.type === "casa" && l.supC && `${l.supC} m² cub.`,
    l.supT && `${l.supT} m² terreno`,
    l.dorm && `${l.dorm} dorm.`,
    l.minutes !== null && `~${l.minutes} min al centro`,
    l.ppm && `${formatUsd(l.ppm)}/m²`,
    l.discount !== null && `${l.discount >= 0 ? "−" : "+"}${formatPercent(Math.abs(l.discount))} vs zona`,
  ];
  return items.filter(Boolean).map(escapeHtml).join(" · ");
}

const breakdown = l => l.breakdown.map(b => `<li><span>${escapeHtml(b.label)}</span><span>${b.pts > 0 ? "+" : ""}${b.pts}</span></li>`).join("");

export const renderCard = (l, isFavorite) => `
<article class="card" data-id="${escapeHtml(l.id)}">
  <a class="photo" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">
    ${l.photo ? `<img src="${escapeHtml(l.photo)}" alt="" loading="lazy">` : ""}
    <span class="score ${scoreTone(l.score)}">${l.score}</span>
  </a>
  <div class="body">
    <div class="head">
      <h3>${TYPE_LABEL[l.type]} en ${escapeHtml(l.department)}</h3>
      <strong class="price">${formatUsd(l.usd)}</strong>
    </div>
    <p class="address">${escapeHtml(l.address)}</p>
    <p class="facts">${facts(l)}</p>
    <div class="chips">${chips(l)}</div>
    <details><summary>Por qué este puntaje</summary><ul class="breakdown">${breakdown(l)}</ul></details>
    <div class="actions">
      <a class="btn primary" href="${escapeHtml(l.url)}" target="_blank" rel="noopener">Ver aviso</a>
      <a class="btn" href="${escapeHtml(mapsUrl(l))}" target="_blank" rel="noopener">Google Maps</a>
      <button class="btn fav ${isFavorite ? "on" : ""}" data-fav="${escapeHtml(l.id)}" aria-label="Favorito">${isFavorite ? "★" : "☆"}</button>
    </div>
  </div>
</article>`;
