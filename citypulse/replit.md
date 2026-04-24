# CityPulse — Smart City Intelligence Platform

A React + Vite single-page app for real-time city monitoring (traffic, air quality, energy, water, waste, transport, alerts, AI advisor).

## Stack
- React 19 + Vite 8
- TailwindCSS 3 + custom CSS animations
- React Router 7
- Zustand for state
- Supabase (auth + realtime + edge functions)
- Recharts, Leaflet, Lucide icons
- Three.js (3D rotating Earth on the splash screen)

## Project Structure
The application source lives in `citypulse/`:
- `citypulse/index.html` — Vite entry HTML
- `citypulse/src/` — React app (App, router, pages, components, hooks, store, lib)
- `citypulse/public/` — static assets (favicon, icons)
- `citypulse/dist/` — production build output

Build/config files at the repo root:
- `vite.config.js` — `root: 'citypulse'`, port 5000, host 0.0.0.0, allowedHosts true. `envDir` points to repo root so `.env.local` is picked up.
- `tailwind.config.js` — content scans `./citypulse/index.html` and `./citypulse/src/**/*.{js,jsx}`. Custom keyframes for premium animations.
- `postcss.config.js`
- `.env.local` — Supabase URL/Anon key, Geoapify key

## Run / Build
- Dev: `npm run dev` (workflow `Start application`, port 5000, webview)
- Build: `npm run build` (outputs to `citypulse/dist`)

## Splash Screen
File: `citypulse/src/components/shared/SplashScreen.jsx`

Replaces the previous `AuthSplash`. Three phases: `boot` → `brand` → `login`.

- 3D rotating Earth via Three.js (textures from `unpkg.com/three-globe`):
  - Phong-shaded sphere with bump map
  - Cloud layer
  - Custom GLSL shader atmosphere (back-side fresnel glow)
  - Two orbital rings + two satellites
  - Star field (1800 vertex-coloured points)
- Graceful fallback to a CSS/SVG-based Earth when WebGL is unavailable
  (e.g. in sandboxed preview environments) — see `CssEarthFallback`.
- HUD overlay: corner brackets, top status bar with live UTC clock,
  bottom telemetry, animated boot progress bar with rotating boot lines.
- Brand reveal: per-letter `CITYPULSE` reveal in Orbitron font,
  shimmering gradient text, holographic divider.
- Login card with "Continue with Google" (Supabase OAuth) and "Skip"
  (or "Enter the Network" if a session already exists).
- Smooth scale-blur exit transition into the dashboard.

## Premium UI System
Defined in `citypulse/src/index.css`:
- Inter (UI), Orbitron (display), JetBrains Mono (numerics) — loaded in `index.html`.
- Custom utility classes: `.cp-card`, `.cp-glass`, `.cp-btn`, `.cp-divider`,
  `.cp-shimmer-text`, `.cp-pulse-dot`, `.cp-stagger`, `.cp-page-enter`,
  `.cp-nav-active`, `.cp-topbar`.
- Keyframes: `cp-fade-up`, `cp-fade-in`, `cp-shimmer`, `cp-glow-pulse`,
  `cp-border-flow`, `cp-scan`, `cp-ping`.
- Animated card border (gradient masked), hover lift + glow.
- Premium scrollbar with cyan→violet gradient thumb.
- Respects `prefers-reduced-motion`.

## Layout Animations
- `Layout.jsx`: ambient blurred radial backgrounds, page-transition keyed by route.
- `Sidebar.jsx`: gradient logo badge, shimmering brand, active-link side-rail
  + glowing icon, staggered nav reveal, network-status footer.
- `TopBar.jsx`: glassy gradient bar, live UTC clock, expanding focus search,
  health-score pill with severity colour, pulse-dot alert indicator.
- `MetricCard.jsx`: gradient accent bar with glow, hover lift, animated icon.

