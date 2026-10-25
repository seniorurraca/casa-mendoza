# Fuentes de datos (portales)

Detalle técnico de cada portal. Las reglas de scraping (no correr desde la PC del usuario, no evadir bloqueos) están en `CLAUDE.md`.

| Portal | Estado | Modo | Módulo |
|---|---|---|---|
| Inmoclick | ✅ en uso | full + quick | `scraper/sources/inmoclick.mjs` |
| Inmoup | ✅ en uso | solo full | `scraper/sources/inmoup.mjs` |
| RE/MAX | ⏸️ **sacado de `config.sources` el 2026-10-24** (pedido del usuario): 403 desde Actions desde 2026-10-21 (primer pedido de cada corrida; bloquea IPs de GitHub, no es volumen). Módulo y tests se conservan. No evadir | — | `scraper/sources/remax.mjs` |
| MercadoLibre | web 200, API pública 403 → solo con app oficial de ML Developers (la tiene que crear el usuario) | — | — |
| Argenprop | ❌ desafío anti-bot: la 1ª consulta dio 200, pero desde la 4ª (2026-10-20) responde **202 vacío y redirige a `/n0`** (mismo patrón WAF que bloqueó Inmoclick). No viable sin evadir. Además `robots.txt` solo permite `?pagina-1..3` por búsqueda. Datos útiles si algún día se habilita: atributos en `<a class="card">` (`idaviso`, `montooperacion`, `idmoneda` 2=USD, `dormitorios`, `idpartido`), sin coordenadas | — | No evadir |
| Inmuebles Clarín | mismo grupo y mismo `robots.txt` que Argenprop → mismo inventario, no suma | — | — |
| MendozaProp | ✅ en uso (desde 2026-10-20) | solo full | `scraper/sources/mendozaprop.mjs` |
| Liderprop (`liderprop.com/es-ar/`) | por relevar: plataforma "creada por y para profesionales", HTML server-side | — | — |
| Zonaprop | ❌ 403 anti-bot (Cloudflare/DataDome) | — | No evadir |
| Properati | ❌ 401 (2026-10-20) | — | No evadir |
| BuscadorProp | no aplica: solo Zona Sur GBA y La Costa | — | — |
| Buscaprop | el dominio no existe (`.com` ni `.com.ar`) | — | — |
| Tokko Broker / Inmofactory | no son portales: CRMs para inmobiliarias. Su API exige la clave de una inmobiliaria cliente | — | — |

Contrato de una fuente: exportar `fetchAll({ groups, delayMs, maxPages, retry, usdRate, ... })` → array de listings con la forma de `parseArticle` (Inmoclick) / `toListing` (Inmoup): `id`, `source`, `type`, `url`, `photo`, `photos?`, `photosApi`, `photoCount`, `priceRaw`, `usd`, `supT`, `supC`, `dorm`, `banos`, `cocheraAttr`, `lat`, `lng`, `department`, `address`, `locationText`, `description`, `text`, `publishedAt`, `agency`, `creditoFlag`. Registrar el módulo en `SOURCES` de `scraper/index.mjs` y sus opciones en `config.sources`.

## Inmoclick (`inmoclick.com`)

- Listado: `/inmuebles/venta/{casas|lotes-y-terrenos}/mendoza?limit=48&page=N`. En quick se agrega `&ordenar=recientes`.
- Paginación: links con `&amp;page=N` (HTML escapado). `lastPage()` toma el máximo.
- Cada aviso es un `<article>` con atributos:
  - `precio` ("US$ 215.000" o "$ ..." en pesos)
  - `sup_t`, `sup_c`
  - `ser_1` (dorm), `ser_2` (baños), `ser_3` (cochera; `"disable"` = no tiene)
  - `lat`, `lng`
  - `prp_id`, `usr_id`
- Descripción completa en el `<p>` del hover. Dirección en `.inmobiliaria`. Departamento en `addressLocality`.
- JSON embebido `var propiedades = [...]` en **una línea**. Campos usados:
  - `prp_alta` → `publishedAt`
  - `nombre` → `agency`
  - `hipotecario` ("Si" / "No" / "Indistinto") → `creditoFlag`
- **El JSON embebido puede venir como objeto con claves salteadas** (`{"0":…,"3":…}`), por cómo PHP serializa arrays con huecos. Se lee con `Object.values()`. Rompió una corrida el 2026-10-19.
- Fotos: `/json/inmuebles/fotos?usuario=X&propiedad=Y` → `{ fotos: [...] }`, con CORS `*`.
  - Las pide el navegador del usuario al abrir el detalle o el carrusel; el scraper no las baja.
  - `photoCount = null`.
- **AWS WAF**: con mucho tráfico desde una IP responde HTTP 202 con body vacío, y después CAPTCHA (405 "Human Verification").
  - Pasó con la IP de la casa del usuario.
  - Las IPs de GitHub Actions no fueron bloqueadas (~100 páginas por corrida full con 3 s de delay).
  - Si la galería de un aviso falla, `loaders.js` cae a la foto principal.

