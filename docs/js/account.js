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
    const { given_name, name, email } = tokenClaims(token);
    container.innerHTML = `<span class="account-name" title="${escapeHtml(email)}">${escapeHtml(given_name ?? name ?? email)}</span>
      <button type="button" class="btn small" data-account="logout">Salir</button>`;
  }

  function renderSignedOut() {
    container.innerHTML = "";
    google.accounts.id.renderButton(container, { type: "standard", size: "medium", text: "signin", shape: "pill" });
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

  loadGis().then(() => {
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, auto_select: true, callback: ({ credential }) => login(credential) });
    const saved = tokenStore.get();
    if (isFresh(saved)) return login(saved);
    renderSignedOut();
    if (saved) google.accounts.id.prompt();
  }).catch(() => { container.innerHTML = ""; });

  return { logout };
}
