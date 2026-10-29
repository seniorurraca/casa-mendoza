# Contexto del proyecto Casa Mendoza

App personal de Andy (`seniorurraca`) y Natalí para **comprar casa o terreno en el Gran Mendoza, Argentina**. Todo en español rioplatense.

## Objetivo y criterios del usuario

- Crédito hipotecario preaprobado: **USD 62.000**. Los bancos financian 70–80% del valor, así que el tope real depende de ahorros. El precio máximo es un **filtro editable en la UI** (default 62k), nunca un valor fijo en código.
- Prioridades: **apto crédito hipotecario** y **patio**. Fuera lo que esté a **más de 30 min del centro** (Plaza Independencia) y los **barrios peligrosos**.
- También **departamentos** (venta, filtrables, no incluidos por defecto) y **alquileres** (casas y deptos, precio en $/mes, tope default $1.000.000 editable).
- **Terrenos solo si son baratos** (≤ USD 25k y ≥ 200 m²). Construir 70 m² ≈ USD 62k (CAMZA 2026): terreno + obra no entra en el crédito sin financiamiento extra (IPV "Construyo mi casa").
- Investigación de mercado (medianas USD/m² por zona, tiempos al centro, seguridad, fuentes): `research/mercado-mendoza-2026-10.md`.

## Repo y URLs

| Qué | Dónde |
|---|---|
| Repo (público) | `seniorurraca/casa-mendoza`, push directo a `main` |
| Sitio | **https://casa-mendoza.pages.dev** (Cloudflare Pages conectado al repo: cada push a `main` publica `docs/`, sin build). Para que la URL no muestre el usuario de GitHub (2026-10-20). **GitHub Pages está apagado** (la dirección `seniorurraca.github.io/casa-mendoza` da 404) |
| Worker favoritos | https://casa-mendoza-favoritos.wow-armeria-api.workers.dev (cuenta Cloudflare personal `orozco.andres96`, D1 `casa-mendoza`). `wrangler` ya logueado en la PC |
| Datos | `docs/data/listings.json` + `details.json` + `seen.json` + `runs.json`, generados por Actions. **No editar a mano.** |

## Arquitectura

GitHub Actions (cron) → `scraper/` (Node) → JSON commiteados → Cloudflare Pages. El navegador hace todo el resto (filtros, zonas, visitas) con `localStorage`. Única pieza con backend: **favoritos por cuenta de Google** en un Cloudflare Worker + D1 (`worker/`).

| Carpeta / archivo | Qué es | Dónde corre | Si cambia → |
|---|---|---|---|
| `scraper/` | Scraper + pipeline (enrich, filtros, dedupe, mercado, puntaje, historial) | GitHub Actions | Push a `main`. Corre en el próximo cron (o a mano con Run workflow) |
| `docs/` | Sitio estático (HTML/CSS/JS sin build) | Cloudflare Pages | Se publica solo al llegar a `main` (~1 min) |
| `docs/data/` | Salida del scraper | Cloudflare Pages | Solo lo commitea el bot de Actions |
| `config.json` | Fuentes, filtros, zonas peligrosas base, puntaje | scraper (y `dangerZones` viaja al frontend en el JSON) | Push. Impacta en la próxima corrida |
| `.github/workflows/scrape.yml` | Cron full + quick | Actions | Push |
| `test/` | `node:test` sin dependencias, fixtures HTML reales recortados | Local y Actions (antes de scrapear) | — |
| `research/` | Investigación de mercado inicial | — | — |
| `worker/` | Cloudflare Worker `casa-mendoza-favoritos` + D1 `casa-mendoza` (favoritos por cuenta) | Cloudflare (`*.workers.dev`) | `cd worker; npx.cmd wrangler deploy` (no se publica solo) |

### Corridas (`scrape.yml`)

