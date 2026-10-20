const EXPIRY_MARGIN_MS = 60_000;

export function tokenClaims(token) {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(payload), c => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

export const msUntilRefresh = (token, now = Date.now()) => (tokenClaims(token)?.exp ?? 0) * 1000 - EXPIRY_MARGIN_MS - now;

export const isFresh = (token, now = Date.now()) => Boolean(token) && msUntilRefresh(token, now) > 0;
