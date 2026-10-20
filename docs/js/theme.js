import { ICONS } from "./icons.js";
import { storedValue } from "./storage.js";

export const THEMES = [
  { id: "system", label: "Automático", swatch: "linear-gradient(135deg, #f7f7f5 50%, #16191c 50%)" },
  { id: "light", label: "Claro", swatch: "#f7f7f5" },
  { id: "dark", label: "Oscuro", swatch: "#16191c" },
  { id: "lavanda", label: "Lavanda", swatch: "#d9ccf2" },
  { id: "durazno", label: "Durazno", swatch: "#f6d3c0" },
  { id: "menta", label: "Menta", swatch: "#c7e8d8" },
];

const DARK_QUERY = "(prefers-color-scheme: dark)";
const themeStore = storedValue("casa-mendoza:theme");

const DEFAULT_THEME = "light";

export function resolveTheme(choice, prefersDark) {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return THEMES.some(t => t.id === choice) ? choice : DEFAULT_THEME;
}

export const isDarkTheme = () => document.documentElement.dataset.theme === "dark";

const applyTheme = choice => {
  document.documentElement.dataset.theme = resolveTheme(choice, matchMedia(DARK_QUERY).matches);
};

const option = (theme, current) => `
  <label class="theme-option">
    <input type="radio" name="theme" value="${theme.id}" ${theme.id === current ? "checked" : ""}>
    <span class="swatch" style="background: ${theme.swatch}"></span>${theme.label}
  </label>`;

export function createThemePicker(container) {
  const current = () => themeStore.get() ?? DEFAULT_THEME;
  container.innerHTML = `
    <details class="theme-menu">
      <summary class="icon-btn ghost" title="Tema" aria-label="Elegir tema">${ICONS.palette}</summary>
      <div class="menu">${THEMES.map(t => option(t, current())).join("")}</div>
    </details>`;
  const menu = container.querySelector("details");

  container.addEventListener("change", event => {
    themeStore.set(event.target.value);
    applyTheme(event.target.value);
    menu.open = false;
  });
  document.addEventListener("click", event => {
    if (menu.open && !menu.contains(event.target)) menu.open = false;
  });
  matchMedia(DARK_QUERY).addEventListener("change", () => applyTheme(current()));
}