| Modo | Cron UTC | Hora ART | Qué hace | Duración |
|---|---|---|---|---|
| `full --segment venta` | `0 9 * * *` | 06:00 | Casas y terrenos en venta, todos los portales. Recalcula medianas de su segmento. Elimina bajas **de su segmento** | ~45–50 min |
| `full --segment deptos` | `0 11 * * *` | 08:00 | Departamentos en venta (Inmoup, MendozaProp) | ~10 min |
| `full --segment alquiler` | `0 12 * * *` | 09:00 | Casas y deptos en alquiler (Inmoup, MendozaProp) | ~10 min |
| `quick` | **sin cron** (desde 2026-10-24, solo a mano con Run workflow) | — | Solo fuentes con `quick` en config (Inmoclick "recientes" 1 página de 200 por grupo). **Upsert** sobre los datos previos, no borra nada, reusa el `market` previo | ~35 s |

- **Por qué 3 corridas full y no 1 larga** (estudio 2026-10-20): cada job corre en una VM nueva de GitHub (IP distinta), con ráfagas cortas separadas 1–2 h; si una falla, las otras no se pierden. Partir más la venta no baja los pedidos diarios por portal, solo los reparte.
- Inmoclick solo está en el segmento venta: sus URLs de alquiler/deptos no se pudieron verificar (IP de la casa bloqueada).
- GitHub retrasa los cron ~20–30 min. Es normal.
- Corre `npm test` antes de scrapear, y hace `git pull --rebase` antes de pushear los datos.
- **Fuentes aisladas** (desde 2026-10-24, `collectSources`): si un portal falla, la corrida sigue con los demás y se conservan los avisos anteriores de ese portal (`replaceSegment(..., keepSources)`). Se registra en `runs.json` como `failed{fuente: error}` y el 📋 Registro lo muestra en rojo. Antes, un 403 de RE/MAX (21–24/10) tiró **todas** las corridas 4 días y descartó ~365 páginas ya bajadas de Inmoclick/Inmoup.
- **403 = bloqueo → sin reintentos** (`withRetry` corta en `status === 403`): reintentar un bloqueo suma pedidos y empeora. 202/5xx sí se reintentan.
- Si **todas** las fuentes fallan, aborta **sin pisar** los JSON: el sitio sigue con los datos anteriores.
- Todo el output (tests + scraper) va a `run.log` (`tee`, `shell: bash` → pipefail). Si falla, `scraper/log-failure.mjs` agrega la corrida fallida a `runs.json` con las últimas 15 líneas del log, y el paso de commit corre igual (`success() || failure()`). Timeout/cancelación no se registran: la UI los detecta como "sin corridas" (> 8 h).

## Mapa del código

