# CLAUDE.md — Próximo hogar · Andy & Natalí

Contexto completo del proyecto para Claude Code. Leer antes de tocar nada.

## Qué es y para quién

App personal de Andy (GitHub `seniorurraca`) y Natalí para encontrar **casa o terreno para comprar en el Gran Mendoza, Argentina**.

- Tienen preaprobado un **crédito hipotecario de USD 62.000**. Los bancos financian 70–80% del valor, así que el tope real depende de ahorros: el precio máximo es un **filtro editable en la UI** (default 62k), nunca un valor fijo en código.
- Prioridades: **apto crédito hipotecario** y **patio**. Descartar lo que quede a **más de 30 min del centro** (Plaza Independencia) y los **barrios peligrosos**.
- **Terrenos solo si son baratos** (≤ USD 25k, ≥ 200 m²). Construir 70 m² cuesta ≈ USD 62k (CAMZA 2026), así que terreno + obra no entra en el crédito sin financiamiento extra (IPV "Construyo mi casa").
- Investigación de mercado (medianas USD/m² por zona, tiempos al centro, seguridad, fuentes): [research/mercado-mendoza-2026-10.md](research/mercado-mendoza-2026-10.md).

## URLs

- Sitio: https://seniorurraca.github.io/casa-mendoza/ (GitHub Pages desde `main` / `docs/`)
- Repo: https://github.com/seniorurraca/casa-mendoza (público)
- Actions: https://github.com/seniorurraca/casa-mendoza/actions

## Arquitectura

No hay backend ni API. Todo es estático:

```
GitHub Actions (cron) ──► scraper/ (Node) ──► docs/data/listings.json + details.json ──► commit ──► GitHub Pages
                                                                                                   │
                                                              navegador: filtros, zonas, favoritos, visitas (localStorage)
```

- **Scraper** corre solo en GitHub Actions. Nunca en la PC del usuario (ver "Reglas de scraping").
- **Frontend** carga `listings.json` y hace todo client-side. `details.json` (descripciones + fotos) se carga lazy al abrir un detalle o carrusel.
- Cloudflare: el usuario tiene plan Workers de USD 5. **No se usa todavía.** Candidatos: sincronizar favoritos entre dispositivos (Worker+KV), recibir alertas por email de Zonaprop/Argenprop (Email Worker), cron de respaldo si bloquean las IPs de Actions.

### Corridas (`.github/workflows/scrape.yml`)

| Modo | Cron (UTC) | Hora ART | Qué hace | Duración |
|---|---|---|---|---|
| `full` | `0 9 * * *` | 06:00 | Todos los portales, recalcula medianas de mercado, elimina avisos dados de baja | ~35–40 min |
| `quick` | `0 1,5,13,17,21 * * *` | 22, 02, 10, 14, 18 | Solo fuentes con `quick` en config (Inmoclick, orden "recientes", 3 páginas por grupo). Hace **upsert** sobre los datos previos, no borra nada, reutiliza `market` previo | ~35 s |

- GitHub retrasa los cron ~20–30 min. Es normal.
- Manual: `gh workflow run scrape.yml -R seniorurraca/casa-mendoza -f mode=full` (o `quick`).
- El workflow corre `npm test` antes de scrapear, y hace `git pull --rebase` antes de `git push`.
- Si el scraper falla, el job aborta **sin pisar** los JSON: el sitio sigue mostrando los datos anteriores.

## Mapa de archivos