## Inmoup (`inmoup.com.ar`) — Next.js

- Listado: `/{casas|lotes-y-terrenos}-en-venta-en-mendoza-y-150000-o-menos-dolares`.
  - Página N: sufijo `-y-pag-N`.
  - Sin el filtro de precio: `/{grupo}-en-venta-en-mendoza` y `-y-pag-N`.
  - **No funcionan**: `?page=`, `?pagina=`, `/2`, `-pagina-2`, `-pag-2` (este último rompe el filtro de Mendoza y trae todo el país).
  - "hasta-N-dolares" se interpreta como mínimo.
  - El formato correcto se sacó usando el paginador y el filtro de la web en el navegador.
- Datos en el payload RSC:
  1. Concatenar los strings de todos los `self.__next_f.push([1,"..."])`.
  2. Buscar `"initialItems":[...]`.
  3. Leer el `"total"` que viene **inmediatamente después** del array (antes en el payload hay otros `"total"`).
  - 24 items por página.
- Item → listing:
  - `id`, `slug`, `inmobiliaria{id,slug,nombre}`
  - URL = `https://inmoup.com.ar/{inmobiliaria.id}-{inmobiliaria.slug}/inmuebles/{id}/ficha/{slug}`
  - `img[]` (hasta 5) → `photos` y `photoCount`; `imgCount` = total real del aviso, que no usamos
  - `localidad` → `department`, con los mismos nombres que Inmoclick
  - `coordenadas` ("lat, lng"), `direccion`, `precio`, `dolar` (1 = USD), `ocultarPrecio`, `fechaPublicacion`
  - `servicios[]` por `desc`: "Dormitorios", "Baños", "Cochera" ("Sin Cochera" = no), "Superficie Cubierta m2", "Superficie Total m2", "Apto Crédito Hipotecario" ("Si"/"No"/"Indistinto")
- `descripcion` a veces es una referencia RSC (`"$23"`). En ese caso se toma del **JSON-LD** de la misma página (`@graph[].mainEntity.mainEntity.itemListElement[].item.description`), matcheando por URL.
  - Ojo: en el JSON-LD, la localidad de `provider` es la de la inmobiliaria, no la de la propiedad.
- **No ordena por fecha**: solo relevancia (destacados pagos primero), mayor precio o menor precio. Por eso no hay quick para Inmoup.
- Endpoints internos `/server/...` (`buscar/term`, `inmuebles/buscar`) con chequeo CSRF de `Origin` → **no falsificar**. Hay otros que podrían servir a futuro: `tasacion/historico-precios-zona`, `observatorio/zonas`.
- Volumen con tope de 150k: ~2.600 casas + ~3.800 terrenos ≈ 270 páginas (~14 min a 3 s).

## RE/MAX (`remax.com.ar`) — Angular SSR

- **Para reactivarlo**, volver a agregar en `config.sources` (antes de `mendozaprop`): `"remax": { "segments": { "venta": { "casas-en-venta": "casa", "terrenos-en-venta": "terreno" }, "deptos": { "departamentos-en-venta": "departamento" }, "alquiler": { "casas-en-alquiler": "casa", "departamentos-en-alquiler": "departamento" } }, "delayMs": 3000, "maxPages": 80, "retry": { "retries": 2, "backoffMs": 60000 }, "quick": { "maxPages": 2 } }`. Probar antes con `gh workflow run` (1 corrida).

- Listado: `/{casas|terrenos}-en-venta-en-mendoza`, página N: `?page=N` (base 0). 24 por página, ordenado por más nuevos (`sort=-createdAt`), por eso tiene quick (2 páginas).
- Volumen (2026-10-20): ~1.420 casas (60 págs.) + ~1.320 terrenos (56 págs.). Incluye toda la provincia; `AREA_RULES` saca lo lejano.
- Datos en `<script id="ng-state" type="application/json">`: objeto con respuestas cacheadas de su API; la de avisos es la entrada cuyo `u` contiene `/listings/findAll` → `b.data.{data[], totalItems, totalPages}`. Leemos el HTML (como un navegador), no llamamos a `api-ar.redremax.com` directo.
- Item → listing: `id`, `slug` (URL = `/listings/{slug}`), `price` + `currency.value` (USD/ARS) + `priceExposure` (false = precio oculto), `location.coordinates` = **[lng, lat]**, `dimensionLand`/`dimensionCovered`, `bedrooms`, `bathrooms`, `displayAddress`, `geoLabel` ("Barrio, Departamento, Mendoza" → departamento = penúltimo, mismos nombres que Inmoclick), `associate.officeName`, `type.value` (casa, casa_duplex, terrenos_y_lotes).
- Fotos: `photos[].rawValue` = `listings/{entity}/{foto}` → `https://d1acdg20u0pmxj.cloudfront.net/listings/{entity}/860x440/{foto}.jpg`.
- **El listado no trae descripción, fecha ni apto crédito.** Están en el detalle (`/listings/{slug}`, entrada `findBySlug`: `description`, `aptCredit`, `features[]` con "Patio", `parkingSpaces`). No se piden (serían ~2.700 requests por corrida). Por ahora: descripción = título, patio por m², crédito por regex del título. Mejora posible: pedir el detalle solo de avisos nuevos.

