import { escapeHtml, formatUsd } from "./format.js";
import { hasCoords } from "./geo.js";
import { closeButton } from "./icons.js";
import { avisoLink, breakdownList, chips, discountPill, discountText, factList, favButton, formatPrice, isRent, mapsLink, newTag, scorePill, sources, title } from "./listing-view.js";

const IGNORE_RADII_M = [200, 500];

const ignoreArea = l => (!hasCoords(l) ? "" : `
  <section class="ignore-area">
    <h3>¿No te gusta la zona?</h3>
    <p class="muted">Oculta este aviso y todos los que estén cerca, sin saber el nombre del barrio. Se deshace en ⚙ Configuración.</p>
    <div class="ignore-buttons">${IGNORE_RADII_M.map(r => `<button type="button" class="btn" data-ignore-radius="${r}">Ocultar ${r} m alrededor</button>`).join("")}</div>
  </section>`);

const formatDate = iso => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("es-AR") : null);

function specs(l) {
  const rows = [
    ["Operación", isRent(l) ? "Alquiler" : "Venta"],
    ["USD por m²", !isRent(l) && l.ppm && formatUsd(l.ppm)],
    ["Mediana de la zona", !isRent(l) && l.zonePpm && `${formatUsd(l.zonePpm)}/m² (${discountText(l)})`],
    ["Superficie cubierta", l.supC && `${l.supC} m²`],
    ["Terreno", l.supT && `${l.supT} m²`],
    ["Dormitorios", l.dorm],
    ["Baños", l.banos],
    ["Al centro", l.minutes !== null && `~${l.minutes} min en auto`],
    ["Departamento", l.department],
    ["Publicado", formatDate(l.publishedAt)],
    ["Visto por primera vez", formatDate(l.firstSeen)],
    ["Precio anterior", !isRent(l) && l.prevUsd && formatUsd(l.prevUsd)],
    ["Inmobiliaria", l.agency],
  ];
  return rows.filter(([, value]) => value).map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join("") +
    `<dt>Publicado en</dt><dd>${sources(l)}</dd>`;
}

export const renderDetail = (l, isFavorite) => `
<div class="detail" data-id="${escapeHtml(l.id)}">
  <header class="detail-head">
    <div>
      <h2>${title(l)}</h2>
      <p class="address">${escapeHtml(l.address)}</p>
    </div>
    ${closeButton}
  </header>
  <div class="gallery">
    <button type="button" class="gallery-main" data-action="gallery-open" data-index="0" aria-label="Ver fotos en grande">
      ${l.photo ? `<img src="${escapeHtml(l.photo)}" alt="">` : `<span class="muted">Sin fotos</span>`}
      ${newTag(l)}
    </button>
    <div class="thumbs"></div>
  </div>
  <div class="detail-price"><strong>${formatPrice(l)}</strong>${discountPill(l)}${scorePill(l)}</div>
  ${factList(l)}
  <div class="chips">${chips(l)}</div>
  <dl class="specs">${specs(l)}</dl>
  <section>
    <h3>Descripción</h3>
    <p class="description muted">Cargando…</p>
  </section>
  <details><summary>Por qué este puntaje</summary>${breakdownList(l)}</details>
  ${ignoreArea(l)}
  <div class="actions sticky">
    ${avisoLink(l, { text: "Ver aviso original", className: "btn primary" })}
    ${mapsLink(l, { text: "Google Maps", className: "btn" })}
    ${favButton(l, isFavorite)}
  </div>
</div>`;

export const renderThumbs = photos => photos.length < 2 ? "" : photos.map((src, i) =>
  `<button type="button" class="thumb ${i === 0 ? "on" : ""}" data-action="thumb" data-index="${i}"><img src="${escapeHtml(src)}" alt="" loading="lazy"></button>`).join("");
