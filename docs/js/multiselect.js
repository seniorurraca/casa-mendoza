import { escapeHtml } from "./format.js";
import { ICONS } from "./icons.js";

export const isChecked = (selected, value) => selected.includes(value);

export function toggleOption(selected, value, allValues) {
  const next = selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value];
  return next.length === allValues.length ? [] : next;
}

export function summaryText(selected, options, allLabel = "Todos") {
  if (!selected.length) return allLabel;
  if (selected.length === 1) return options.find(o => o.value === selected[0])?.label ?? selected[0];
  return `${selected.length} seleccionados`;
}

export const renderMultiSelect = ({ name, label, options, selected, allLabel }) => `
  <span class="field-label">${escapeHtml(label)}</span>
  <details class="multi" data-multi="${escapeHtml(name)}">
    <summary><span>${escapeHtml(summaryText(selected, options, allLabel))}</span>${ICONS.chevron}</summary>
    <div class="multi-menu">
      <label class="multi-all"><input type="checkbox" data-all ${selected.length ? "" : "checked"}> Todos</label>
      ${options.map(o => `<label><input type="checkbox" value="${escapeHtml(o.value)}" ${isChecked(selected, o.value) ? "checked" : ""}> ${escapeHtml(o.label)}</label>`).join("")}
    </div>
  </details>`;

export function createMultiSelect(container, { name, label, options, getSelected, onChange, allLabel }) {
  const allValues = options.map(o => o.value);
  const render = () => {
    const wasOpen = container.querySelector("details")?.open;
    container.innerHTML = renderMultiSelect({ name, label, options, selected: getSelected(), allLabel });
    if (wasOpen) container.querySelector("details").open = true;
  };

  container.addEventListener("change", event => {
    event.stopPropagation();
    const next = event.target.hasAttribute("data-all") ? [] : toggleOption(getSelected(), event.target.value, allValues);
    onChange(next);
    render();
  });
  container.addEventListener("input", event => event.stopPropagation());

  document.addEventListener("click", event => {
    const details = container.querySelector("details");
    if (details?.open && !container.contains(event.target)) details.open = false;
  });

  render();
  return { render };
}
