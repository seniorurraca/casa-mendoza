# Mercado inmobiliario Gran Mendoza — octubre 2026

Muestra propia: 2.905 avisos Inmoclick (2.352 casas, 457 terrenos) relevados 18/10/2026.
Precios = publicados (no cierre). ARS convertido a USD oficial venta $1.535.

## 1. Casas — USD por m² cubierto

### Mercado completo por departamento

| Departamento | n | p25 | Mediana | p75 | Precio mediano | % apto crédito |
|---|---|---|---|---|---|---|
| Las Heras | 188 | 400 | 605 | 929 | 80.000 | 22% |
| Godoy Cruz | 242 | 506 | 682 | 889 | 100.000 | 29% |
| Guaymallén | 399 | 481 | 688 | 971 | 110.000 | 21% |
| Capital | 290 | 611 | 833 | 1.111 | 170.000 | 22% |
| Maipú | 390 | 752 | 1.018 | 1.243 | 125.000 | 23% |
| Luján de Cuyo | 646 | 820 | 1.188 | 1.473 | 225.000 | 22% |

### Segmento comparable (USD 15–90k, ≤17 km del centro) ← base del algoritmo

| Departamento | n | p25 | Mediana | p75 | m² cub. mediano | m² terreno mediano |
|---|---|---|---|---|---|---|
| Las Heras | 99 | 335 | 453 | 591 | 124 | 214 |
| Guaymallén | 165 | 367 | 491 | 654 | 120 | 220 |
| Godoy Cruz | 106 | 413 | 515 | 647 | 129 | 203 |
| Capital | 53 | 397 | 570 | 746 | 135 | 189 |
| Luján de Cuyo | 55 | 471 | 600 | 849 | 86 | 250 |
| Maipú | 122 | 532 | 875 | 1.000 | 85 | 202 |

Lectura:
- Las Heras, Guaymallén y Godoy Cruz dan más m² por dólar (~450–515 USD/m²). Son también los departamentos con más delito (ver sección 4), así que el filtro de barrio importa ahí.
- Maipú y Luján en el segmento barato = casas chicas (~85 m²) en barrios nuevos, m² caro.
- Casas ≤62k: 332 en total, 254 a <20 km. Tamaño típico 75–140 m² cubiertos.
- **Apto crédito es escaso**: solo ~17% de las casas ≤62k lo declaran → filtro fuerte, pocas opciones reales.

## 2. Terrenos — USD por m² de terreno

| Zona | n | p25 | Mediana | p75 | Precio mediano |
|---|---|---|---|---|---|
| 0–5 km | 50 | 103 | 191 | 300 | 87.000 |
| 5–10 km | 82 | 60 | 92 | 140 | 36.500 |
| 10–15 km | 116 | 54 | 91 | 127 | 48.500 |
| 15–20 km | 78 | 36 | 52 | 72 | 35.000 |
| Guaymallén | 38 | 33 | 43 | 57 | 18.000 |
| Maipú | 74 | 40 | 60 | 82 | 25.000 |
| Luján de Cuyo | 186 | 30 | 69 | 107 | 46.500 |
| Godoy Cruz | 37 | 75 | 159 | 208 | 77.000 |

Lotes a <20 km: precio p10 = 15k, p25 = 24k, mediana 46k. Superficie mediana 500 m².

**Ojo con terreno + construir**: m² de construcción CAMZA Q1-2026 = $1.355.529 ≈ USD 883. Casa de 70 m² ≈ USD 62k de obra, sin contar el lote. → Terreno solo tiene sentido si cuesta ≤ USD 25k y existe otro financiamiento para la obra (IPV "Construyo mi casa": hasta 85% de la obra). Los créditos hipotecarios bancarios de compra no financian obra.

## 3. Tiempo al centro (Plaza Independencia, OSRM sin tráfico)

| Zona | min | Zona | min |
|---|---|---|---|
| Quinta / Sexta Sección | 3–5 | Carrodilla | 15 |
| San José (Guaymallén) | 7 | Luzuriaga | 16 |
| Dorrego | 8 | Buena Nueva | 16 |
| Godoy Cruz / Las Heras centro | 9 | Rodríguez Peña | 17 |
| El Challao / V. Hipódromo | 10 | Chacras de Coria | 18 |
| Villa Nueva | 11 | Luján centro / Vistalba | 19 |
| Panquehua | 12 | Maipú centro / Coquimbito | 20 |
| Trapiche / Benegas | 13 | Lunlunta / Corralitos | 22 |
| Rodeo de la Cruz | 14 | Russell | 24 |
|  |  | Perdriel | 28 |