```
scraper/index.mjs              orquestador: --mode full|quick, --max-pages N
scraper/log-failure.mjs        registra una corrida fallida en runs.json (lo llama el workflow)
scraper/sources/inmoclick.mjs  fuente Inmoclick      (detalles en Casa-fuentes.md)
scraper/sources/inmoup.mjs     fuente Inmoup
scraper/sources/remax.mjs      fuente RE/MAX (fuera de config desde 2026-10-24 por 403)
scraper/sources/mendozaprop.mjs fuente MendozaProp (API JSON, sin coordenadas)
scraper/lib/
  http.mjs      fetch con User-Agent; status != 200 = error; withRetry (backoff)
  sources.mjs   fetchGroups (grupos + dedupe por id), fetchPaginated (páginas con total + reintento; Inmoup y RE/MAX), sourcesFor(config.sources, mode)
  currency.mjs  dólar oficial (dolarapi.com), parsePrice (US$ vs $ ARS)
  text.mjs      normalize (reusa docs/js/text.js), decodeEntities, detectFeatures
  geo.mjs       re-exporta haversine/hasCoords de docs/js/geo.js; minutos = km línea recta × minutesPerKm (1,8)
  enrich.mjs    ubicación (departments), features (credito/patio/cochera/posesion/reciclar), minutes, ppm
  departments.mjs departmentAt (punto en polígono IGN) + isPlaceholder (pines por defecto de los portales)
scraper/data/departamentos-mendoza.json  polígonos de los 18 departamentos (IGN, simplificados ~10 m)
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
  visits.js         seenAt (fecha de primera aparición, para ordenar)
  card.js / detail.js / listing-view.js   tarjeta, detalle y helpers compartidos
  carousel.js       carrusel pantalla completa (flechas, teclado, swipe)
  settings.js       diálogo ⚙ Configuración (barrios)
  runs.js           healthOf(runs): ok | fail | stale (> 8 h sin corrida OK) | unknown
  runs-dialog.js    diálogo 📋 Registro + punto rojo en el botón si fail/stale
  multiselect.js    combo multi-selección (Tipo, Departamento, Portales)
  loaders.js        fotos (API Inmoclick o details.json) + descripción, con caché
  account.js        login Google Identity Services (botón, auto_select, renueva el token 1 min antes de vencer). Botón GIS: "standard" > 480 px, "icon" ≤ 480 px; se vuelve a dibujar al cruzar ese ancho (`compactScreen` change), si no el botón ancho desbordaba al girar el celular
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
2. `sourcesFor(config.sources, mode, segment)` (grupos de `sources.{name}.segments[segment]`) → `fetchAll({..., operation})` → `enrich({...l, operation})`.
   - Ubicación (desde 2026-10-20): si las coordenadas son un pin por defecto (`config.placeholderCoords`, radio 100 m) → `lat/lng = null` (sin minutos, se queda el departamento del portal). Si no, el **departamento sale de las coordenadas** (punto en polígono IGN), no del texto del portal: antes una casa en Godoy Cruz sobre calle Maipú quedaba como "Maipú". Fuera de todos los polígonos → se queda el del portal. Con los datos del 2026-10-20: ~100 avisos cambian de departamento y 34 tenían pin falso.
3. `AREA_RULES`.
4. quick (siempre venta): `upsert(previous.hydrated, nuevos)`. full: `replaceSegment(previous.hydrated, nuevos, segment)` → solo reemplaza los avisos de ese segmento (`segmentOf`: alquiler → "alquiler"; departamento en venta → "deptos"; resto → "venta").
5. `dedupe()`: distinto portal, mismo tipo, precio ±2%, < 200 m, superficie ±10% (sin coordenadas: mismo departamento y superficie obligatoria). Gana el más completo (más fotos + descripción); los demás → `alsoOn` (se conserva entre corridas). Si el ganador no tiene coordenadas (casi siempre MendozaProp), hereda `lat/lng/minutes` de un duplicado que sí las tenga (desde 2026-10-28: antes ~1.340 avisos quedaban sin ubicación → sin ícono de ocultar zona, sin minutos ni puntaje de cercanía).
6. `buildMarket(unique, config.segment, MARKET_KEYS[segment])` (solo full; las demás claves se conservan): mediana USD/m² por clave × departamento. Claves (`marketKey`): `casa`, `terreno`, `departamento`, `alquiler-casa`, `alquiler-departamento` (alquiler en USD/m²/mes). m² útil (`usefulArea`): casa = cubierta, terreno = total, depto = cubierta o total. Segmento casas USD 15–90k, terrenos 3–90k; fallback a la mediana general si n < 5. **Antes** de `OFFER_RULES` para no sesgar terrenos.
7. `OFFER_RULES` (> USD 150k; terreno > 25k o < 200 m²).
8. `registerSeen()` + `scoreListing()` + `withHistory()` + `flagNew()` → `listings.json` + `details.json` + `seen.json`; se agrega la corrida a `runs.json`.
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
- Departamentos: como casas, pero el patio solo cuenta si el texto lo menciona (no por m² libres).
- Alquileres: sin factor "Apto crédito".
- Penalidades: posesión/boleto/sin escritura −30, a reciclar −10, zona "Advertir" −15 (la aplica el **frontend**).
- `suspicious` si el descuento es > 55%.

## Datos generados

- `listings.json`:
  - Raíz: `generatedAt`, `startedAt`, `lastFullAt`, `usdRate`, `stats`, `dangerZones`, `zonePenalty`, `market`, `listings[]`.
  - Cada listing: `id` (`{source}-{usr}-{prp}`), `source`, `type` (casa|terreno|departamento), `operation` (venta|alquiler; ausente = venta), `url`, `photo`, `photosApi`, `photoCount`, `usd`, `priceRaw`, `supT`, `supC`, `dorm`, `banos`, `lat`, `lng`, `department`, `address`, `locationText` (normalizado, para barrios), `publishedAt`, `agency`, `features{credito,patio,cochera,posesion,reciclar}`, `minutes`, `ppm`, `alsoOn[]`, `score`, `discount`, `zonePpm`, `breakdown[]`, `suspicious`, `firstSeen` (fecha), `firstSeenAt` (ISO; null en avisos anteriores al 2026-10-19), `prevUsd`.
- `details.json`: `{ [id]: { description, photos[] } }`.
- `seen.json`: `{ [id]: firstSeenAt }`. Solo lo usa el scraper.
- `runs.json`: últimas 60 corridas, la más nueva primero: `mode`, `ok`, `startedAt` (null si falló), `finishedAt`, `scanned{fuente: n}`, `kept`, `new`, `failed{fuente: error}` (fuentes caídas en una corrida OK), `error` (tail del log), `url` (run de Actions).
- Peso: ~4 MB + ~6,5 MB sin comprimir (~650 KB gzip la lista). Si molesta en móvil → partir en archivos más chicos.

## Frontend

- **Diseño (rediseño 2026-10-20, estilo marketplace tipo Airbnb/Zillow):** barra superior fija (marca, íconos Registro y Configuración, cuenta Google a la derecha: botón GIS o avatar con menú). Hero con resumen. Barra de filtros: segmentado Todo/Casas/Terrenos (`typeChoice` → `filters.types`), "Hasta USD", combo de Departamento y chip Apto crédito; panel "Más filtros" (mín., portales, minutos, solo con patio, ocultar precios sospechosos con explicación) con contador (`advancedCount`). Tarjeta: foto 4:3, puntaje arriba-izq., corazón arriba-der., NUEVO abajo-izq.; precio + descuento, hechos con íconos; tocar la tarjeta abre el detalle. Fuente Inter (Google Fonts). Tokens de color en `:root` con modo oscuro. Íconos en HTML estático: `data-icon` + `fillIcons()`.
- **Temas:** botón paleta en la barra: Automático (sigue al dispositivo), Claro, Oscuro, Lavanda, Durazno, Menta. **Por defecto: Claro** (pedido del usuario), aunque el dispositivo esté en oscuro. Se guarda en `casa-mendoza:theme`. El CSS define tokens por `:root[data-theme="…"]`; `js/theme-boot.js` (script clásico en el `<head>` de las 3 páginas) pone `data-theme` antes de pintar, para que no parpadee. `theme.js` = `THEMES`, `resolveTheme`, selector.
- **📋 Registro solo para admin:** el botón se muestra solo si el mail logueado está en `ADMIN_EMAILS` (`account-config.js`). Es solo visual: `data/runs.json` es público igual.
- **Tabs Todos / ♥ Favoritos:** Favoritos ignora todos los filtros (y las zonas "Ocultar"), ordena del último guardado al primero (`favoriteListings`) y cuenta los que ya no están publicados. En esa tab se oculta el formulario.
- **Comprar / Alquilar** (`filters.operation`): primer selector de la barra. Comprar usa `minUsd/maxUsd` y "Todo" = casas + terrenos; Alquilar usa `minArs/maxArs` (default máx. $1.000.000) y "Todo" = casas + deptos (oculta Terrenos y Apto crédito). Cambiar de operación resetea el tipo. El precio de alquiler se guarda en USD y el sitio lo pasa a $/mes con el dólar del día (`monthlyArs`, redondeo a miles) → `l.ars`.
- **Filtros:** precio mín/máx; Tipo (segmentado: Todo / Casas / Deptos / Terrenos); Departamento / Portales (multi-selección, `[]` = todos; tocar una opción desde "Todos" elige solo esa, destildar la última vuelve a todos); minutos; apto crédito; patio; ocultar sospechosos. El `<select name="sort">` está fuera del form (`form="filters"`), por eso el listener de input es en `document` filtrando `target.form`. Orden: puntaje, precio, descuento vs zona, más nuevos.
- **⚙ Configuración — barrios peligrosos:** la base viene de `config.dangerZones` y el usuario la edita (activar/desactivar, agregar). "Ocultar" (high) saca el aviso; "Advertir" (medium) muestra un chip y resta 15. Matchea contra `locationText` (dirección + slug). Ojo con nombres que también son calles.
- **Ocultar por ubicación:** en el pie de la **tarjeta** (junto a Google Maps y aviso original; desde 2026-10-27, antes estaba al fondo del detalle y no se veía), un solo ícono de ojo tachado que abre un menú con "200 m alrededor" / "500 m alrededor" (`ignoreMenu` en `listing-view.js`, `<details class="ignore-menu">`, se cierra al tocar afuera; solo si el aviso tiene coordenadas) (`areaZone`) → zona `high` por radio (haversine), sin saber el nombre del barrio. Pide confirmación con la cantidad de avisos. Se guarda en `prefs.areas` (`casa-mendoza:zones`) y se quita en ⚙ Configuración → "Ocultos por ubicación".
- **Detalle** en diálogo: galería, datos, descripción, links a todos los portales, Google Maps (`/maps/search/?api=1&query=lat,lng`, o la dirección si no hay coordenadas).
- **Carrusel** a pantalla completa desde la foto de la tarjeta. Badge "1/N" solo si hay más de 1 foto; Inmoclick no informa el total → solo ícono.
- **Nuevo (desde 2026-10-20):** lo calcula el scraper (`flagNew`, campo `isNew`), igual para todos y en cualquier dispositivo. Nuevo = no estaba en la corrida **full** anterior de su segmento: lo encontrado en una full queda nuevo hasta la full siguiente (24 h); lo encontrado en una quick queda nuevo hasta la próxima full de venta (06:00). La primera full de un segmento es línea de base (nada nuevo). `lastFullBySegment` en `listings.json`. Banner "N avisos nuevos hoy" + tag NUEVO abajo a la izquierda de la foto. Contra (aceptada por el usuario): si no entrás en varios días, solo ves como nuevo lo del último día; "Más nuevos" ordena por `firstSeenAt`.
- **📋 Registro:** lista de corridas (`runs.json`), estado general y link a cada run de Actions. Si `runs.json` no existe → lista vacía.
- **Favoritos por cuenta:** "Iniciar sesión" (Google) a la derecha de las tabs. Al entrar, los favoritos del navegador se suman a la cuenta (`POST /favorites/merge`) y se borran del `localStorage`. Cada mail tiene su lista. Al salir vuelve a los favoritos locales (vacíos). Cambios optimistas: si el Worker falla, se revierte y avisa.
  - API: `POST /favorites/merge {ids}` → lista; `PUT|DELETE /favorites/:id`. Header `Authorization: Bearer <ID token de Google>`.
  - **Registro abierto** (decisión del usuario 2026-10-20): `ALLOWED_EMAILS = "*"` en `wrangler.toml` → cualquier cuenta Google con mail verificado tiene su lista. Para cerrarlo: lista de mails separada por comas (mejor como `wrangler secret`, no en el repo público).
  - App OAuth "Casa Mendoza" (proyecto Google Cloud `casa-mendoza-512222`) publicada en **Producción**; solo scopes básicos (openid/email/profile) → sin verificación de Google ni dominio propio. Orígenes autorizados: `https://casa-mendoza.pages.dev`, `http://localhost:8080` (los mismos en `ALLOWED_ORIGINS` del Worker). Branding: `/`, `/privacidad`, `/condiciones` en pages.dev (Pages sirve sin `.html`; con `.html` hace 308).
