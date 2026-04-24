import { useMemo } from 'react'
import { Zap, BatteryCharging, AlertTriangle, Factory } from 'lucide-react'
import CityMap from '../components/shared/CityMap'
import MetricCard from '../components/shared/MetricCard'
import AreaChart from '../components/charts/AreaChart'
import BarChart from '../components/charts/BarChart'
import { useCityStore } from '../store/cityStore'
import {
  buildModuleRecommendations,
  expandMetricsForDemo,
  generateHourlyData,
  relocateMetrics,
} from '../data/demoGenerators'

export default function Energy() {
  const allMetrics = useCityStore((s) => s.metrics)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const mapCenter = Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
    ? [selectedLocation.lat, selectedLocation.lng]
    : [12.9716, 77.5946]
  const metrics = useMemo(
    () => allMetrics.filter((metric) => metric.metric_type === 'energy'),
    [allMetrics],
  )
  const denseMarkers = useMemo(
    () => relocateMetrics(expandMetricsForDemo(metrics), mapCenter[0], mapCenter[1]),
    [metrics, mapCenter],
  )
  const avg = metrics.length ? Math.round(metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length) : 0
  const demand = useMemo(() => generateHourlyData(Math.max(avg, 280), 24), [avg])
  const bars = metrics.map((m) => ({ name: m.zone_id, value: m.value }))
  const recommendations = buildModuleRecommendations(
    'energy',
    avg,
    metrics.filter((m) => m.severity === 'critical').length,
  )
  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold">Energy Operations</h2>
      <div className="relative overflow-hidden rounded-2xl border border-yellow-600/30 bg-gradient-to-r from-slate-900 via-amber-900/50 to-slate-900 p-5">
        <div className="absolute left-0 top-7 h-[2px] w-44 animate-wind-drift rounded-full bg-yellow-300/70 blur-sm" />
        <div className="absolute left-0 top-16 h-[2px] w-56 animate-wind-drift-slow rounded-full bg-orange-300/65 blur-sm" />
        <div className="absolute left-0 top-24 h-[2px] w-48 animate-wind-drift rounded-full bg-yellow-200/70 blur-sm" />
        <p className="relative text-xs uppercase tracking-[0.2em] text-yellow-300">Live Grid Pulse</p>
        <p className="relative mt-2 text-4xl font-black text-yellow-100">{Math.min(120, Math.round((avg / 520) * 100))}%</p>
        <p className="relative text-sm text-gray-300">Electric demand waves simulated in real time</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Total Demand" value={avg * 5} unit="MW" severity={avg > 450 ? 'critical' : 'high'} icon={Zap} />
        <MetricCard title="Grid Load" value={Math.min(120, Math.round((avg / 520) * 100))} unit="%" severity={avg > 450 ? 'critical' : 'high'} icon={BatteryCharging} />
        <MetricCard title="Critical Zones" value={metrics.filter((m) => m.severity === 'critical').length} severity="critical" icon={AlertTriangle} />
        <MetricCard title="Carbon Index" value={Math.round(avg * 0.42)} severity="medium" icon={Factory} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Demand Trend (24h)</h3>
          <AreaChart data={demand} dataKey="value" color="#ef4444" height={260} />
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Zone Load</h3>
          <BarChart data={bars} bars={[{ key: 'value', color: '#3b82f6' }]} height={260} />
        </div>
      </div>
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <CityMap markers={denseMarkers} center={mapCenter} zoom={11} height="360px" />
      </div>
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">AI Ops Suggestions</h3>
        <div className="grid gap-2 md:grid-cols-2">
          {recommendations.map((item) => (
            <p key={item} className="rounded bg-gray-900 p-2 text-sm text-gray-300">• {item}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
