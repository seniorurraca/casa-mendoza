import { GOOGLE_CLIENT_ID } from "./account-config.js";
import { escapeHtml } from "./format.js";
import { isFresh, msUntilRefresh, tokenClaims } from "./google-token.js";
import { storedValue } from "./storage.js";

const GIS_URL = "https://accounts.google.com/gsi/client";

const tokenStore = storedValue("casa-mendoza:google-token");

const loadGis = () => new Promise((resolve, reject) => {
  const script = Object.assign(document.createElement("script"), { src: GIS_URL, async: true, onload: resolve, onerror: reject });
  document.head.append(script);
});

export function createAccount(container, { onLogin, onLogout }) {
  if (!GOOGLE_CLIENT_ID) return { logout() {} };

  function renderSignedIn(token) {
    const { given_name, name, email, picture } = tokenClaims(token);
    const displayName = given_name ?? name ?? email;
    const avatar = picture
      ? `<img src="${escapeHtml(picture)}" alt="" referrerpolicy="no-referrer">`
      : `<span>${escapeHtml(displayName.charAt(0).toUpperCase())}</span>`;
    container.innerHTML = `
      <details class="account-menu">
        <summary class="avatar" aria-label="Tu cuenta">${avatar}</summary>
        <div class="menu">
          <strong>${escapeHtml(name ?? displayName)}</strong>
          <span class="muted">${escapeHtml(email)}</span>
          <button type="button" class="btn" data-account="logout">Cerrar sesión</button>
        </div>
      </details>`;
  }

  function renderSignedOut() {
    container.innerHTML = "";
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const compact = matchMedia("(max-width: 480px)").matches;
    google.accounts.id.renderButton(container, {
      type: compact ? "icon" : "standard", theme: dark ? "filled_black" : "outline", size: "large", text: "signin", shape: "pill",
    });
  }

  let refreshTimer = null;

  function login(token) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => google.accounts.id.prompt(), msUntilRefresh(token));
    tokenStore.set(token);
    renderSignedIn(token);
    onLogin(token);
  }

  function logout() {
    clearTimeout(refreshTimer);
    tokenStore.set(null);
    google.accounts.id.disableAutoSelect();
    renderSignedOut();
    onLogout();
  }

  container.addEventListener("click", event => {
    if (event.target.closest("[data-account=logout]")) logout();
  });

  document.addEventListener("click", event => {
    const menu = container.querySelector(".account-menu");
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  });

  loadGis().then(() => {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, auto_select: true, callback: ({ credential }) => login(credential) });
    const saved = tokenStore.get();
    if (isFresh(saved)) return login(saved);
    renderSignedOut();
    if (saved) google.accounts.id.prompt();
  }).catch(() => { container.innerHTML = ""; });

  return { logout };
}