```
config.json                  Toda la configuración (fuentes, filtros, zonas, scoring). Ver sección Config.
scraper/index.mjs            Orquestador: --mode full|quick, --max-pages N
scraper/sources/inmoclick.mjs  Fuente Inmoclick
scraper/sources/inmoup.mjs     Fuente Inmoup
scraper/lib/
  http.mjs        fetch con User-Agent, status != 200 = error, withRetry (backoff)
  sources.mjs     fetchGroups (itera grupos + dedupe por id), sourcesFor(config.sources, mode)
  currency.mjs    dólar desde dolarapi.com, parsePrice (US$ vs $ ARS)
  text.mjs        normalize (usa docs/js/text.js), decodeEntities, detectFeatures (regex de config)
  geo.mjs         haversine, minutos estimados = km línea recta × minutesPerKm (1,8)
  enrich.mjs      features (credito/patio/cochera/posesion/reciclar), minutes, ppm
  filters.mjs     AREA_RULES (sin precio, fuera de Gran Mendoza, lejos) y OFFER_RULES (precio alto, terreno caro/chico)
  dedupe.mjs      une el mismo inmueble publicado en varios portales → alsoOn
  market.mjs      medianas USD/m² por tipo y departamento (segmento comparable)
  score.mjs       puntaje 0–100 + breakdown + suspicious
  history.mjs     readPrevious, withHistory (firstSeen, firstSeenAt, prevUsd), upsert
docs/                        Sitio estático (GitHub Pages)
  index.html, styles.css, favicon.svg
  data/listings.json, data/details.json   Generados por Actions. NO editar a mano.
  js/app.js          Orquestación UI: estado, eventos, diálogos
  js/filters.js      DEFAULT_FILTERS, applyFilters, loadFilters (migra/descarta claves viejas)
  js/zones.js        barrios peligrosos: defaults + prefs del usuario → zone y penalidad
  js/visits.js       última visita, markNew, seenAt
  js/card.js, detail.js, listing-view.js   Render de tarjeta, detalle y helpers compartidos
  js/carousel.js     carrusel pantalla completa (flechas, teclado, swipe)
  js/settings.js     diálogo ⚙ Configuración (barrios)
  js/multiselect.js  combo multi-selección (Tipo, Departamento, Portales)
  js/loaders.js      fotos (API Inmoclick o details.json) y descripción, con caché
  js/maps.js, format.js, icons.js, storage.js, text.js
test/                        node:test, sin dependencias. Fixtures HTML reales recortados.
research/                    Investigación de mercado inicial
```

## Fuentes de datos

### Inmoclick (`inmoclick.com`)
- Listado: `/inmuebles/venta/{casas|lotes-y-terrenos}/mendoza?limit=48&page=N` (+ `&ordenar=recientes` en quick).
- Cada aviso es un `<article>` con atributos: `precio`, `sup_t`, `sup_c`, `ser_1` (dorm), `ser_2` (baños), `ser_3` (cochera, `"disable"` = no), `lat`, `lng`, `prp_id`, `usr_id`.
- JSON embebido `var propiedades = [...]` en una línea: `prp_alta` (fecha), `nombre` (inmobiliaria), `hipotecario` ("Si"/"No"/"Indistinto"). **Puede venir como objeto con claves salteadas** → se usa `Object.values()`.
- Paginación: links con `&amp;page=N` (HTML escapado).
- Fotos: `/json/inmuebles/fotos?usuario=X&propiedad=Y` → `{fotos:[...]}`, CORS `*`. El navegador del usuario las pide al abrir el detalle o el carrusel. `photoCount` es `null` (desconocido).
- **Protegido por AWS WAF.** Scrapear mucho desde una IP → HTTP 202 con body vacío, después CAPTCHA (405 "Human Verification"). Pasó el 2026-10-18 con la IP de la casa del usuario. Las IPs de GitHub Actions no fueron bloqueadas.

### Inmoup (`inmoup.com.ar`) — app Next.js
- Listado: `/{casas|lotes-y-terrenos}-en-venta-en-mendoza-y-150000-o-menos-dolares` y página N: `...-y-pag-N`. (Los formatos `?page=`, `-pag-N` o `/pagina-N` no paginan o rompen el filtro de Mendoza.)
- Datos en el payload RSC: concatenar todos los `self.__next_f.push([1,"..."])`, buscar `"initialItems":[...]` y el `"total"` que le sigue. 24 items por página.
- Item: `id`, `img` (hasta 5 URLs), `localidad`, `coordenadas` ("lat, lng"), `direccion`, `precio`, `dolar`, `fechaPublicacion`, `servicios[]` (Dormitorios, Baños, Cochera, Superficie Cubierta m2, Superficie Total m2, Apto Crédito Hipotecario), `inmobiliaria{id,slug,nombre}`, `slug`.
- URL del aviso: `https://inmoup.com.ar/{inmobiliaria.id}-{inmobiliaria.slug}/inmuebles/{id}/ficha/{slug}`.
- `descripcion` a veces es una referencia RSC (`"$23"`). En ese caso se toma del **JSON-LD** de la página: `@graph[].mainEntity.mainEntity.itemListElement[].item.description`, matcheando por URL.
- **No ordena por fecha** (solo relevancia/precio, los destacados pagos van primero). Por eso solo entra en `full`.
- Endpoints internos `/server/...` tienen chequeo CSRF de Origin. No falsificarlo.

