# CityPulse — Smart City Intelligence Platform
## Full Project Analysis Report

---

## 1. Executive Summary

CityPulse is a **real-time smart-city operations dashboard** for Bengaluru. It pulls live data (weather, air quality, news), generates synthetic city-grid telemetry across 5 zones × 6 metrics, runs **trained Machine Learning models** for forecasting / anomaly detection / scenario simulation, and presents it all through a premium animated React UI.

It has two runtime parts:

| Part | Tech | Port | Purpose |
|------|------|------|---------|
| **Frontend** | React 19 + Vite 8 + TailwindCSS 3 + Three.js + Leaflet + Recharts + Zustand + React Router 7 | 5000 | The whole user-facing dashboard |
| **ML Service** | Python FastAPI + scikit-learn (GradientBoosting / IsolationForest / RandomForest) | 8000 | Trained models for forecasting, anomalies, city score, scenarios, heatmap |

**Backend / data layer**
- **Supabase** — auth (Google OAuth), realtime metrics, alerts table, edge functions (`update-metrics`, `simulate-disaster`)
- **Open-Meteo** — live weather
- **OpenAQ** — measured pollution
- **Geoapify** — map tiles + geocoding + routing
- **Groq LLM** — natural-language city advisor
- **NewsAPI / RSS** — live city news ticker

---

## 2. Architecture at a Glance

```
┌────────────────────────────────────────────────────────────────────┐
│                          USER (Browser)                            │
└──────────────────────────────┬─────────────────────────────────────┘
                               │
                ┌──────────────▼─────────────┐
                │  React SPA (Vite, port 5000)│
                │  Zustand global store       │
                │  React Router 7 routes      │
                └──┬─────────┬─────────┬──────┘
                   │         │         │
        ┌──────────▼──┐  ┌───▼────┐ ┌──▼────────┐
        │  Supabase    │  │ ML API │ │ Public APIs│
        │  auth+data   │  │ :8000  │ │ Weather/AQ │
        │  realtime    │  │ FastAPI│ │ News/Geo   │
        └──────────────┘  └────────┘ └────────────┘
```

The Zustand store (`cityStore.js`) is the single source of truth for `metrics`, `alerts`, `weather`, `airQuality`, `cityScore`, `selectedLocation`, `currentUser`. Every page subscribes to slices of this store.

---

## 3. Splash Screen — `SplashScreen.jsx`

The first thing the user sees. Three animated phases: **boot → brand → login**.

- A real **3D rotating Earth** built in Three.js: phong sphere with bump map, cloud layer, custom GLSL atmosphere shader (back-side fresnel glow), two orbital rings with satellites, and an 1,800-point star field.
- Falls back gracefully to a CSS/SVG Earth (`CssEarthFallback`) when WebGL is blocked.
- HUD overlay: corner brackets, live UTC clock, telemetry strip, animated boot progress bar with rotating boot lines.
- **Brand reveal**: per-letter `CITYPULSE` reveal in Orbitron font with shimmering gradient.
- **Login card**: "Continue with Google" via Supabase OAuth, plus "Skip" / "Enter the Network" if a session exists.
- Smooth scale-blur transition into the dashboard.

---

## 4. Layout Shell

### 4.1 `Layout.jsx`
- Wraps every authenticated page.
- Adds ambient blurred radial backgrounds and a per-route page-transition animation.

### 4.2 `Sidebar.jsx`
12 navigation items (in order): Command Center, Live Map, Traffic, Air Quality, Energy, Water, Waste, Transport, AI Advisor, ML Insights, Scenarios, Alerts.

- Gradient cyan→violet logo badge with glow.
- Shimmering "CITYPULSE v4.20 · LIVE" brand mark.
- Active link gets a side rail + glowing icon + pulse dot.
- Footer: "Network OK" status + a fake live counter.

### 4.3 `TopBar.jsx`
Glassy gradient bar with a live UTC clock, an expanding focus search, a city-health-score pill (colour changes by severity), and a pulsing alert indicator.

---

## 5. The Pages — Section-by-Section

### 5.1 Command Center (`/`) — `CommandCenter.jsx`
The mission-control dashboard.

**Header strip**
- Gradient title "Command Center · Real-time situational awareness · Bengaluru".
- **ML status badge** showing how many forecasters are live (green if `health.ok && models_loaded`, otherwise red).
- "Live Map →" deep-link button.

