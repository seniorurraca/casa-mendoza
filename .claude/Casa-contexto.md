# Contexto del proyecto Casa Mendoza

App personal de Andy (`seniorurraca`) y Natalí para **comprar casa o terreno en el Gran Mendoza, Argentina**. Todo en español rioplatense.

## Objetivo y criterios del usuario

- Crédito hipotecario preaprobado: **USD 62.000**. Los bancos financian 70–80% del valor, así que el tope real depende de ahorros. El precio máximo es un **filtro editable en la UI** (default 62k), nunca un valor fijo en código.
- Prioridades: **apto crédito hipotecario** y **patio**. Fuera lo que esté a **más de 30 min del centro** (Plaza Independencia) y los **barrios peligrosos**.
- **Terrenos solo si son baratos** (≤ USD 25k y ≥ 200 m²). Construir 70 m² ≈ USD 62k (CAMZA 2026): terreno + obra no entra en el crédito sin financiamiento extra (IPV "Construyo mi casa").
- Investigación de mercado (medianas USD/m² por zona, tiempos al centro, seguridad, fuentes): `research/mercado-mendoza-2026-10.md`.

## Repo y URLs

| Qué | Dónde |
|---|---|
| Repo (público) | `seniorurraca/casa-mendoza`, push directo a `main` |
| Sitio | https://seniorurraca.github.io/casa-mendoza/ (GitHub Pages desde `main` / `docs/`) |
| Worker favoritos | https://casa-mendoza-favoritos.wow-armeria-api.workers.dev (cuenta Cloudflare personal `orozco.andres96`, D1 `casa-mendoza`). `wrangler` ya logueado en la PC |
| Datos | `docs/data/listings.json` + `details.json` + `seen.json` + `runs.json`, generados por Actions. **No editar a mano.** |

## Arquitectura

GitHub Actions (cron) → `scraper/` (Node) → JSON commiteados → GitHub Pages. El navegador hace todo el resto (filtros, zonas, visitas) con `localStorage`. Única pieza con backend: **favoritos por cuenta de Google** en un Cloudflare Worker + D1 (`worker/`).

| Carpeta / archivo | Qué es | Dónde corre | Si cambia → |
|---|---|---|---|
| `scraper/` | Scraper + pipeline (enrich, filtros, dedupe, mercado, puntaje, historial) | GitHub Actions | Push a `main`. Corre en el próximo cron (o a mano con Run workflow) |
| `docs/` | Sitio estático (HTML/CSS/JS sin build) | GitHub Pages | Se publica solo al llegar a `main` (~1 min) |
| `docs/data/` | Salida del scraper | Pages | Solo lo commitea el bot de Actions |
| `config.json` | Fuentes, filtros, zonas peligrosas base, puntaje | scraper (y `dangerZones` viaja al frontend en el JSON) | Push. Impacta en la próxima corrida |
| `.github/workflows/scrape.yml` | Cron full + quick | Actions | Push |
| `test/` | `node:test` sin dependencias, fixtures HTML reales recortados | Local y Actions (antes de scrapear) | — |
| `research/` | Investigación de mercado inicial | — | — |
| `worker/` | Cloudflare Worker `casa-mendoza-favoritos` + D1 `casa-mendoza` (favoritos por cuenta) | Cloudflare (`*.workers.dev`) | `cd worker; npx.cmd wrangler deploy` (no se publica solo) |

### Corridas (`scrape.yml`)

| Modo | Cron UTC | Hora ART | Qué hace | Duración |
|---|---|---|---|---|
| `full` | `0 9 * * *` | 06:00 | Todos los portales. Recalcula medianas. Elimina avisos dados de baja | ~35–40 min |
| `quick` | `0 1,5,13,17,21 * * *` | 22, 02, 10, 14, 18 | Solo fuentes con `quick` en config (Inmoclick, "recientes", 3 páginas por grupo). **Upsert** sobre los datos previos, no borra nada, reusa el `market` previo | ~35 s |

- GitHub retrasa los cron ~20–30 min. Es normal.
- Corre `npm test` antes de scrapear, y hace `git pull --rebase` antes de pushear los datos.
- Si el scraper falla, aborta **sin pisar** los JSON: el sitio sigue con los datos anteriores.
- Todo el output (tests + scraper) va a `run.log` (`tee`, `shell: bash` → pipefail). Si falla, `scraper/log-failure.mjs` agrega la corrida fallida a `runs.json` con las últimas 15 líneas del log, y el paso de commit corre igual (`success() || failure()`). Timeout/cancelación no se registran: la UI los detecta como "sin corridas" (> 8 h).

