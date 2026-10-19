import { escapeHtml, formatUsd } from "./format.js";
import { avisoLink, breakdownList, chips, facts, favButton, mapsLink, newTag, photoBadge, scoreTone, sources, title } from "./listing-view.js";

export const renderCard = (l, isFavorite) => `
<article class="card" data-id="${escapeHtml(l.id)}">
  <button type="button" class="photo" data-action="carousel" aria-label="Ver fotos">
    ${l.photo ? `<img src="${escapeHtml(l.photo)}" alt="" loading="lazy">` : ""}
    ${newTag(l)}
    <span class="score ${scoreTone(l.score)}">${l.score}</span>
    ${photoBadge(l)}
  </button>
  <div class="body">
    <div class="head">
      <h3><button type="button" class="link" data-action="detail">${title(l)}</button></h3>
      <strong class="price">${formatUsd(l.usd)}</strong>
    </div>
    <p class="address">${escapeHtml(l.address)}</p>
    <p class="facts">${facts(l)}</p>
    <div class="chips">${chips(l)}</div>
    <details><summary>Por qué este puntaje</summary>${breakdownList(l)}</details>
    <div class="card-footer">
      <p class="sources">${sources(l)}</p>
      <div class="actions">
        <button type="button" class="btn primary" data-action="detail">Ver detalles</button>
        ${mapsLink(l)}
        ${avisoLink(l)}
        ${favButton(l, isFavorite)}
      </div>
    </div>
  </div>
</article>`;