**KPI row (6 animated counter cards)**
1. **City Health Score** — composite 0–100, severity-coloured.
2. **ML Score** — same number predicted by the RandomForest model.
3. **Active Alerts** — count from the alerts table.
4. **Critical Zones** — number of metrics flagged `critical`.
5. **Anomalies Now** — current IsolationForest hits.
6. **Current Temp** — live Open-Meteo reading.

All numbers tween in via the custom `useCounter` cubic-ease hook.

**Live News ticker** — horizontally scrolling latest city headlines from `useCityNews`.

**Main grid (2/3 + 1/3)**
- **City Map** (Leaflet) with dense markers (`expandMetricsForDemo` + `relocateMetrics`) centred on the selected location.
- **Predictive 6-h Timeline** — line chart of city-average traffic + AQI predicted by `useForecastBatch` over the next 6 hours.
- **Live Alerts panel** — top 6 alerts with severity pills.

**Bottom trends row**
- 24h City Score line chart.
- Zone Load bar chart (averages per zone).

---

### 5.2 Live Map (`/live-map`) — `LiveMap.jsx` *(479 lines, the showpiece)*
A full-screen predictive geospatial console.

**Top controls**
- **Metric selector** — Traffic / Air Quality / Energy / Water / Waste / Transport (each with its own colour & unit).
- **Time-Travel slider** — 0 → +24 hours, with **Play / Pause / Reset**. Auto-plays at 800 ms per step. Each tick calls `/heatmap` on the ML service to predict that metric at that future hour.
- **Layer toggles** — Heatmap, Zone Polygons, Markers.
- **Tile chooser** — Dark (Geoapify dark-matter), Street (Geoapify osm-bright), Satellite (Esri imagery).

**The map**
- Leaflet + `leaflet.heat` rendering an inverse-distance-weighted heatmap from the ML grid (cyan → yellow → red gradient).
- **Zone polygons** for north/south/east/west/central, dashed, coloured by current severity, each with a permanent label tooltip showing live value + unit.
- **Animated severity markers** — circle markers grow & glow when critical.
- **Live route polylines** — when the route planner is used.
- Floating **legend** (metric label, gradient bar with min/median/max) and a pulsing **LIVE · NOW / +Xh** badge.

**Right drawer (3 cards)**
1. **Route Planner** — geocode "From / To" via Geoapify, draw the route, show distance/time/congestion score.
2. **Zone Drill-down** — click any polygon/marker → 12-hour ML forecast line chart for that zone.
3. **Live Anomalies** — IsolationForest hits, scrollable, shows zone · metric · score.

---

### 5.3 Traffic (`/traffic`) — `Traffic.jsx`
- KPI strip: Avg Congestion %, Critical Clusters, Worst Zone, Incidents.
- **Route Intelligence panel** — autocomplete From/To (Geoapify `searchPlaces`), "Find Route" button (`getAlternativeRoutes`), severity filter pills (All / Red / Orange / Yellow / Green), and a green banner showing the best route (km, min, congestion score).
- Map with markers + the chosen route; supports a global "traffic cloud" generator for visual density.
- Side: Congestion-by-Zone bar chart, 24h Peak Predictor area chart, and a Selected Route summary card.

---

### 5.4 Air Quality (`/air-quality`) — `AirQuality.jsx`
- Big hero card: live AQI from OpenAQ (PM2.5 + PM10 weighted), the AQI band ("Good / Moderate / Poor / Unhealthy / Hazardous"), and a coloured progress bar from green→red. Animated smog drifts across the card.
- Weather snapshot: temperature, humidity, wind, UV.
- KPIs: Overall AQI, Critical Zones, Hotspot, Health Advisory.
- Map: zone markers + a "global air cloud" of synthetic global readings, with animated wind-drift streaks; "Geoapify AQ Heatmap Layer Active" badge.
- **AQI Radial Gauge** + **Pollutants** bar chart (PM2.5, PM10, NO2, CO).
- **Predicted AQI (next hours)** line chart.
- **Precautions** list (changes with severity) and **AI Ops Suggestions** built by `buildModuleRecommendations`.

---

### 5.5 Energy (`/energy`) — `Energy.jsx`
- "Live Grid Pulse" hero with animated electric streaks; shows grid load %.
- KPIs: Total Demand (MW), Grid Load %, Critical Zones, Carbon Index.
- 24h **Demand Trend** area chart + **Zone Load** bar chart.
- Energy map of zones.
- AI Ops Suggestions block.