## Mapa del código

```
scraper/index.mjs              orquestador: --mode full|quick, --max-pages N
scraper/log-failure.mjs        registra una corrida fallida en runs.json (lo llama el workflow)
scraper/sources/inmoclick.mjs  fuente Inmoclick      (detalles en Casa-fuentes.md)
scraper/sources/inmoup.mjs     fuente Inmoup
scraper/lib/
  http.mjs      fetch con User-Agent; status != 200 = error; withRetry (backoff)
  sources.mjs   fetchGroups (grupos + dedupe por id), sourcesFor(config.sources, mode)
  currency.mjs  dólar oficial (dolarapi.com), parsePrice (US$ vs $ ARS)
  text.mjs      normalize (reusa docs/js/text.js), decodeEntities, detectFeatures
  geo.mjs       re-exporta haversine/hasCoords de docs/js/geo.js; minutos = km línea recta × minutesPerKm (1,8)
  enrich.mjs    features (credito/patio/cochera/posesion/reciclar), minutes, ppm
  filters.mjs   AREA_RULES (sin precio, fuera de Gran Mendoza, lejos) / OFFER_RULES (precio alto, terreno caro/chico)
  dedupe.mjs    mismo inmueble en varios portales → uno + alsoOn
  market.mjs    medianas USD/m² por tipo × departamento
  score.mjs     puntaje 0–100, breakdown, suspicious
  history.mjs   readPrevious, registerSeen (registro de ids vistos), withHistory (firstSeen, firstSeenAt, prevUsd), upsert
  files.mjs     readJson, writeJson, dataFile (ruta dentro de docs/data)
  runs.mjs      appendRun (máx. 60, la más nueva primero), logTail, runUrl (link a Actions)
docs/js/
  app.js            orquestación UI: estado, eventos, diálogos
  filters.js        DEFAULT_FILTERS, applyFilters, favoriteListings, loadFilters (descarta claves viejas)
  zones.js          barrios peligrosos (texto) + áreas por radio: defaults + prefs del usuario → zone + penalidad
  geo.js            haversineKm, hasCoords (compartido con el scraper)
  visits.js         última visita, markNew, seenAt
  card.js / detail.js / listing-view.js   tarjeta, detalle y helpers compartidos
  carousel.js       carrusel pantalla completa (flechas, teclado, swipe)
  settings.js       diálogo ⚙ Configuración (barrios)
  runs.js           healthOf(runs): ok | fail | stale (> 8 h sin corrida OK) | unknown
  runs-dialog.js    diálogo 📋 Registro + punto rojo en el botón si fail/stale
  multiselect.js    combo multi-selección (Tipo, Departamento, Portales)
  loaders.js        fotos (API Inmoclick o details.json) + descripción, con caché
  account.js        login Google Identity Services (botón, auto_select, renueva el token 1 min antes de vencer)
  account-config.js GOOGLE_CLIENT_ID + FAVORITES_API (vacíos → sin login, favoritos solo en el navegador)
  google-token.js   tokenClaims, isFresh, msUntilRefresh
  favorites-api.js  merge / add / remove contra el Worker
  maps.js, format.js, icons.js, storage.js, text.js
worker/src/
  index.mjs         rutas + CORS (ALLOWED_ORIGINS)
  google-token.mjs  verifica el ID token: firma RS256 con las claves de Google, iss, aud = GOOGLE_CLIENT_ID, exp, email_verified, email ∈ ALLOWED_EMAILS ("*" = cualquiera)
  favorites.mjs     SQL D1 (tabla en worker/schema.sql)
```

## Pipeline del scraper

1. Dólar oficial venta.
2. `sourcesFor(config.sources, mode)` → `fetchAll()` de cada fuente → `enrich()`.
3. `AREA_RULES`.
4. quick: `upsert(previous.hydrated, nuevos)`. full: solo lo scrapeado.
5. `dedupe()`: distinto portal, mismo tipo, precio ±2%, < 200 m, superficie ±10%. Gana el más completo (más fotos + descripción); los demás → `alsoOn` (se conserva entre corridas).
6. `buildMarket()` (solo full): mediana USD/m² por tipo × departamento. Segmento casas USD 15–90k, terrenos 3–90k; fallback a la mediana general si n < 5. **Antes** de `OFFER_RULES` para no sesgar terrenos.
7. `OFFER_RULES` (> USD 150k; terreno > 25k o < 200 m²).
8. `registerSeen()` + `scoreListing()` + `withHistory()` → `listings.json` + `details.json` + `seen.json`; se agrega la corrida a `runs.json`.
   - `seen.json` = `{ id: firstSeenAt }` de **todo** lo scrapeado (también descartados y perdedores del dedupe), nunca se borra. `firstSeenAt` sale de ahí: un aviso que falta en una corrida y vuelve, que cambia de ganador en el dedupe o que baja de precio y entra **no** es nuevo. Antes de esto (hasta 2026-10-20) eso generaba falsos NUEVO.