## Routes
`/` Command Center, `/live-map`, `/traffic`, `/air-quality`, `/energy`, `/water`, `/waste`,
`/transport`, `/ai-advisor`, `/ml-insights`, `/scenarios`, `/alerts`. Layout protected by Supabase session.

## Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GROQ_API_KEY`
- `VITE_GEOAPIFY_API_KEY`
- `VITE_ML_API_URL` (optional; defaults to `http://<host>:8000`)

## ML Service (`ml_service/`)
A separate Python FastAPI service that serves real trained models. Workflow: `ML Service`, port 8000.

Files:
- `data_generator.py` — synthetic 30-day hourly history (5 zones × 6 metrics × ~720 hours, weather coupling, injected anomalies)
- `clean.py` — cleaning layer: schema/type coercion, unit normalization (°F→°C, km/h→m/s, ppm→µg/m³), sanity bounds, MAD z-score outlier flag, rolling-median imputation, quality score
- `train.py` — trains and persists models to `ml_service/artifacts/`
- `server.py` — FastAPI app, CORS open

Models in production:
- **Forecast**: 30 × `GradientBoostingRegressor` (one per zone × metric). Features: lag1, lag2, lag3, lag24, roll6, hour, dow, is_weekend, temp_c, humidity, wind_ms. Avg MAPE ~6.8%, MAE ~6.5.
- **Anomaly**: 6 × `IsolationForest` (one per metric type), contamination 2%.
- **City Score**: `RandomForestRegressor` over 30 severity-weight features (one per zone × metric). MAE ~0.78.

Endpoints:
- `GET  /health` — status, n_forecasters, trained_at
- `GET  /summary` — training metrics
- `POST /forecast` `{zone_id, metric_type, horizon_hours}`
- `POST /forecast/batch` `{zones?, metrics?, horizon_hours}`
- `POST /anomaly` `{rows: [{zone_id, metric_type, value, ...}]}`
- `POST /city-score` `{metrics: [{zone_id, metric_type, severity}]}`
- `POST /clean` `{rows: [{metric_type, raw_value, unit?, history?}]}`
- `POST /scenario` `{shock: {temp_delta, humidity_delta, wind_delta, hour_offset}, horizon_hours}` — re-runs forecasts under shocked weather, returns baseline vs shocked city score and per-(zone,metric) deltas
- `POST /heatmap` `{metric_type, t_hours, grid, bbox?}` — returns inverse-distance-weighted grid of forecasted values across Bengaluru bbox for time-travel heatmap

Frontend integration:
- `src/lib/mlService.js` — axios client (uses `VITE_ML_API_URL` or `http://<host>:8000`); now includes `runScenario` and `fetchHeatmap`
- `src/hooks/useMlPredictions.js` — `useMlHealth`, `useForecast`, `useForecastBatch`, `useAnomalyScan`, `useMlCityScore`, **`useScenario`**, **`useHeatmap`**
- `src/pages/MLInsights.jsx` — `/ml-insights` page (forecast chart, ML vs rule city score, anomaly counts/list)
- `src/pages/LiveMap.jsx` — **`/live-map`** new banger page: full-screen Leaflet with `leaflet.heat` heatmap, time-travel slider 0→+24h calling `/heatmap`, dark/street/satellite tile toggles, clickable zone polygons with side-drawer ML forecast, animated severity markers, integrated route planner, live anomaly stream
- `src/pages/Scenarios.jsx` — **`/scenarios`** new what-if simulator: weather shock sliders (temp/humidity/wind/hour offset), preset buttons (Heatwave / Monsoon / Festival / Power-cut), live ML re-forecast showing baseline vs shocked city score and per-zone Δ% per metric
- `src/pages/CommandCenter.jsx` — polished: animated counters, ML status badge, predictive 6-h timeline, anomaly KPI, link to Live Map

Map dependencies: `leaflet`, `react-leaflet`, `leaflet.heat`. Leaflet CSS imported in `src/main.jsx`.