### 5.6 Water (`/water`) — `Water.jsx`
- "Hydraulic Stability" hero showing average pressure (kPa) with an animated water-flow blur.
- KPIs: Avg Pressure, Leak Anomalies, Reservoir Level, Quality Index.
- Map + Pressure-by-Zone bar + 24h Pressure Trend line.
- AI Ops Suggestions.

### 5.7 Waste (`/waste`) — `Waste.jsx`
- "Collection Pressure" hero with animated overflow bands.
- KPIs: Avg Fill Level, Critical Bins, Collection Efficiency, Recycling Index.
- Map + Zone Fill Comparison bar + 7-Day Trend line.
- AI Ops Suggestions.

### 5.8 Transport (`/transport`) — `Transport.jsx`
- "Transit Motion Layer" hero with floating bus/metro emojis and motion streaks.
- KPIs: Coverage %, Avg Delay (min), Crowd Density %, Cancellations.
- Map + Density-by-Zone bar + Hourly Ridership area.
- AI Ops Suggestions.

> All five module pages share the same skeleton: animated hero → 4 KPI cards → map + 2 charts → AI suggestions. The data is sliced from `cityStore.metrics` by `metric_type`.

---

### 5.9 AI Advisor (`/ai-advisor`) — `AIAdvisor.jsx` + `AIAdvisorChat.jsx`
A side-by-side chat console.

**Left rail**
- City Score number.
- **Module Intelligence**: progress bars per module (traffic, air, energy, water, waste, transport) showing average value + critical-zone count + severity pill.
- **Top Active Alerts** list.

**Right chat panel** (`AIAdvisorChat.jsx`)
- Quick prompts: "Why is east zone critical?", "Recommend emergency response actions", "What will energy demand be tonight?", "Compare all zone severity levels".
- Typed input → `askGroq(text, metrics)` calls Groq LLM with the live metric snapshot in context, replies stream into the chat.
- Every conversation is logged to Supabase `policy_logs` with the metrics snapshot for auditability.

---

### 5.10 ML Insights (`/ml-insights`) — `MLInsights.jsx`
The data-science cockpit, surfaces what the FastAPI service is doing.

- Online/offline pill with "online · N models" or "ML service offline".
- Last-trained timestamp.
- 4 KPIs: **City Score (rule)**, **City Score (ML)**, **Live Anomalies count**, **Forecast MAPE %**.
- **Forecast panel**: pick zone, metric, and horizon (3/6/12/24 h) → line chart of the GradientBoosting prediction, with the next 6 points shown as severity-pill cards.
- **Anomalies by Module** sidebar.
- **Live anomaly hits** grid showing zone · metric · value · score.
- **Models in production** explanation block (forecast, anomaly, city score, cleaning layer).

---

### 5.11 Scenarios (`/scenarios`) — `Scenarios.jsx`
A full **what-if simulator** that re-runs the ML stack under shocked weather.

- **Quick Presets**: Baseline · Heatwave +6 °C · Monsoon Storm · Festival Peak · Power-cut Hour. Each preset sets `temp_delta`, `humidity_delta`, `wind_delta`, `hour_offset`.
- **Weather Shock sliders**: Temperature Δ (-10 to +15 °C), Humidity Δ (±30 %), Wind Δ (-5 to +10 m/s), Hour offset (0–23 h).
- **Forecast horizon** dropdown: 3 / 6 / 12 / 24 h.
- **Predicted City Health Impact** card: side-by-side baseline vs shocked score with a Δ score in the middle. An interpretation line ("Severe degradation predicted…", "Mild degradation…", "No net loss expected.") changes with the delta.
- **Predicted Δ% per Zone** grid: one bar chart per metric (Traffic / Air / Energy / Water / Waste / Transport) showing how each zone is expected to react. Bars turn rose if degraded, emerald if improved.

---

### 5.12 Alerts (`/alerts`) — `Alerts.jsx`
The **citizen reporting hub**.

- Guest banner — must sign in with Google to post or vote; otherwise can browse only.
- Posts as an anonymized handle: `anon-<userId8>`.
- **Report Critical Alert form**: category (transport / air-quality / energy / water / waste), severity (critical / high / medium / low), zone, **Government Mode** toggle, title + description, "Post Alert" button.
- Insert flow:
  - Optimistic local insert into the Zustand store.
  - Insert into Supabase `alerts` table with metadata `{ thanks, no_thanks, status, category, reporterAnonId, reporterUserId }`.
  - Falls back to a metadata-less insert if the schema migration hasn't been applied yet.