### Puntaje (`score.mjs`, pesos en `config.scoring`)

| Factor | Pts | Cálculo |
|---|---|---|
| Precio vs zona | 35 | descuento vs mediana: 0 a −20%, máx a +40% |
| Apto crédito | 25 | campo estructurado del portal; si falta, regex (con negación "no apto") |
| Patio | 15 | regex o `supT − supC ≥ 50` |
| Cercanía | 10 | máx ≤ 10 min, 0 a 30 min |
| Tamaño | 10 | ≥ 2 dorm y ≥ 70 m² |
| Cochera | 5 | atributo o regex |

- Terrenos: solo precio + cercanía, normalizado a 100.
- Penalidades: posesión/boleto/sin escritura −30, a reciclar −10, zona "Advertir" −15 (la aplica el **frontend**).
- `suspicious` si el descuento es > 55%.

## Datos generados

- `listings.json`:
  - Raíz: `generatedAt`, `startedAt`, `lastFullAt`, `usdRate`, `stats`, `dangerZones`, `zonePenalty`, `market`, `listings[]`.
  - Cada listing: `id` (`{source}-{usr}-{prp}`), `source`, `type` (casa|terreno), `url`, `photo`, `photosApi`, `photoCount`, `usd`, `priceRaw`, `supT`, `supC`, `dorm`, `banos`, `lat`, `lng`, `department`, `address`, `locationText` (normalizado, para barrios), `publishedAt`, `agency`, `features{credito,patio,cochera,posesion,reciclar}`, `minutes`, `ppm`, `alsoOn[]`, `score`, `discount`, `zonePpm`, `breakdown[]`, `suspicious`, `firstSeen` (fecha), `firstSeenAt` (ISO; null en avisos anteriores al 2026-10-19), `prevUsd`.
- `details.json`: `{ [id]: { description, photos[] } }`.
- `seen.json`: `{ [id]: firstSeenAt }`. Solo lo usa el scraper.
- `runs.json`: últimas 60 corridas, la más nueva primero: `mode`, `ok`, `startedAt` (null si falló), `finishedAt`, `scanned{fuente: n}`, `kept`, `new`, `error` (tail del log), `url` (run de Actions).
- Peso: ~4 MB + ~6,5 MB sin comprimir (~650 KB gzip la lista). Si molesta en móvil → partir en archivos más chicos.

## Frontend

