import { escapeHtml } from "./format.js";
import { avisoLink, chips, discountPill, factList, favButton, formatPrice, mapsLink, newTag, photoBadge, scorePill, sources, title } from "./listing-view.js";

export const renderCard = (l, isFavorite) => `
<article class="card" data-id="${escapeHtml(l.id)}">
  <div class="card-media">
    <button type="button" class="photo" data-action="carousel" aria-label="Ver fotos">
      ${l.photo ? `<img src="${escapeHtml(l.photo)}" alt="" loading="lazy">` : ""}
    </button>
    ${scorePill(l)}
    ${favButton(l, isFavorite)}
    ${newTag(l)}
    ${photoBadge(l)}
  </div>
  <div class="card-body" data-action="detail">
    <div class="card-price"><strong>${formatPrice(l)}</strong>${discountPill(l)}</div>
    <h3 class="card-title">${title(l)}</h3>
    <p class="card-address">${escapeHtml(l.address)}</p>
    ${factList(l)}
    <div class="chips">${chips(l)}</div>
    <div class="card-foot">
      <p class="sources">${sources(l)}</p>
      <div class="card-links">${mapsLink(l)}${avisoLink(l)}</div>
    </div>
  </div>
</article>`;
