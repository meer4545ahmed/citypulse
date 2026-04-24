import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import {
  MapContainer, TileLayer, CircleMarker, Polygon, Polyline, Popup, useMap, LayersControl, Tooltip,
} from 'react-leaflet'
import {
  Layers, Wind, Car, Zap, Droplets, Trash2, Bus, Activity,
  Play, Pause, RotateCcw, MapPin, Clock, Sparkles,
} from 'lucide-react'
import { ZONE_COORDINATES } from '../data/seedData'
import { useCityStore } from '../store/cityStore'
import { useHeatmap, useForecastBatch, useAnomalyScan } from '../hooks/useMlPredictions'
import { searchPlaces, getAlternativeRoutes } from '../lib/location'
import LineChart from '../components/charts/LineChart'

const METRIC_OPTIONS = [
  { key: 'traffic',   label: 'Traffic',     icon: Car,      color: '#f97316', unit: '%'    },
  { key: 'air',       label: 'Air Quality', icon: Wind,     color: '#22d3ee', unit: 'AQI'  },
  { key: 'energy',    label: 'Energy',      icon: Zap,      color: '#facc15', unit: 'MW'   },
  { key: 'water',     label: 'Water',       icon: Droplets, color: '#38bdf8', unit: 'PSI'  },
  { key: 'waste',     label: 'Waste',       icon: Trash2,   color: '#a78bfa', unit: '%'    },
  { key: 'transport', label: 'Transport',   icon: Bus,      color: '#34d399', unit: 'pax'  },
]

const ZONES = ['north', 'south', 'east', 'west', 'central']

const ZONE_POLYGONS = {
  north:   [[13.130, 77.560], [13.130, 77.660], [13.020, 77.660], [13.020, 77.560]],
  south:   [[12.940, 77.560], [12.940, 77.660], [12.860, 77.660], [12.860, 77.560]],
  east:    [[13.020, 77.660], [13.020, 77.760], [12.940, 77.760], [12.940, 77.660]],
  west:    [[13.020, 77.460], [13.020, 77.560], [12.940, 77.560], [12.940, 77.460]],
  central: [[13.020, 77.560], [13.020, 77.660], [12.940, 77.660], [12.940, 77.560]],
}

function HeatLayer({ points, max, gradient }) {
  const map = useMap()
  const layerRef = useRef(null)
  useEffect(() => {
    if (!points || !points.length) return
    const data = points.map((p) => [p.lat, p.lng, Math.max(0, p.value / Math.max(1, max))])
    if (layerRef.current) {
      map.removeLayer(layerRef.current)
    }
    layerRef.current = L.heatLayer(data, {
      radius: 38,
      blur: 28,
      maxZoom: 14,
      max: 1.0,
      gradient: gradient || { 0.0: '#0ea5e9', 0.3: '#22d3ee', 0.5: '#facc15', 0.7: '#fb923c', 0.9: '#ef4444' },
    }).addTo(map)
    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [points, max, gradient, map])
  return null
}

function MapResize() {
  const map = useMap()
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150)
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(map.getContainer())
    return () => { clearTimeout(t); ro.disconnect() }
  }, [map])
  return null
}