- **Diseño (rediseño 2026-10-20, estilo marketplace tipo Airbnb/Zillow):** barra superior fija (marca, íconos Registro y Configuración, cuenta Google a la derecha: botón GIS o avatar con menú). Hero con resumen. Barra de filtros: segmentado Todo/Casas/Terrenos (`typeChoice` → `filters.types`), "Hasta USD", combo de Departamento y chip Apto crédito; panel "Más filtros" (mín., portales, minutos, solo con patio, ocultar precios sospechosos con explicación) con contador (`advancedCount`). Tarjeta: foto 4:3, puntaje arriba-izq., corazón arriba-der., NUEVO abajo-izq.; precio + descuento, hechos con íconos; tocar la tarjeta abre el detalle. Fuente Inter (Google Fonts). Tokens de color en `:root` con modo oscuro. Íconos en HTML estático: `data-icon` + `fillIcons()`.
- **Temas:** botón paleta en la barra: Automático (sigue al dispositivo), Claro, Oscuro, Lavanda, Durazno, Menta. **Por defecto: Claro** (pedido del usuario), aunque el dispositivo esté en oscuro. Se guarda en `casa-mendoza:theme`. El CSS define tokens por `:root[data-theme="…"]`; `js/theme-boot.js` (script clásico en el `<head>` de las 3 páginas) pone `data-theme` antes de pintar, para que no parpadee. `theme.js` = `THEMES`, `resolveTheme`, selector.
- **📋 Registro solo para admin:** el botón se muestra solo si el mail logueado está en `ADMIN_EMAILS` (`account-config.js`). Es solo visual: `data/runs.json` es público igual.
- **Tabs Todos / ♥ Favoritos:** Favoritos ignora todos los filtros (y las zonas "Ocultar"), ordena del último guardado al primero (`favoriteListings`) y cuenta los que ya no están publicados. En esa tab se oculta el formulario.
- **Filtros:** precio mín/máx; Tipo (segmentado); Departamento / Portales (multi-selección, `[]` = todos; tocar una opción desde "Todos" elige solo esa, destildar la última vuelve a todos); minutos; apto crédito; patio; ocultar sospechosos. El `<select name="sort">` está fuera del form (`form="filters"`), por eso el listener de input es en `document` filtrando `target.form`. Orden: puntaje, precio, descuento vs zona, más nuevos.
- **⚙ Configuración — barrios peligrosos:** la base viene de `config.dangerZones` y el usuario la edita (activar/desactivar, agregar). "Ocultar" (high) saca el aviso; "Advertir" (medium) muestra un chip y resta 15. Matchea contra `locationText` (dirección + slug). Ojo con nombres que también son calles.
- **Ocultar por ubicación:** en el detalle de un aviso con coordenadas, "Ocultar 200 / 500 m alrededor" (`areaZone`) → zona `high` por radio (haversine), sin saber el nombre del barrio. Pide confirmación con la cantidad de avisos. Se guarda en `prefs.areas` (`casa-mendoza:zones`) y se quita en ⚙ Configuración → "Ocultos por ubicación".
- **Detalle** en diálogo: galería, datos, descripción, links a todos los portales, Google Maps (`/maps/search/?api=1&query=lat,lng`, o la dirección si no hay coordenadas).
- **Carrusel** a pantalla completa desde la foto de la tarjeta. Badge "1/N" solo si hay más de 1 foto; Inmoclick no informa el total → solo ícono.
- **Visitas:** banner "N avisos nuevos desde tu última visita (dd/mm/aaaa hh:mm)" + tag NUEVO abajo a la izquierda de la foto (arriba a la derecha está el puntaje). Sin visita previa → nuevo = últimos 3 días.
- **📋 Registro:** lista de corridas (`runs.json`), estado general y link a cada run de Actions. Si `runs.json` no existe → lista vacía.
- **Favoritos por cuenta:** "Iniciar sesión" (Google) a la derecha de las tabs. Al entrar, los favoritos del navegador se suman a la cuenta (`POST /favorites/merge`) y se borran del `localStorage`. Cada mail tiene su lista. Al salir vuelve a los favoritos locales (vacíos). Cambios optimistas: si el Worker falla, se revierte y avisa.
  - API: `POST /favorites/merge {ids}` → lista; `PUT|DELETE /favorites/:id`. Header `Authorization: Bearer <ID token de Google>`.
  - **Registro abierto** (decisión del usuario 2026-10-20): `ALLOWED_EMAILS = "*"` en `wrangler.toml` → cualquier cuenta Google con mail verificado tiene su lista. Para cerrarlo: lista de mails separada por comas (mejor como `wrangler secret`, no en el repo público).
  - App OAuth "Casa Mendoza" (proyecto Google Cloud `casa-mendoza-512222`) publicada en **Producción**; solo scopes básicos (openid/email/profile) → sin verificación de Google ni dominio propio. Orígenes autorizados: `https://seniorurraca.github.io`, `http://localhost:8080`.
- **Storage:**
  - `localStorage`: `casa-mendoza:filters`, `:favorites` (solo sin login), `:zones`, `:last-visit`, `:google-token`, `:theme`.
  - `sessionStorage`: `casa-mendoza:visit-baseline` (recargar no reinicia la visita).
  - Todo es por navegador: celular y PC son independientes.
- Cards: foto 4:3 fija (`object-fit: cover`), título y dirección en 1 línea.

## Config (`config.json`) — lo más tocado

- `maxUsdStored` (150000): tope de lo que se guarda (y filtro de URL de Inmoup).
- `maxMinutes`, `minutesPerKm`, `centro`, `departments`, `terreno.{maxUsd,minM2}`.
- `sources.{name}`: `groups`, `delayMs` (3000), `maxPages`, `retry {retries, backoffMs}`, `quick {…}` (Inmoclick), `maxUsd` (Inmoup).
- `features`: regex sobre texto normalizado (minúsculas, sin acentos).
- `dangerZones[]`: `{name, pattern (regex), level: high|medium}`.
- `segment`, `scoring`.

