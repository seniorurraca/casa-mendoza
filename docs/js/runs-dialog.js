import { escapeHtml, formatDateTime } from "./format.js";
import { SOURCE_LABEL } from "./listing-view.js";
import { healthOf } from "./runs.js";

const MINUTE_MS = 60_000;

const HEALTH_TEXT = {
  ok: run => `Última corrida OK: ${formatDateTime(run.finishedAt)}.`,
  fail: run => `La última corrida falló (${formatDateTime(run.finishedAt)}). La lista muestra los datos de la última corrida OK.`,
  stale: run => `No hubo corridas desde el ${formatDateTime(run.finishedAt)}. Revisá GitHub Actions.`,
  unknown: () => "Todavía no hay corridas registradas.",
};

const duration = run => (run.startedAt ? ` · ${Math.max(1, Math.round((Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / MINUTE_MS))} min` : "");

const scannedText = scanned => Object.entries(scanned).map(([source, count]) => `${SOURCE_LABEL[source] ?? escapeHtml(source)} ${count}`).join(" · ");

const runRow = run => `
  <li class="run">
    <div class="run-head">
      <span class="chip ${run.ok ? "good" : "bad"}">${run.ok ? "OK" : "Falló"}</span>
      <strong>${formatDateTime(run.finishedAt)}</strong>
      <span class="muted">${escapeHtml(run.mode)}${duration(run)}</span>
      ${run.url ? `<a class="run-link" href="${escapeHtml(run.url)}" target="_blank" rel="noopener">Ver en GitHub</a>` : ""}
    </div>
    ${run.ok ? `<p class="muted">${scannedText(run.scanned)} revisados · ${run.kept} en la lista · ${run.new} nuevos</p>` : `<pre class="run-error">${escapeHtml(run.error)}</pre>`}
  </li>`;

const render = runs => {
  const health = healthOf(runs);
  return `
  <header class="detail-head">
    <h2>Registro de corridas</h2>
    <button type="button" class="btn icon" data-action="close" aria-label="Cerrar">✕</button>
  </header>
  <section>
    <p class="run-health ${health}">${HEALTH_TEXT[health](runs[0])}</p>
    <ul class="runs">${runs.map(runRow).join("")}</ul>
  </section>`;
};

export function createRunsDialog(dialog, button, runs) {
  button.classList.toggle("alert", ["fail", "stale"].includes(healthOf(runs)));
  dialog.addEventListener("click", event => {
    if (event.target === dialog || event.target.closest("[data-action=close]")) dialog.close();
  });
  button.addEventListener("click", () => {
    dialog.innerHTML = render(runs);
    dialog.showModal();
  });
}