## MendozaProp (`mendozaprop.com`) — Next.js, datos por API JSON propia

- Sin `robots.txt` (404). El HTML no trae avisos: la página los pide a `/api/properties?limit=&offset=&isMap=false&operationType=&propertyType=` (GET simple, sin auth ni chequeo de Origin; funciona con curl). Usamos `limit=100`.
- `operationType`: 1 = alquiler, 2 = venta. `propertyType` acepta lista: casa 3 (+11 dúplex, 4 casa quinta no), terreno 17 (Lote) y 38 (Terreno), departamento 8, galpón 14, bodega 1109. Config: `groups: { "3,11": "casa", "17,38": "terreno" }`.
- La API devuelve un **array sin total**: se pagina con `offset` hasta que vuelve menos de `limit`.
- Campos: `id` (URL `/venta-{tipo}/{id}`, el slug no importa), `price` (string) + `currency_id` (1 USD, 2 ARS), `m2` (total), `m2_covered`, `bedrooms`, `bathrooms`, `parking`, `credit` (1 = apto; 0 no es confiable → null), `regions[0]` (slug: mendoza=Capital, godoycruz, guaymallen, lasheras, lujandecuyo, maipu), `address`, `images[]`, `description`, `owner_company`, `active`.
- **No trae coordenadas** → `minutes` null y el dedupe compara departamento en vez de distancia.
- No ordena por fecha conocida → sin quick.

## Segmentos por fuente (config `sources.{name}.segments`)

| Fuente | venta | deptos | alquiler |
|---|---|---|---|
| Inmoclick | `casas`, `lotes-y-terrenos` (`/inmuebles/venta/{grupo}/mendoza`) | — (URL sin verificar) | — (URL sin verificar) |
| Inmoup | `{casas|lotes-y-terrenos}-en-venta` + tope USD | `departamentos-en-venta` (~2.950, 2026-10-20) | `casas-en-alquiler` (~620), `departamentos-en-alquiler` (~1.700), sin tope de precio |
| RE/MAX | `{casas|terrenos}-en-venta` | `departamentos-en-venta` | `{casas|departamentos}-en-alquiler` |
| MendozaProp | `3,11` / `17,38` (operationType 2) | `8,21` | `3,11` / `8,21` (operationType 1) |

La clave del grupo es parte de la URL: Inmoup y RE/MAX `/{grupo}-en-mendoza`. Para sumar Inmoclick a deptos/alquiler hay que verificar sus URLs desde Actions (no desde la PC del usuario).

## Dedupe entre portales

Las inmobiliarias publican lo mismo en ambos portales (~1.580 duplicados por corrida). Criterio en `scraper/lib/dedupe.mjs`: distinto `source`, mismo `type`, precio ±2%, distancia < 200 m, superficie ±10%. Si a alguno le faltan coordenadas (MendozaProp siempre): mismo departamento y superficie ±10% obligatoria (sin superficie no se une). El resultado conserva el aviso más completo y guarda los demás en `alsoOn[{source,url}]`; la UI los muestra como "Inmoup · Inmoclick" y el filtro de Portales los considera.

## Evasión de anti-bot: no

El usuario pidió (2026-10-20) saltear la protección de Zonaprop/Argenprop (sugirió técnicas tipo Scrapfly: navegadores headless con huella falsa, proxies residenciales, resolver desafíos). **No se hace**: va contra la regla del proyecto y los términos de esos sitios, y arriesga que bloqueen la IP de Actions o la del usuario. Se respeta `robots.txt`.

## Canales legítimos para portales bloqueados (propuestos, no implementados)

- **Alertas por email**: el usuario guarda búsquedas en Zonaprop/Argenprop → reenvío a un Cloudflare Email Worker → parsea y suma avisos.
- **Bookmarklet "Guardar en Casa Mendoza"**: el usuario lo toca mientras mira un aviso; lee los datos de la página que tiene abierta.
- **MercadoLibre**: API oficial con app de ML Developers.

## Cómo agregar o arreglar una fuente

1. Bajar 1–2 páginas **una sola vez** (o inspeccionar con el navegador integrado) y guardar el HTML.
2. Recortar un fixture chico en `test/fixtures/` y escribir el test del parser.
3. Implementar `scraper/sources/<portal>.mjs` reusando `lib/http.mjs` (`fetchText`, `sleep`, `withRetry`) y `lib/sources.mjs` (`fetchGroups`).
4. Registrar en `SOURCES` (`scraper/index.mjs`), agregar a `config.sources` y a `SOURCE_LABEL` (`docs/js/listing-view.js`).
5. Probar la fuente en vivo con `--max-pages 2` **solo si el portal no tiene WAF agresivo**, y nunca para Inmoclick desde la PC del usuario. Si no, validar en Actions con `gh workflow run ... -f mode=full`.
