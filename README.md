# Casa Mendoza

Buscador personal de casas y terrenos en el Gran Mendoza. Scrapea Inmoclick una vez por día, descarta lo lejano o peligroso y ordena por puntaje de oportunidad.

## Cómo funciona

1. GitHub Actions (`.github/workflows/scrape.yml`) corre todos los días a las 06:00 hora de Argentina.
2. `scraper/` baja los avisos, los enriquece y los filtra. Después calcula la mediana USD/m² por departamento y les asigna un puntaje.
3. El resultado queda en `docs/data/listings.json`, que GitHub Pages sirve junto al sitio estático `docs/`.

## Uso local

```bash
npm test
npm run scrape
npm run scrape -- --max-pages 2
npx http-server docs -p 8080
```

## Configuración

Todo se ajusta en `config.json`:

- `maxMinutes`, `minutesPerKm`: radio al centro.
- `departments`: departamentos permitidos.
- `dangerZones.high` descarta y `dangerZones.medium` penaliza. Son regex sobre dirección y título.
- `terreno`: tope de precio y superficie mínima para terrenos.
- `features`: regex para detectar apto crédito, patio, cochera, posesión y "a reciclar".
- `scoring`: pesos del puntaje.

El rango de precio se elige en la página. Por defecto es USD 0–62.000.

Investigación de mercado en [research/mercado-mendoza-2026-10.md](research/mercado-mendoza-2026-10.md).
