import { escapeHtml } from "./format.js";
import { DEFAULT_ZONE_PREFS, countMatches, customZone } from "./zones.js";

const LEVEL_LABEL = { high: "Ocultar", medium: "Advertir" };

const levelBadge = level => `<span class="chip ${level === "high" ? "bad" : "warn"}">${LEVEL_LABEL[level]}</span>`;

const zoneRow = (zone, count, control) => `
  <li>
    ${control}
    <span class="zone-name">${escapeHtml(zone.name)}</span>
    ${levelBadge(zone.level)}
    <span class="muted">${count} avisos</span>
  </li>`;

function render(defaults, prefs, listings) {
  const defaultRows = defaults.map(z => zoneRow(z, countMatches(listings, z),
    `<input type="checkbox" data-zone-toggle="${escapeHtml(z.name)}" ${prefs.disabled.includes(z.name) ? "" : "checked"} aria-label="Activar ${escapeHtml(z.name)}">`)).join("");
  const customRows = prefs.custom.map(z => zoneRow(z, countMatches(listings, z),
    `<button type="button" class="btn icon small" data-zone-remove="${escapeHtml(z.name)}" aria-label="Quitar ${escapeHtml(z.name)}">✕</button>`)).join("");
  const areaRows = prefs.areas.map(z => zoneRow(z, countMatches(listings, z),
    `<button type="button" class="btn icon small" data-area-remove="${escapeHtml(z.id)}" aria-label="Quitar ${escapeHtml(z.name)}">✕</button>`)).join("");
  return `
  <header class="detail-head">
    <h2>Configuración</h2>
    <button type="button" class="btn icon" data-action="close" aria-label="Cerrar">✕</button>
  </header>
  <section>
    <h3>Barrios peligrosos</h3>
    <p class="muted">"Ocultar" saca los avisos de la lista. "Advertir" los muestra con aviso y le resta puntos. Se busca el nombre en la dirección y el título del aviso.</p>
    <ul class="zones">${defaultRows}</ul>
    <h3>Agregados por vos</h3>
    <ul class="zones">${customRows || `<li class="muted">Ninguno todavía.</li>`}</ul>
    <h3>Ocultos por ubicación</h3>
    <ul class="zones">${areaRows || `<li class="muted">Ninguno. Se agregan desde el detalle de un aviso.</li>`}</ul>
    <form class="zone-add">
      <input name="zoneName" placeholder="Barrio Bombal" required minlength="3" aria-label="Nombre del barrio">
      <select name="level" aria-label="Nivel"><option value="high">Ocultar</option><option value="medium">Advertir</option></select>
      <button class="btn primary">Agregar</button>
    </form>
    <p class="zone-error" hidden></p>
    <button type="button" class="btn" data-zone-reset>Restaurar lista original</button>
  </section>`;
}

export function createSettings(dialog, { defaults, getListings, getPrefs, onChange }) {
  const refresh = () => { dialog.innerHTML = render(defaults, getPrefs(), getListings()); };
  const update = prefs => { onChange(prefs); refresh(); };

  dialog.addEventListener("change", event => {
    const name = event.target.dataset.zoneToggle;
    if (!name) return;
    const prefs = getPrefs();
    const disabled = event.target.checked ? prefs.disabled.filter(n => n !== name) : [...prefs.disabled, name];
    update({ ...prefs, disabled });
  });

  dialog.addEventListener("click", event => {
    const prefs = getPrefs();
    const removeName = event.target.closest("[data-zone-remove]")?.dataset.zoneRemove;
    if (removeName) update({ ...prefs, custom: prefs.custom.filter(z => z.name !== removeName) });
    const removeArea = event.target.closest("[data-area-remove]")?.dataset.areaRemove;
    if (removeArea) update({ ...prefs, areas: prefs.areas.filter(z => z.id !== removeArea) });
    if (event.target.closest("[data-zone-reset]")) update(DEFAULT_ZONE_PREFS);
    if (event.target === dialog || event.target.closest("[data-action=close]")) dialog.close();
  });

  dialog.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.target;
    const zone = customZone(form.zoneName.value, form.level.value);
    const prefs = getPrefs();
    const exists = [...defaults, ...prefs.custom].some(z => z.pattern === zone.pattern);
    if (exists) {
      const error = dialog.querySelector(".zone-error");
      error.textContent = "Ese barrio ya está en la lista.";
      error.hidden = false;
      return;
    }
    update({ ...prefs, custom: [...prefs.custom, zone] });
  });

  return { open() { refresh(); dialog.showModal(); } };
}