const sevColor = (sev) => ({ low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' }[sev] || '#3b82f6')
const sevWeight = (sev) => ({ low: 8, medium: 30, high: 65, critical: 95 }[sev] || 30)

export default function LiveMap() {
  const metrics = useCityStore((s) => s.metrics)
  const [metricKey, setMetricKey] = useState('air')
  const [tHours, setTHours] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showHeat, setShowHeat] = useState(true)
  const [showZones, setShowZones] = useState(true)
  const [showMarkers, setShowMarkers] = useState(true)
  const [tile, setTile] = useState('dark')
  const [selectedZone, setSelectedZone] = useState(null)

  // Routing
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [routes, setRoutes] = useState([])
  const [routePins, setRoutePins] = useState([])
  const [routeBusy, setRouteBusy] = useState(false)
  const [routeMsg, setRouteMsg] = useState('')

  const metricCfg = METRIC_OPTIONS.find((m) => m.key === metricKey)

  const { data: heatData, loading: heatLoading } = useHeatmap(metricKey, tHours, 24)
  const { data: forecastData } = useForecastBatch(ZONES, [metricKey], 12)
  const { anomalies } = useAnomalyScan()

  // Auto-play time slider
  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => {
      setTHours((h) => (h >= 24 ? 0 : h + 1))
    }, 800)
    return () => clearInterval(t)
  }, [playing])

  const tileUrl = useMemo(() => {
    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || '1082d83046d140449f9b2df065b7da14'
    if (tile === 'satellite') {
      return {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Esri · World Imagery',
      }
    }
    if (tile === 'street') {
      return {
        url: `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`,
        attribution: 'Geoapify · OpenStreetMap',
      }
    }
    return {
      url: `https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${apiKey}`,
      attribution: 'Geoapify · CARTO Dark',
    }
  }, [tile])

  const zoneForecastForSelected = useMemo(() => {
    if (!selectedZone || !forecastData?.results) return null
    const r = forecastData.results.find((x) => x.zone_id === selectedZone && x.metric_type === metricKey)
    if (!r) return null
    return r.points.map((p, i) => ({ name: `+${i + 1}h`, value: p.value, severity: p.severity }))
  }, [forecastData, selectedZone, metricKey])

  const zoneCurrent = (z) => {
    const m = metrics.find((mm) => mm.zone_id === z && mm.metric_type === metricKey)
    return m ? m.value : (heatData?.zone_values?.[z] ?? 0)
  }

  const zoneSeverity = (z) => {
    const m = metrics.find((mm) => mm.zone_id === z && mm.metric_type === metricKey)
    return m?.severity || 'medium'
  }

  const handleRoute = async () => {
    if (!from || !to) return
    setRouteBusy(true); setRouteMsg('')
    try {
      const aArr = await searchPlaces(from)
      const bArr = await searchPlaces(to)
      const a = aArr?.[0]
      const b = bArr?.[0]
      if (!a || !b) { setRouteMsg('Could not geocode one of the locations'); setRouteBusy(false); return }
      const rs = await getAlternativeRoutes(a, b)
      setRoutes(rs || [])
      setRoutePins([
        { type: 'start', lat: a.lat, lng: a.lng, label: a.name },
        { type: 'end',   lat: b.lat, lng: b.lng, label: b.name },
      ])
      setRouteMsg(`${rs?.length || 0} route(s) found · best ${rs?.[0]?.distanceKm}km / ${rs?.[0]?.durationMin}min · congestion ${rs?.[0]?.congestionScore}`)
    } catch (e) {
      setRouteMsg('Routing failed')
    } finally {
      setRouteBusy(false)
    }
  }

  const tHourLabel = tHours === 0 ? 'NOW' : `+${tHours}h`

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-3xl font-extrabold text-transparent">
            Live Predictive Map
          </h2>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
            Real-time heatmap · ML forecasts · Zone drill-down · Route planner
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-cyan-300/30 bg-cyan-300/5 px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-cyan-200">
            <Sparkles className="mr-1 inline h-3 w-3" /> Powered by ML · {forecastData?.results?.length || 0} models live
          </span>
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-cyan-300/20 bg-gradient-to-r from-[#0a1224] to-[#070b16] p-3">
        {METRIC_OPTIONS.map((m) => {
          const Icon = m.icon
          const active = m.key === metricKey
          return (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all ${
                active
                  ? 'border-cyan-300/60 bg-cyan-300/10 text-white shadow-[0_0_18px_rgba(96,214,255,0.35)]'
                  : 'border-white/5 bg-white/[0.02] text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" style={{ color: active ? m.color : undefined }} />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Time travel */}
      <div className="rounded-xl border border-violet-300/25 bg-gradient-to-r from-[#0d0a1f] to-[#070b16] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-violet-200">
            <Clock className="h-4 w-4" />
            <span className="font-semibold uppercase tracking-widest">Time Travel</span>
            <span className="ml-2 rounded-md bg-violet-400/15 px-2 py-0.5 font-mono text-violet-200">{tHourLabel}</span>
            {heatLoading && <span className="text-xs text-gray-400">predicting…</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPlaying((p) => !p)}
              className="flex items-center gap-1 rounded-md border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-xs text-violet-100 hover:bg-violet-400/20">
              {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {playing ? 'Pause' : 'Play'}
            </button>
            <button onClick={() => { setTHours(0); setPlaying(false) }}
              className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-gray-300 hover:bg-white/[0.08]">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="24"
          value={tHours}
          onChange={(e) => setTHours(Number(e.target.value))}
          className="cp-time-slider w-full"
        />
        <div className="mt-1 flex justify-between text-[10px] text-gray-500">
          <span>NOW</span><span>+6h</span><span>+12h</span><span>+18h</span><span>+24h</span>
        </div>
      </div>

      {/* Layers control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0a0d18] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Layers className="h-4 w-4 text-gray-400" />
          <span className="text-xs uppercase tracking-widest text-gray-400">Layers</span>
          <Toggle on={showHeat} setOn={setShowHeat} label="Heatmap" />
          <Toggle on={showZones} setOn={setShowZones} label="Zone Polygons" />
          <Toggle on={showMarkers} setOn={setShowMarkers} label="Markers" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-gray-400">Tiles</span>
          {[
            ['dark', 'Dark'],
            ['street', 'Street'],
            ['satellite', 'Satellite'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTile(k)}
              className={`rounded-md px-2.5 py-1 text-[11px] uppercase tracking-wider transition ${
                tile === k
                  ? 'border border-cyan-300/40 bg-cyan-300/10 text-cyan-100'
                  : 'border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white'
              }`}
            >{l}</button>
          ))}
        </div>
      </div>

      {/* Map + side drawer */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="relative overflow-hidden rounded-xl border border-cyan-300/20 bg-[#04070d] shadow-[0_0_60px_rgba(34,211,238,0.08)]">
          <MapContainer center={[12.9716, 77.5946]} zoom={11} style={{ height: '620px', width: '100%' }} scrollWheelZoom>
            <MapResize />
            <TileLayer attribution={tileUrl.attribution} url={tileUrl.url} key={tile} />
            {showHeat && heatData?.points && (
              <HeatLayer
                points={heatData.points}
                max={heatData.max}
                gradient={{ 0.0: '#0ea5e9', 0.3: '#22d3ee', 0.5: '#facc15', 0.7: '#fb923c', 0.9: '#ef4444' }}
              />
            )}
            {showZones && ZONES.map((z) => {
              const sev = zoneSeverity(z)
              return (
                <Polygon
                  key={z}
                  positions={ZONE_POLYGONS[z]}
                  pathOptions={{
                    color: sevColor(sev),
                    weight: 2,
                    fillOpacity: 0.07,
                    dashArray: '4 6',
                  }}
                  eventHandlers={{ click: () => setSelectedZone(z) }}
                >
                  <Tooltip permanent direction="center" className="cp-zone-tooltip">
                    <span className="font-mono">{z.toUpperCase()} · {Math.round(zoneCurrent(z))} {metricCfg.unit}</span>
                  </Tooltip>
                </Polygon>
              )
            })}
            {showMarkers && ZONES.map((z) => {
              const c = ZONE_COORDINATES[z]
              const sev = zoneSeverity(z)
              const isCrit = sev === 'critical'
              return (
                <CircleMarker
                  key={`m-${z}`}
                  center={[c.lat, c.lng]}
                  radius={isCrit ? 14 : 9}
                  pathOptions={{
                    color: sevColor(sev),
                    fillColor: sevColor(sev),
                    fillOpacity: isCrit ? 0.55 : 0.35,
                    weight: isCrit ? 3 : 2,
                  }}
                  eventHandlers={{ click: () => setSelectedZone(z) }}
                >
                  <Popup>
                    <div className="text-xs">
                      <div className="font-semibold">{c.label}</div>
                      <div>{metricCfg.label}: <b>{Math.round(zoneCurrent(z))}</b> {metricCfg.unit}</div>
                      <div>Severity: {sev}</div>
                      <button
                        onClick={() => setSelectedZone(z)}
                        className="mt-1 text-cyan-600 underline"
                      >Open forecast →</button>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
            {/* Routes */}
            {routes.map((r, i) => (
              <Polyline
                key={r.id || i}
                positions={r.geometry || []}
                pathOptions={{ color: i === 0 ? '#22d3ee' : '#a78bfa', weight: i === 0 ? 6 : 4, opacity: 0.9 }}
              />
            ))}
            {routePins.map((p, i) => (
              <CircleMarker
                key={`pin-${i}`}
                center={[p.lat, p.lng]}
                radius={8}
                pathOptions={{
                  color: p.type === 'start' ? '#22c55e' : '#ec4899',
                  fillColor: p.type === 'start' ? '#22c55e' : '#ec4899',
                  fillOpacity: 1,
                  weight: 2,
                }}
              >
                <Popup><div className="text-xs"><b>{p.type === 'start' ? 'Start' : 'Destination'}</b><br />{p.label}</div></Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          {/* Floating legend */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-[400] rounded-lg border border-white/10 bg-[#04070d]/85 p-3 backdrop-blur-md">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-cyan-200">Heatmap · {metricCfg.label}</div>
            <div className="flex h-2 w-48 rounded bg-gradient-to-r from-cyan-500 via-yellow-400 to-red-500" />
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>{heatData?.min ?? '—'}</span>
              <span>median</span>
              <span>{heatData?.max ?? '—'} {metricCfg.unit}</span>
            </div>
          </div>

          {/* Floating live badge */}
          <div className="pointer-events-none absolute top-4 right-4 z-[400] flex items-center gap-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-[10px] font-mono uppercase text-emerald-100 backdrop-blur">
            <span className="cp-pulse-dot" /> LIVE · {tHourLabel}
          </div>
        </div>

        {/* Drawer */}
        <div className="space-y-3">
          {/* Routing card */}
          <div className="rounded-xl border border-cyan-300/20 bg-[#0a0d18] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <MapPin className="h-4 w-4" /> Route Planner
            </div>
            <input
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From (e.g. MG Road)"
              className="mb-2 w-full rounded-md border border-white/10 bg-[#04070d] px-3 py-2 text-sm text-white placeholder-gray-500"
            />
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To (e.g. Whitefield)"
              className="mb-2 w-full rounded-md border border-white/10 bg-[#04070d] px-3 py-2 text-sm text-white placeholder-gray-500"
            />
            <button
              onClick={handleRoute}
              disabled={routeBusy}
              className="w-full rounded-md bg-gradient-to-r from-cyan-400 to-violet-400 px-3 py-2 text-sm font-semibold text-gray-950 hover:opacity-90 disabled:opacity-50"
            >
              {routeBusy ? 'Planning…' : 'Plan Route'}
            </button>
            {routeMsg && <p className="mt-2 text-xs text-gray-400">{routeMsg}</p>}
          </div>

          {/* Selected zone forecast */}
          <div className="rounded-xl border border-violet-300/20 bg-[#0a0d18] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-200">
              <Activity className="h-4 w-4" /> Zone Drill-down
            </div>
            {!selectedZone && (
              <p className="text-xs text-gray-500">Click any zone polygon or marker to see its 12-hour ML forecast.</p>
            )}
            {selectedZone && (
              <>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{ZONE_COORDINATES[selectedZone].label}</p>
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-widest text-gray-300">
                    {metricCfg.label}
                  </span>
                </div>
                <p className="mb-2 text-2xl font-bold text-white">
                  {Math.round(zoneCurrent(selectedZone))} <span className="text-xs font-normal text-gray-400">{metricCfg.unit}</span>
                </p>
                {zoneForecastForSelected ? (
                  <div className="rounded-md border border-white/5 bg-[#04070d] p-2">
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-violet-200">12-hour ML forecast</p>
                    <LineChart
                      data={zoneForecastForSelected}
                      lines={[{ key: 'value', color: metricCfg.color }]}
                      height={140}
                    />
                  </div>
                ) : <p className="text-xs text-gray-500">Loading forecast…</p>}
              </>
            )}
          </div>

          {/* Live anomalies */}
          <div className="rounded-xl border border-rose-300/20 bg-[#0a0d18] p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-200">
              <Sparkles className="h-4 w-4" /> Live Anomalies
              <span className="ml-auto rounded-md bg-rose-300/15 px-2 py-0.5 font-mono text-[10px] text-rose-200">
                {anomalies.length}
              </span>
            </div>
            {anomalies.length === 0 && <p className="text-xs text-gray-500">All readings within learned distribution.</p>}
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {anomalies.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-center justify-between rounded-md border border-rose-300/15 bg-rose-300/5 px-2 py-1 text-xs">
                  <span className="text-rose-100">{a.zone_id} · {a.metric_type}</span>
                  <span className="font-mono text-rose-300">{a.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ on, setOn, label }) {
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className={`rounded-md px-2.5 py-1 text-[11px] uppercase tracking-wider transition ${
        on
          ? 'border border-cyan-300/40 bg-cyan-300/10 text-cyan-100'
          : 'border border-white/10 bg-white/[0.03] text-gray-500 hover:text-white'
      }`}
    >{label}</button>
  )
}
