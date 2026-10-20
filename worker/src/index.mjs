import { fetchGoogleKeys, verifyGoogleToken } from "./google-token.mjs";
import { addFavorite, listFavorites, mergeFavorites, removeFavorite } from "./favorites.mjs";

const LISTING_ID = /^[a-z]+-[\w-]{1,80}$/;
const MAX_MERGE = 500;

const splitList = value => (value ?? "").split(",").map(s => s.trim()).filter(Boolean);

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  if (!splitList(env.ALLOWED_ORIGINS).includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

async function route(request, env, email) {
  const { pathname } = new URL(request.url);
  const now = new Date().toISOString();
  if (pathname === "/favorites" && request.method === "GET") return [await listFavorites(env.DB, email), 200];
  if (pathname === "/favorites/merge" && request.method === "POST") {
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length > MAX_MERGE || !ids.every(id => LISTING_ID.test(id))) return [{ error: "ids inválidos" }, 400];
    if (ids.length) await mergeFavorites(env.DB, email, ids, now);
    return [await listFavorites(env.DB, email), 200];
  }
  const id = decodeURIComponent(pathname.match(/^\/favorites\/([^/]+)$/)?.[1] ?? "");
  if (!LISTING_ID.test(id)) return [{ error: "no encontrado" }, 404];
  if (request.method === "PUT") await addFavorite(env.DB, email, id, now);
  else if (request.method === "DELETE") await removeFavorite(env.DB, email, id);
  else return [{ error: "método no permitido" }, 405];
  return [{ ok: true }, 200];
}

export async function handle(request, env, keys) {
  const cors = corsHeaders(request, env);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  const email = await verifyGoogleToken(token, { clientId: env.GOOGLE_CLIENT_ID, allowedEmails: splitList(env.ALLOWED_EMAILS), keys: await keys() });
  if (!email) return json({ error: "no autorizado" }, 401, cors);
  const [body, status] = await route(request, env, email);
  return json(body, status, cors);
}

export default { fetch: (request, env) => handle(request, env, fetchGoogleKeys) };