- **Alert cards**: title + status pill (`pending` / `resolved`) + severity pill, message, "X minutes ago", and action buttons:
  - **Thanks (n)** / **No Thanks (n)** crowd-vote (writes back to `alerts.metadata`).
  - **Delete My Report** if you are the reporter.
  - **Mark Resolved** when Government Mode is on.

---

## 6. Shared Components

| Component | Role |
|-----------|------|
| `MetricCard.jsx` | KPI card with gradient accent bar + glow + animated icon, severity-coloured |
| `SeverityPill.jsx` | Coloured chip for low / medium / high / critical |
| `AlertBadge.jsx` | Compact alert badge for the topbar |
| `CityMap.jsx` | Leaflet wrapper with markers, routes, focus signal, severity colouring |
| `LoadingSpinner.jsx` | Premium spinner |
| `RouteError.jsx` | Friendly route-error fallback |
| `SplashScreen.jsx` / `AuthSplash.jsx` | Splash + auth gate |
| `AIAdvisorChat.jsx` | Groq chat UI |
| Charts (`charts/`) | `LineChart`, `AreaChart`, `BarChart`, `RadialGauge` — Recharts wrappers |

## 7. Hooks

| Hook | Purpose |
|------|---------|
| `useRealtimeMetrics` | Subscribes to Supabase realtime metric updates and pushes them into the store |
| `useAlerts` | Loads and subscribes to the `alerts` table |
| `useWeather` | Pulls live Open-Meteo data for the selected location |
| `useAirQuality` | Pulls live OpenAQ measurements |
| `useCityNews` | News ticker feed |
| `useCityScore` | Recomputes the rule-based 0–100 city health score |
| `useMlPredictions` | Bundle: `useMlHealth`, `useForecast`, `useForecastBatch`, `useAnomalyScan`, `useMlCityScore`, `useScenario`, `useHeatmap` — all axios calls into the FastAPI service |

## 8. State (`store/cityStore.js`)
A single Zustand store holding `metrics`, `alerts`, `weather`, `airQuality`, `cityScore`, `selectedLocation`, `currentUser`, `isDisasterMode`, `activeModule`, `sidebarCollapsed`. Includes setters plus selectors like `getMetricsByType`, `getMetricsByZone`, `getCriticalCount`, `getZoneSeverity`. Defends against bad coordinates with `safeLocation()`.

## 9. Supabase Edge Functions
- `update-metrics` — server-side metric refresher.
- `simulate-disaster` — injects a disaster scenario into the metric stream so the dashboard can demonstrate emergency mode.

## 10. ML Service (`ml_service/`)

A standalone FastAPI app (port 8000, CORS open) that backs the Live Map, ML Insights, and Scenarios pages.

**Files**
- `data_generator.py` — synthetic 30-day hourly history (5 zones × 6 metrics × ~720 hours, weather coupling, injected anomalies).
- `clean.py` — schema/type coercion, unit normalization (°F→°C, km/h→m/s, ppm→µg/m³), sanity bounds, MAD z-score outlier flag, rolling-median imputation, quality score.
- `train.py` — trains and persists models to `ml_service/artifacts/`.
- `server.py` — FastAPI app.

**Models in production**

| Model | Algorithm | Count | Notes |
|-------|-----------|-------|-------|
| Forecast | `GradientBoostingRegressor` | 30 (zone × metric) | Features: lag1/2/3/24, roll6, hour, dow, weekend, temp, humidity, wind. **Avg MAPE ~6.8 %, MAE ~6.5** |
| Anomaly | `IsolationForest` | 6 (per metric) | Contamination 2 % |
| City Score | `RandomForestRegressor` | 1 | 30 severity-weight features. **MAE ~0.78** |

**Endpoints**
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | status, n_forecasters, trained_at |
| GET | `/summary` | training metrics |
| POST | `/forecast` | single zone × metric forecast |
| POST | `/forecast/batch` | many zones / metrics in one call |
| POST | `/anomaly` | run rows through IsolationForest |
| POST | `/city-score` | RandomForest score |
| POST | `/clean` | data-cleaning pipeline |
| POST | `/scenario` | re-run forecasts under shocked weather → returns baseline vs shocked city score and per-(zone, metric) Δ% |
| POST | `/heatmap` | inverse-distance-weighted grid of forecasted values across Bengaluru bbox at time `t_hours` (drives the Live Map heatmap + time travel) |