- **Storage:**
  - `localStorage`: `casa-mendoza:filters`, `:favorites` (solo sin login), `:zones`, `:google-token`, `:theme`. (`:last-visit` y `visit-baseline` quedaron sin uso.)
  - Todo es por navegador: celular y PC son independientes.
- Cards: foto 4:3 fija (`object-fit: cover`), título y dirección en 1 línea.

## Config (`config.json`) — lo más tocado

- `maxUsdStored` (150000): tope de lo que se guarda (y filtro de URL de Inmoup).
- `maxMinutes`, `minutesPerKm`, `centro`, `departments`, `terreno.{maxUsd,minM2}`.
- `placeholderCoords[]`: pines por defecto que usan los portales cuando el aviso no tiene ubicación (`-32.87505,-68.83456` de Inmoup/Inmoclick, compartido por ~30 avisos de distintos departamentos; el centro de la Ciudad). Si aparece otro: coordenada idéntica repetida en avisos de departamentos distintos.
- Polígonos de departamentos: WFS del IGN (`https://wms.ign.gob.ar/geoserver/ows?service=WFS&version=1.1.0&request=GetFeature&typeName=ign:departamento&outputFormat=application/json&CQL_FILTER=in1+like+%2750%25%27`), simplificados con Douglas-Peucker a 0,0001° y nombres sin acentos. Validados contra OpenStreetMap. Ojo: Inmoup redondea a 3 decimales (~100 m) muchas coordenadas → en el borde entre departamentos puede errar.
- `sources.{name}`: `segments.{venta|deptos|alquiler}` (grupo → tipo; la clave del grupo arma la URL), `delayMs` (3000), `maxPages`, `retry {retries, backoffMs}`, `quick {…}` (Inmoclick), `maxUsd` (Inmoup).
- `features`: regex sobre texto normalizado (minúsculas, sin acentos).
- `dangerZones[]`: `{name, pattern (regex), level: high|medium}`.
- `segment` (rangos de mercado por clave), `scoring`.

