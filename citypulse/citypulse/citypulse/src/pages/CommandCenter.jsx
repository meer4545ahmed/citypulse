import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity, Bell, AlertTriangle, Wind, Thermometer, Brain, Map as MapIcon, ArrowUpRight, Sparkles,
} from 'lucide-react'
import MetricCard from '../components/shared/MetricCard'
import CityMap from '../components/shared/CityMap'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import SeverityPill from '../components/shared/SeverityPill'
import { useCityStore } from '../store/cityStore'
import { expandMetricsForDemo, generateHourlyData, relocateMetrics } from '../data/demoGenerators'
import { useCityNews } from '../hooks/useCityNews'
import { useMlCityScore, useMlHealth, useAnomalyScan, useForecastBatch } from '../hooks/useMlPredictions'

function useCounter(target, duration = 900) {
  const [n, setN] = useState(target)
  const startVal = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const from = startVal.current
    const to = Number(target) || 0
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(from + (to - from) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
      else startVal.current = to
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return n
}

export default function CommandCenter() {
  const metrics = useCityStore((s) => s.metrics)
  const alerts = useCityStore((s) => s.alerts)
  const cityScore = useCityStore((s) => s.cityScore)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const mapCenter = Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
    ? [selectedLocation.lat, selectedLocation.lng]
    : [12.9716, 77.5946]
  const weather = useCityStore((s) => s.weather)
  const news = useCityNews()
  const mlScore = useMlCityScore()
  const { health: mlHealthData } = useMlHealth()
  const { anomalies } = useAnomalyScan()
  const { data: forecastBatch } = useForecastBatch(['north', 'south', 'east', 'west', 'central'], ['traffic', 'air'], 6)

  const denseMarkers = useMemo(
    () => relocateMetrics(expandMetricsForDemo(metrics), mapCenter[0], mapCenter[1]),
    [metrics, mapCenter],
  )
  const scoreHistory = useMemo(() => generateHourlyData(Math.max(cityScore, 40), 24), [cityScore])
  const zoneLoad = useMemo(() => {
    const zones = ['north', 'south', 'east', 'west', 'central']
    return zones.map((zone) => {
      const values = metrics.filter((m) => m.zone_id === zone)
      const avg = values.length ? Math.round(values.reduce((acc, m) => acc + m.value, 0) / values.length) : 0
      return { name: zone, value: avg }
    })
  }, [metrics])

  const predictiveTimeline = useMemo(() => {
    if (!forecastBatch?.results?.length) return []
    const horizon = forecastBatch.results[0].points.length
    const out = []
    for (let i = 0; i < horizon; i++) {
      const vals = forecastBatch.results.map((r) => r.points[i].value)
      out.push({ name: `+${i + 1}h`, value: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) })
    }
    return out
  }, [forecastBatch])

  const score = useCounter(cityScore)
  const alertsN = useCounter(alerts.length)
  const criticalN = useCounter(metrics.filter((m) => m.severity === 'critical').length)
  const tempN = useCounter(Math.round(weather?.current?.temperature_2m || 28))
  const mlScoreN = useCounter(mlScore?.city_score_ml || 0)

  const mlBadgeOk = mlHealthData?.ok && mlHealthData?.models_loaded

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="bg-gradient-to-r from-cyan-300 via-violet-400 to-pink-300 bg-clip-text text-3xl font-extrabold text-transparent">
            Command Center
          </h2>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
            Real-time situational awareness · Bengaluru
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-2 rounded-md border px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest ${
            mlBadgeOk
              ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200'
              : 'border-rose-300/40 bg-rose-300/10 text-rose-200'
          }`}>
            <span className={`cp-pulse-dot ${mlBadgeOk ? '' : 'opacity-50'}`} />
            ML · {mlHealthData?.n_forecasters || 0} models {mlBadgeOk ? 'live' : 'offline'}
          </span>
          <Link to="/live-map" className="flex items-center gap-1 rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-300/20">
            <MapIcon className="h-3 w-3" /> Live Map <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-6">
        <MetricCard title="City Health Score" value={score} severity={cityScore < 40 ? 'critical' : cityScore < 60 ? 'high' : 'medium'} icon={Activity} />
        <MetricCard title="ML Score" value={mlScore?.city_score_ml ? mlScoreN : '—'} severity={mlScore?.city_score_ml < 40 ? 'critical' : 'medium'} icon={Brain} />
        <MetricCard title="Active Alerts" value={alertsN} severity={alerts.length > 4 ? 'critical' : 'high'} icon={Bell} />
        <MetricCard title="Critical Zones" value={criticalN} severity="critical" icon={AlertTriangle} />
        <MetricCard title="Anomalies Now" value={anomalies.length} severity={anomalies.length > 0 ? 'high' : 'low'} icon={Sparkles} />
        <MetricCard title="Current Temp" value={tempN} unit="°C" severity="low" icon={Thermometer} />
      </div>

      {/* News ticker */}
      <div className="overflow-hidden rounded-xl border border-cyan-300/20 bg-gradient-to-r from-[#0a1224] via-[#070b16] to-[#0a1224] py-2">
        <div className="animate-[slideDown_0.6s_ease-out] whitespace-nowrap text-sm text-cyan-100">
          <span className="mx-3 font-semibold text-cyan-300">Live City News:</span>
          {news.map((item, idx) => (
            <span key={`${item.title}-${idx}`} className="mr-6 inline-block">
              {item.title} <span className="text-gray-400">({item.source})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Map + alerts + predictive timeline */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-cyan-300/20 bg-gradient-to-br from-[#0a0d18] to-[#070b16] p-4 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm uppercase tracking-widest text-cyan-200">City Map</p>
            <Link to="/live-map" className="text-xs text-cyan-300 hover:underline">Open Live Predictive Map →</Link>
          </div>
          <CityMap markers={denseMarkers} center={mapCenter} zoom={11} height="420px" />
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-cyan-300/20 bg-[#0a0d18] p-4">
            <p className="mb-2 text-sm uppercase tracking-widest text-cyan-200">Predictive 6-h Timeline</p>
            {predictiveTimeline.length ? (
              <LineChart data={predictiveTimeline} lines={[{ key: 'value', color: '#22d3ee' }]} height={150} />
            ) : <p className="py-8 text-center text-xs text-gray-500">Loading ML forecast…</p>}
            <p className="mt-1 text-[10px] text-gray-500">City-average traffic + AQI predicted by ML models</p>
          </div>

          <div className="rounded-xl border border-rose-300/20 bg-[#0a0d18] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm uppercase tracking-widest text-rose-200">Live Alerts</p>
              <span className="rounded-md bg-rose-300/15 px-2 py-0.5 font-mono text-[10px] text-rose-200">{alerts.length}</span>
            </div>
            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {alerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="rounded-lg border border-white/5 bg-[#04070d] p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold">{alert.title}</p>
                    <SeverityPill severity={alert.severity} />
                  </div>
                  <p className="text-[10px] text-gray-400">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Trends */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-cyan-300/20 bg-[#0a0d18] p-4">
          <p className="mb-3 text-sm uppercase tracking-widest text-cyan-200">City Score Trend (24h)</p>
          <LineChart data={scoreHistory} lines={[{ key: 'value', color: '#22d3ee' }]} height={260} />
        </div>
        <div className="rounded-xl border border-amber-300/20 bg-[#0a0d18] p-4">
          <p className="mb-3 text-sm uppercase tracking-widest text-amber-200">Zone Load Comparison</p>
          <BarChart data={zoneLoad} bars={[{ key: 'value', color: '#fbbf24' }]} height={260} />
        </div>
      </div>
    </div>
  )
}