## 11. Premium UI System (`index.css`)

- Fonts: **Inter** (UI), **Orbitron** (display), **JetBrains Mono** (numerics).
- Custom utility classes: `.cp-card`, `.cp-glass`, `.cp-btn`, `.cp-divider`, `.cp-shimmer-text`, `.cp-pulse-dot`, `.cp-stagger`, `.cp-page-enter`, `.cp-nav-active`, `.cp-topbar`.
- Keyframes: `cp-fade-up`, `cp-fade-in`, `cp-shimmer`, `cp-glow-pulse`, `cp-border-flow`, `cp-scan`, `cp-ping`, plus per-page motion (`animate-smog-move`, `animate-wind-drift`, `animate-float-soft`).
- Animated card border (gradient masked), hover lift + glow.
- Custom cyan→violet gradient scrollbar.
- Honours `prefers-reduced-motion`.

## 12. Configuration & Environment

| File | Role |
|------|------|
| `vite.config.js` | `root: 'citypulse'`, port 5000, host 0.0.0.0, allowedHosts true; `envDir` is repo root |
| `tailwind.config.js` | Scans `citypulse/index.html` and `citypulse/src/**/*.{js,jsx}`; custom keyframes |
| `postcss.config.js` | Tailwind + autoprefixer |
| `.env.local` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GROQ_API_KEY`, `VITE_GEOAPIFY_API_KEY`, optional `VITE_ML_API_URL` |

**Run**
- Dev frontend: `npm run dev` (workflow `Start application`, port 5000, webview)
- Build frontend: `npm run build` → `citypulse/dist`
- ML service: workflow `ML Service`, port 8000

## 13. Data Flow Summary

1. **Splash** authenticates the user via Supabase OAuth.
2. **`useRealtimeMetrics`** subscribes to Supabase, pushing metric rows into `cityStore`.
3. **`useWeather` / `useAirQuality` / `useCityNews`** keep external data fresh.
4. Pages **read slices** of `cityStore` via Zustand selectors, then enrich with **demo generators** (`expandMetricsForDemo`, `relocateMetrics`, `generateGlobalAirCloud`, `generateGlobalTrafficCloud`, `generateHourlyData`).
5. ML-aware pages call FastAPI (`/forecast/batch`, `/heatmap`, `/anomaly`, `/city-score`, `/scenario`) through `lib/mlService.js` and the `useMlPredictions` hooks.
6. Citizen actions on **Alerts** write through to Supabase `alerts` (with optimistic local updates). The Command Center alert panel reads them back live.
7. The **AI Advisor** sends the current metrics snapshot to **Groq**, then logs every Q+A to Supabase `policy_logs`.

---

## 14. Section-to-Feature Quick Reference (for slides)

| Section | Headline Feature | Tech Behind It |
|---------|------------------|----------------|
| Command Center | Animated KPIs + ML status + predictive 6-h timeline + live alerts | Zustand, ML batch forecast, Open-Meteo, Recharts |
| Live Map | 24-hour time-travel ML heatmap + zone drill-down + route planner | Leaflet + leaflet.heat, FastAPI `/heatmap`, Geoapify routing |
| Traffic | Severity filters + best-route congestion scoring | Geoapify routing, demo cloud generator |
| Air Quality | Live AQI from OpenAQ + AI precautions + radial gauge | OpenAQ, Recharts gauge |
| Energy | Grid pulse hero + 24h demand forecast | Demo generator + AI suggestions |
| Water | Hydraulic stability with leak-anomaly count | Same skeleton |
| Waste | Bin fill, collection efficiency, recycling | Same skeleton |
| Transport | Coverage, delay, crowd density | Same skeleton |
| AI Advisor | Groq LLM chat with live metric context, audit-logged | Groq, Supabase `policy_logs` |
| ML Insights | Forecasts + anomalies + ML vs rule city score | FastAPI scikit-learn models |
| Scenarios | Weather-shock what-if presets + per-zone Δ% | FastAPI `/scenario` |
| Alerts | Citizen reports with crowd voting + Government Mode resolve | Supabase `alerts` table |

---

*Report generated from a code-level walk-through of the `citypulse/` frontend (pages, components, hooks, store) and the `ml_service/` FastAPI backend.*