Hora pico ≈ ×1,4. 30 min reales ≈ 21 min OSRM ≈ 16–17 km en línea recta.
Regla del algoritmo: `minutos ≈ km_linea_recta × 1,8`. Quedan afuera Perdriel, Russell, Lunlunta, Corralitos. Maipú centro y Luján centro quedan al límite.

## 4. Seguridad

No existe ranking oficial por barrio. Lo que hay:
- Robos con arma 2025 (Ministerio de Seguridad): Las Heras 651, Guaymallén 610, Godoy Cruz 395. Todos bajaron 22–38% vs 2024.
- CEAS: Godoy Cruz + Las Heras + Guaymallén concentran el 59,6% de los homicidios 2024.
- Barrios citados como conflictivos en varias fuentes (prensa y guías):

| Barrio | Departamento | Confianza |
|---|---|---|
| La Gloria | Godoy Cruz | alta |
| Campo Papa | Godoy Cruz | alta |
| Huarpes (I, II, III) | Godoy Cruz | alta |
| Sargento Cabral | Godoy Cruz | media |
| Lihué | Las Heras | alta |
| El Algarrobal | Las Heras | alta |
| Barrio Escorihuela | Las Heras | media |
| 26 de Enero | Las Heras | media |
| Barrio San Martín | Capital | alta |
| Flores / Olivares / asentamientos La Favorita | Capital | alta |
| Tres Estrellas | Guaymallén | media |
| Costa Esperanza | Guaymallén | media |

Regla: confianza alta → descartar. Media → penalizar y marcar "verificar zona".
Ojo: "San Martín" también es calle y departamento, así que se matchea solo como `barrio san martin` / `b° san martin`.
**Esta lista la tenés que revisar vos.**

## 5. Algoritmo de oportunidad (puntaje 0–100)

Filtros duros (se descarta):
- Precio fuera del rango elegido en la UI.
- Minutos estimados > 30.
- Barrio de confianza alta.
- Terreno > USD 25k o < 200 m².

Puntaje:

| Factor | Pts | Cálculo |
|---|---|---|
| Precio vs zona | 35 | `d = 1 − (USD/m² ÷ mediana segmento depto)`. 0 pts si d ≤ −20%, 35 pts si d ≥ +40%, lineal en el medio |
| Apto crédito | 25 | regex `apto/apta crédito`, `acepta crédito`, `hipotecario` |
| Patio | 15 | regex `patio/jardín/parque` o `sup_t − sup_c ≥ 50 m²` |
| Cercanía | 10 | 10 pts si ≤10 min, 0 pts a 30 min |
| Tamaño | 10 | ≥2 dorm. y ≥70 m² = 10; 1 dorm. o <60 m² = 0 |
| Cochera | 5 | regex `cochera/garage` |

Penalizaciones:
- `posesión`, `derechos posesorios`, `boleto`, `sin escritura` → −30. Además no es apto crédito: banco exige escritura.
- `a reciclar`, `refaccionar` → −10.
- Barrio de confianza media → −15.

Alertas (badge, no cambian el puntaje):
- d > 55% bajo zona → "precio sospechoso, verificar". Puede ser error de carga, posesión o permuta.
- Precio bajó vs corrida anterior → "bajó X%".

Las medianas por zona se recalculan en cada corrida con los avisos del día. Este informe sirve como línea base y fallback.

## Fuentes

- Muestra propia Inmoclick, 18/10/2026
- [Ámbito — departamentos Mendoza 2026](https://www.ambito.com/economia/creditos-hipotecarios-mendoza-cuanto-cuesta-comprar-un-departamento-2026-n6317143)
- [Roomix — guía Mendoza 2026](https://roomix.ai/blog/comprar-en-mendoza-guia-2026)
- [Diario Uno — m² construcción CAMZA 2026](https://www.diariouno.com.ar/economia/construccion-casas-mendoza-este-es-el-nuevo-valor-del-m2-enero-del-2026-n1513699)
- [Sitio Andino — créditos IPV 2026](https://www.sitioandino.com.ar/economia/como-solicitar-un-credito-hipotecario-del-instituto-provincial-la-vivienda-2026-n5715916)
- [MDZ — radiografía del delito](https://www.mdzol.com/policiales/radiografia-del-delito-como-cayeron-los-robos-varios-departamentos-mendoza-n1427539)
- [CEAS Mendoza](https://x.com/CEASeguridadMza/status/1856116524211188057)
- [Saca Voyage — barrios a evitar](https://sacavoyage.fr/en/quartiers-a-eviter-a-mendoza/)
- [OSRM](https://router.project-osrm.org) para tiempos de manejo