### Portales descartados (no evadir)
- **Zonaprop, Argenprop, Properati**: 403 anti-bot (Cloudflare/DataDome). Usar la cuenta del usuario para pasar el bloqueo **no**: sería evasión de bot-detection. Alternativas legítimas propuestas: alertas por email → Cloudflare Email Worker; bookmarklet "Guardar en Próximo hogar" que el usuario usa mientras navega.
- **MercadoLibre**: web 200, API pública 403. Solo viable con app oficial en ML Developers (requiere que el usuario la cree).
- **RE/MAX**: 200, datos en `ng-state` (Angular). Candidato pendiente.

## Pipeline del scraper (`scraper/index.mjs`)

1. Dólar oficial venta desde dolarapi.com.
2. `sourcesFor(config.sources, mode)` → cada fuente `fetchAll()` → `enrich()`.
3. `AREA_RULES` (sin precio, departamento fuera de `config.departments`, minutos > `maxMinutes`).
4. quick: `upsert(previous.hydrated, nuevos)`. full: solo lo scrapeado.
5. `dedupe()`: distinto portal, mismo tipo, precio ±2%, < 200 m, superficie ±10% → se queda el más completo (más fotos/descripción) y los demás van a `alsoOn` (se preserva entre corridas).
6. `buildMarket()` solo en full: mediana USD/m² por tipo×departamento, segmento USD 15–90k casas / 3–90k terrenos; fallback a mediana general si n < 5. Va **antes** de OFFER_RULES para no sesgar terrenos.
7. `OFFER_RULES` (precio > 150k, terreno > 25k o < 200 m²).
8. `scoreListing()` + `withHistory()` → escribe JSON.

### Puntaje (`score.mjs`, pesos en `config.scoring`)
| Factor | Pts casa | Cálculo |
|---|---|---|
| Precio vs zona | 35 | descuento vs mediana: 0 pts a −20%, máximo a +40% |
| Apto crédito | 25 | campo estructurado del portal, si no hay, regex de texto (con negación "no apto") |
| Patio | 15 | regex o `supT − supC ≥ 50` |
| Cercanía | 10 | máximo ≤ 10 min, 0 a 30 min |
| Tamaño | 10 | ≥ 2 dorm y ≥ 70 m² |
| Cochera | 5 | atributo o regex |

Terrenos: solo precio y cercanía, normalizado a 100. Penalidades: posesión/boleto/sin escritura −30, a reciclar −10, zona "Advertir" −15 (la aplica el **frontend**). `suspicious` si el descuento es > 55%.

## Datos generados

`docs/data/listings.json`:
- `generatedAt`, `startedAt`, `lastFullAt`, `usdRate`, `stats`, `dangerZones`, `zonePenalty`, `market`.
- `listings[]`: `id` (`{source}-{usr}-{prp}`), `source`, `type` (casa|terreno), `url`, `photo`, `photosApi`, `photoCount`, `usd`, `priceRaw`, `supT`, `supC`, `dorm`, `banos`, `lat`, `lng`, `department`, `address`, `locationText` (normalizado, para matchear barrios), `publishedAt`, `agency`, `features{credito,patio,cochera,posesion,reciclar}`, `minutes`, `ppm`, `alsoOn[]`, `score`, `discount`, `zonePpm`, `breakdown[]`, `suspicious`, `firstSeen` (fecha), `firstSeenAt` (ISO, null en avisos anteriores al 2026-10-19), `prevUsd`.

`docs/data/details.json`: `{ [id]: { description, photos[] } }`.

Tamaño actual: ~4 MB + ~6,5 MB sin comprimir (~650 KB gzip la lista). Si molesta en móvil, partir en archivos más chicos.

## Frontend

- Filtros: precio mín/máx, Tipo / Departamento / Portales (multi-selección, `[]` = todos), minutos al centro, apto crédito, patio, ocultar sospechosos, favoritos, orden (puntaje, precio, descuento vs zona, más nuevos).
- Barrios peligrosos (⚙ Configuración): base desde `config.dangerZones`. El usuario los activa/desactiva o agrega propios. "Ocultar" (high) saca el aviso; "Advertir" (medium) muestra un chip y resta 15. Matchea contra `locationText` (dirección + slug). Ojo con nombres que son calles.
- Detalle en diálogo (galería, datos, descripción, links a todos los portales, Maps), carrusel a pantalla completa, botón Google Maps (`/maps/search/?api=1&query=lat,lng` o dirección).
- Visitas: banner "N avisos nuevos desde tu última visita (fecha 24 h)" y tag NUEVO sobre la foto. Sin visita previa → "nuevo" = últimos 3 días.
- `localStorage`: `casa-mendoza:filters`, `:favorites`, `:zones`, `:last-visit`. `sessionStorage`: `casa-mendoza:visit-baseline` (las recargas no reinician la visita). Todo es por navegador: celular y PC son independientes.
- Textos de UI en español rioplatense.

