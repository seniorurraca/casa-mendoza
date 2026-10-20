const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
const KEYS_TTL_MS = 3_600_000;

const base64UrlBytes = text => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
function decodePart(part) {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlBytes(part)));
  } catch {
    return null;
  }
}

let cachedKeys = null;

export async function fetchGoogleKeys(now = Date.now()) {
  if (cachedKeys && cachedKeys.expiresAt > now) return cachedKeys.keys;
  const { keys } = await (await fetch(CERTS_URL)).json();
  cachedKeys = { keys, expiresAt: now + KEYS_TTL_MS };
  return keys;
}

async function hasValidSignature(token, jwk) {
  const [header, payload, signature] = token.split(".");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, base64UrlBytes(signature), new TextEncoder().encode(`${header}.${payload}`));
}

export async function verifyGoogleToken(token, { clientId, allowedEmails, keys, now = Date.now() }) {
  const parts = token?.split(".") ?? [];
  if (parts.length !== 3) return null;
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]);
  if (!header || !claims) return null;
  const jwk = keys.find(k => k.kid === header.kid);
  if (header.alg !== "RS256" || !jwk || !(await hasValidSignature(token, jwk).catch(() => false))) return null;
  const valid = ISSUERS.includes(claims.iss) && claims.aud === clientId && claims.exp * 1000 > now &&
    claims.email_verified === true && allowedEmails.includes(claims.email);
  return valid ? claims.email : null;
}