## Qué hago yo vs. el usuario

Hago yo (sin pedir): editar código, tests, commit + push a `main`, disparar o revisar workflows con `gh`, probar el sitio local en el navegador integrado, publicar el Worker y consultar D1 con `wrangler` (logueado en la PC del usuario), actualizar este contexto.

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
5. `git pull --rebase` → commit → push a `main`. Verificar el deploy en Cloudflare Pages (`curl -I https://casa-mendoza.pages.dev/…` o el panel de Cloudflare). Si cambió `worker/`: `cd worker; npx wrangler deploy` (no se publica con el push).
6. No disparar scraping si el usuario no lo pidió: los cambios del scraper rigen desde la próxima corrida programada.
7. **Siempre** actualizar este archivo al terminar cada cambio (pedido explícito del usuario): arquitectura, URLs, config, decisiones y comportamiento nuevo, para que la próxima conversación arranque con todo.

## Historial de decisiones

- Python no estaba instalado → todo en Node, un solo lenguaje.
- Zonas peligrosas filtradas en el frontend (no en el scraper) para que el usuario las edite.
- Apto crédito: campo estructurado del portal > regex de texto.
- Corridas quick cada 4 h (pedido del usuario, 2026-10-19) → **quitadas del cron el 2026-10-24** (pedido del usuario: scrapear 1 vez por día para no ser bloqueados). Cada página de cada portal se pide 1 vez por día. Rotar IPs/proxies para esquivar bloqueos **no se hace** (evasión). Juntar las 3 corridas en una o sacar filtros **no** baja pedidos (son por página; sin filtro de precio hay más páginas) y concentra todo en 1 IP. Lo que sí bajó pedidos: páginas más grandes (Inmoclick 48 → 200, MendozaProp 100 → 1000).
- Sin base de datos: el registro de ids vistos (`seen.json`) y el log de corridas (`runs.json`) son JSON commiteados por Actions. Cloudflare (Worker + KV/D1) queda para lo que necesite escribir desde el navegador (favoritos sincronizados).
- El Worker usa el subdominio `wow-armeria-api.workers.dev` porque es único por cuenta de Cloudflare y la cuenta ya lo tenía de otro proyecto (una armería). El usuario decidió dejarlo (2026-10-20): no cambiarlo, porque rompería los Workers de ese otro proyecto.
- Nombre del sitio "Casa Mendoza" (antes "Próximo hogar · Andy & Natalí"; se cambió el 2026-10-20 para poder compartirlo) + favicon casita con corazón (`docs/favicon.svg`).

## Ideas pendientes


- Alertas (Telegram/email) para avisos con puntaje > 85 ("a futuro").
- Mapa con todos los avisos (Leaflet + OSM).
- Más fuentes: RE/MAX, MercadoLibre (API oficial), alertas por email de Zonaprop/Argenprop vía Cloudflare Email Worker, bookmarklet.
- Partir `details.json` si pesa demasiado en móvil.
- Recalibrar `minutesPerKm` con tiempos reales (OSRM) por zona.
