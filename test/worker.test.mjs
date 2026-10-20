import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyGoogleToken } from "../worker/src/google-token.mjs";
import { handle } from "../worker/src/index.mjs";

const NOW = Date.parse("2026-10-20T12:00:00Z");
const CLIENT_ID = "client.apps.googleusercontent.com";
const ORIGIN = "https://seniorurraca.github.io";

const { privateKey, publicKey } = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const keys = [{ ...(await crypto.subtle.exportKey("jwk", publicKey)), kid: "k1", alg: "RS256" }];

const base64Url = bytes => Buffer.from(bytes).toString("base64url");
async function signToken(overrides = {}) {
  const claims = { iss: "https://accounts.google.com", aud: CLIENT_ID, exp: NOW / 1000 + 600, email: "andy@example.com", email_verified: true, ...overrides };
  const unsigned = `${base64Url(JSON.stringify({ alg: "RS256", kid: "k1" }))}.${base64Url(JSON.stringify(claims))}`;
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

const verify = token => verifyGoogleToken(token, { clientId: CLIENT_ID, allowedEmails: ["andy@example.com"], keys, now: NOW });

test("a valid google token for an allowed email returns the email", async () => {
  assert.equal(await verify(await signToken()), "andy@example.com");
});

test("tokens that are expired, for another app, another email or tampered are rejected", async () => {
  assert.equal(await verify(await signToken({ exp: NOW / 1000 - 1 })), null);
  assert.equal(await verify(await signToken({ aud: "otra-app" })), null);
  assert.equal(await verify(await signToken({ email: "extrano@example.com" })), null);
  const [header, , signature] = (await signToken()).split(".");
  const forged = base64Url(JSON.stringify({ iss: "https://accounts.google.com", aud: CLIENT_ID, exp: NOW / 1000 + 600, email: "andy@example.com", email_verified: true, x: 1 }));
  assert.equal(await verify(`${header}.${forged}.${signature}`), null);
  assert.equal(await verify(`${header}.${forged}.%%%`), null);
  assert.equal(await verify(undefined), null);
});

test("the * wildcard accepts any google-verified email", async () => {
  const open = { clientId: CLIENT_ID, allowedEmails: ["*"], keys, now: NOW };
  assert.equal(await verifyGoogleToken(await signToken({ email: "amigo@example.com" }), open), "amigo@example.com");
  assert.equal(await verifyGoogleToken(await signToken({ email: "amigo@example.com", email_verified: false }), open), null);
});

function fakeDb() {
  const rows = [];
  const statement = (sql, args = []) => ({
    bind: (...values) => statement(sql, values),
    run: async () => {
      if (sql.startsWith("INSERT") && !rows.some(r => r.email === args[0] && r.id === args[1])) rows.push({ email: args[0], id: args[1] });
      if (sql.startsWith("DELETE")) rows.splice(rows.findIndex(r => r.email === args[0] && r.id === args[1]), 1);
    },
    all: async () => ({ results: rows.filter(r => r.email === args[0]).map(r => ({ listing_id: r.id })) }),
  });
  return { prepare: sql => statement(sql), batch: statements => Promise.all(statements.map(s => s.run())) };
}

const env = { DB: fakeDb(), GOOGLE_CLIENT_ID: CLIENT_ID, ALLOWED_EMAILS: "andy@example.com, nati@example.com", ALLOWED_ORIGINS: ORIGIN };

async function call(method, path, { token, body, email } = {}) {
  const auth = token ?? await signToken(email ? { email } : {});
  const request = new Request(`https://w.dev${path}`, {
    method, headers: { Origin: ORIGIN, Authorization: `Bearer ${auth}` }, body: body && JSON.stringify(body),
  });
  const res = await handle(request, env, async () => keys);
  return { status: res.status, body: await res.json(), cors: res.headers.get("Access-Control-Allow-Origin") };
}

test("each account keeps its own favorites", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  await call("PUT", "/favorites/inmoclick-1-2");
  await call("PUT", "/favorites/inmoup-9", { email: "nati@example.com" });
  const merged = await call("POST", "/favorites/merge", { body: { ids: ["inmoup-5", "inmoclick-1-2"] } });
  assert.deepEqual(merged.body, ["inmoclick-1-2", "inmoup-5"]);
  assert.equal(merged.cors, ORIGIN);
  await call("DELETE", "/favorites/inmoup-5");
  assert.deepEqual((await call("GET", "/favorites")).body, ["inmoclick-1-2"]);
  assert.deepEqual((await call("GET", "/favorites", { email: "nati@example.com" })).body, ["inmoup-9"]);
});

test("requests without a valid token or with bad ids are refused", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  assert.equal((await call("GET", "/favorites", { token: "x.y.z" })).status, 401);
  assert.equal((await call("PUT", "/favorites/<script>")).status, 404);
  assert.equal((await call("POST", "/favorites/merge", { body: { ids: ["../x"] } })).status, 400);
});
