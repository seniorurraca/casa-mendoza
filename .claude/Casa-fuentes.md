# Fuentes de datos (portales)

Detalle técnico de cada portal. Las reglas de scraping (no correr desde la PC del usuario, no evadir bloqueos) están en `CLAUDE.md`.

| Portal | Estado | Modo | Módulo |
|---|---|---|---|
| Inmoclick | ✅ en uso | full + quick | `scraper/sources/inmoclick.mjs` |
| Inmoup | ✅ en uso | solo full | `scraper/sources/inmoup.mjs` |
| RE/MAX | ✅ en uso (desde 2026-10-20) | full + quick | `scraper/sources/remax.mjs` |
| MercadoLibre | web 200, API pública 403 → solo con app oficial de ML Developers (la tiene que crear el usuario) | — | — |
| Zonaprop / Argenprop / Properati | ❌ 403 anti-bot (Cloudflare/DataDome) | — | No evadir |

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

- Listado: `/{casas|terrenos}-en-venta-en-mendoza`, página N: `?page=N` (base 0). 24 por página, ordenado por más nuevos (`sort=-createdAt`), por eso tiene quick (2 páginas).
- Volumen (2026-10-20): ~1.420 casas (60 págs.) + ~1.320 terrenos (56 págs.). Incluye toda la provincia; `AREA_RULES` saca lo lejano.
- Datos en `<script id="ng-state" type="application/json">`: objeto con respuestas cacheadas de su API; la de avisos es la entrada cuyo `u` contiene `/listings/findAll` → `b.data.{data[], totalItems, totalPages}`. Leemos el HTML (como un navegador), no llamamos a `api-ar.redremax.com` directo.
- Item → listing: `id`, `slug` (URL = `/listings/{slug}`), `price` + `currency.value` (USD/ARS) + `priceExposure` (false = precio oculto), `location.coordinates` = **[lng, lat]**, `dimensionLand`/`dimensionCovered`, `bedrooms`, `bathrooms`, `displayAddress`, `geoLabel` ("Barrio, Departamento, Mendoza" → departamento = penúltimo, mismos nombres que Inmoclick), `associate.officeName`, `type.value` (casa, casa_duplex, terrenos_y_lotes).
- Fotos: `photos[].rawValue` = `listings/{entity}/{foto}` → `https://d1acdg20u0pmxj.cloudfront.net/listings/{entity}/860x440/{foto}.jpg`.
- **El listado no trae descripción, fecha ni apto crédito.** Están en el detalle (`/listings/{slug}`, entrada `findBySlug`: `description`, `aptCredit`, `features[]` con "Patio", `parkingSpaces`). No se piden (serían ~2.700 requests por corrida). Por ahora: descripción = título, patio por m², crédito por regex del título. Mejora posible: pedir el detalle solo de avisos nuevos.

## Dedupe entre portales

Las inmobiliarias publican lo mismo en ambos portales (~1.580 duplicados por corrida). Criterio en `scraper/lib/dedupe.mjs`: distinto `source`, mismo `type`, precio ±2%, distancia < 200 m, superficie ±10%. Sin coordenadas no se une. El resultado conserva el aviso más completo y guarda los demás en `alsoOn[{source,url}]`; la UI los muestra como "Inmoup · Inmoclick" y el filtro de Portales los considera.

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