## Config (`config.json`) — lo más tocado

- `maxUsdStored` (150000): tope de lo que se guarda (también es el filtro de URL de Inmoup).
- `maxMinutes`, `minutesPerKm`, `centro`, `departments`.
- `terreno.maxUsd` / `terreno.minM2`.
- `sources.{name}`: `groups`, `delayMs` (3000), `maxPages`, `retry {retries, backoffMs}`, `quick {…}` (Inmoclick), `maxUsd` (Inmoup).
- `features`: regex sobre texto normalizado (minúsculas, sin acentos).
- `dangerZones[]`: `{name, pattern (regex), level: high|medium}`.
- `segment`, `scoring`.

## Comandos

```bash
npm test                                  # node --test test/*.test.mjs (55 tests)
npx http-server docs -p 8080 -c-1         # ver el sitio local con los datos commiteados
gh run list -R seniorurraca/casa-mendoza --workflow scrape.yml --limit 5
gh workflow run scrape.yml -R seniorurraca/casa-mendoza -f mode=quick
```

`npm run scrape` existe, pero **no correrlo desde la PC del usuario** (ver abajo). Para probar parsers: guardar HTML una vez y testear offline contra fixtures.

## Reglas de scraping (importantes)

- Nunca evadir anti-bot, CAPTCHA, WAF ni CSRF. Si un portal bloquea, se documenta y se busca un canal legítimo.
- Nunca scrapear desde la PC del usuario: comparte IP con su navegación (ya bloquearon una vez su IP en Inmoclick). Scraping real solo en Actions.
- Mantener `delayMs` ≥ 3000 y retries con backoff largo. Preferir menos páginas (filtros de URL) a más frecuencia.
- Para investigar estructura de un sitio: pocas requests puntuales, o el navegador integrado como lo usaría una persona.

## Convenciones de código

- Node ≥ 20, ESM, **cero dependencias** (ni en scraper ni en frontend). Sin build.
- Módulos chicos y de una sola responsabilidad. Lógica pura separada del DOM, para poder testearla con node:test (el frontend se testea importando `docs/js/*.js`).
- Sin comentarios en el código, nombres descriptivos. DRY: helpers compartidos en `listing-view.js` / `lib/`.
- Tests: fixtures reales recortados en `test/fixtures/`. Cada bug se reproduce primero con un test.
- Commits en español, autor `seniorurraca <orozco.andres96@gmail.com>`. **Sin** co-autor ni mención a Claude en commits/PRs.
- Commits de datos los hace el bot de Actions (`data: actualizar avisos YYYY-MM-DD`).

## Git en esta máquina (Windows)

Config **local** del repo (la global apunta a la cuenta de trabajo `aorozco01`, que no corresponde acá):
```
credential.https://github.com.username=seniorurraca
credential.helper=!gh auth git-credential
pull.rebase=true
core.longpaths=true
```
- Siempre `git pull --rebase` antes de push: Actions commitea datos varias veces por día.
- No pushear mientras corre un `full`: su push final chocaría (ahora tiene `pull --rebase`, pero conviene evitarlo).
- Los archivos tienen CRLF en el working tree (autocrlf). En reemplazos por script, normalizar `\r\n` → `\n` antes de buscar texto.

## Historial de decisiones (por qué está así)

- Python no estaba instalado → todo en Node. Un solo lenguaje para scraper y frontend.
- Zonas peligrosas se filtran en el frontend (no en el scraper) para que el usuario pueda editarlas.
- Apto crédito: campo estructurado del portal > regex de texto.
- Corridas rápidas cada 4 h a pedido del usuario. El objetivo es enterarse antes de los avisos nuevos. No reducen el riesgo de bloqueo: eso lo hacen el delay y pedir menos páginas.
- `firstSeenAt` (hora exacta) existe desde 2026-10-19. Antes solo había `firstSeen` (fecha).

## Ideas pendientes

- Alertas (Telegram/email) cuando aparezca algo con puntaje > 85. El usuario lo quiere "a futuro".
- Mapa con todos los avisos (Leaflet + OSM).
- Más fuentes: RE/MAX (`ng-state`), MercadoLibre (API oficial), alertas email de Zonaprop/Argenprop vía Cloudflare, bookmarklet.
- Favoritos sincronizados entre dispositivos (Cloudflare Worker + KV).
- Partir `details.json` si pesa demasiado en móvil.
- Recalibrar `minutesPerKm` con tiempos reales (OSRM) por zona.