## Qué hago yo vs. el usuario

Hago yo (sin pedir): editar código, tests, commit + push a `main`, disparar o revisar workflows con `gh`, probar el sitio local en el navegador integrado.

Hace el usuario: usar el sitio, decidir criterios (precio, zonas, pesos), revisar la lista de barrios peligrosos.

Nunca: scrapear desde su PC; evadir bloqueos (ver `CLAUDE.md`).

## Comandos

```bash
npm test                                             # node --test test/*.test.mjs
npx http-server docs -p 8080 -c-1                    # sitio local con los datos commiteados
gh run list -R seniorurraca/casa-mendoza --workflow scrape.yml --limit 5
gh workflow run scrape.yml -R seniorurraca/casa-mendoza -f mode=quick   # o mode=full
```

Para el usuario (PowerShell): `npm.cmd` / `npx.cmd`, `;` en lugar de `&&`, `cd` a la ruta absoluta.

## Git

- Auth: `gh` logueado como `seniorurraca`; config **local** del repo: `credential.helper=!gh auth git-credential`, `credential.https://github.com.username=seniorurraca`, `pull.rebase=true`, `core.longpaths=true`, `user.name/email` = seniorurraca.
- Actions commitea datos varias veces por día → **siempre `git pull --rebase` antes de push**. Evitar pushear mientras corre un `full`.
- Commits: `<área>: <qué cambió>` en español (áreas: `scraper`, `ui`, `config`, `workflow`, `docs`, `tests`), ej. `ui: badge de fotos 1/N`. Los de datos los hace el bot (`data: actualizar avisos YYYY-MM-DD`).
- Windows: el working tree tiene CRLF (autocrlf). En reemplazos por script, normalizar `\r\n` → `\n` antes de buscar.

## Convenciones de código

- Node ≥ 20, ESM, **cero dependencias** (scraper y frontend). Sin build.
- Lógica pura separada del DOM, para testearla con `node:test` (los tests importan `docs/js/*.js`).
- Cada bug se reproduce primero con un test. Fixtures reales recortados en `test/fixtures/`.

## Checklist de cada fix/feature

1. Leer este archivo y `Casa-fuentes.md` si toca el scraper.
2. Test que falle → cambio → `npm test` en verde.
3. UI: probar con `npx http-server docs` en el navegador integrado (escritorio + 375 px, sin scroll horizontal, consola sin errores).
4. Actualizar este contexto si cambia arquitectura, datos, config o comportamiento.
5. `git pull --rebase` → commit → push a `main`. Verificar el deploy de Pages (`gh run list`).
6. No disparar scraping si el usuario no lo pidió: los cambios del scraper rigen desde la próxima corrida programada.

## Historial de decisiones

- Python no estaba instalado → todo en Node, un solo lenguaje.
- Zonas peligrosas filtradas en el frontend (no en el scraper) para que el usuario las edite.
- Apto crédito: campo estructurado del portal > regex de texto.
- Corridas quick cada 4 h (pedido del usuario): para enterarse antes de lo nuevo. No bajan el riesgo de bloqueo: eso lo hacen el delay y pedir menos páginas.
- Sin base de datos: el registro de ids vistos (`seen.json`) y el log de corridas (`runs.json`) son JSON commiteados por Actions. Cloudflare (Worker + KV/D1) queda para lo que necesite escribir desde el navegador (favoritos sincronizados).
- El Worker usa el subdominio `wow-armeria-api.workers.dev` porque es único por cuenta de Cloudflare y la cuenta ya lo tenía de otro proyecto (una armería). El usuario decidió dejarlo (2026-10-20): no cambiarlo, porque rompería los Workers de ese otro proyecto.
- Nombre del sitio "Casa Mendoza" (antes "Próximo hogar · Andy & Natalí"; se cambió el 2026-10-20 para poder compartirlo) + favicon casita con corazón (`docs/favicon.svg`).

## Ideas pendientes

- Alertas (Telegram/email) para avisos con puntaje > 85 ("a futuro").
- Mapa con todos los avisos (Leaflet + OSM).
- Más fuentes: RE/MAX, MercadoLibre (API oficial), alertas por email de Zonaprop/Argenprop vía Cloudflare Email Worker, bookmarklet.
- Partir `details.json` si pesa demasiado en móvil.
- Recalibrar `minutesPerKm` con tiempos reales (OSRM) por zona.
