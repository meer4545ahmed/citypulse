import { useMemo } from 'react'
import { Bus, Clock3, Users, Ban } from 'lucide-react'
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

export default function Transport() {
  const allMetrics = useCityStore((s) => s.metrics)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const mapCenter = Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
    ? [selectedLocation.lat, selectedLocation.lng]
    : [12.9716, 77.5946]
  const metrics = useMemo(
    () => allMetrics.filter((metric) => metric.metric_type === 'transport'),
    [allMetrics],
  )
  const denseMarkers = useMemo(
    () => relocateMetrics(expandMetricsForDemo(metrics), mapCenter[0], mapCenter[1]),
    [metrics, mapCenter],
  )
  const avg = metrics.length ? Math.round(metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length) : 0
  const bars = metrics.map((m) => ({ name: m.zone_id, value: m.value }))
  const ridership = useMemo(() => generateHourlyData(Math.max(avg, 35), 24), [avg])
  const recommendations = buildModuleRecommendations(
    'transport',
    avg,
    metrics.filter((m) => m.severity === 'critical').length,
  )
  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold">Public Transport Grid</h2>
      <div className="relative overflow-hidden rounded-2xl border border-blue-600/30 bg-gradient-to-r from-slate-900 via-blue-900/35 to-slate-900 p-5">
        <div className="absolute left-0 top-16 h-[2px] w-40 rounded-full bg-blue-300/70 blur-sm animate-wind-drift" />
        <div className="absolute left-0 top-24 h-[2px] w-52 rounded-full bg-cyan-300/70 blur-sm animate-wind-drift-slow" />
        <div className="absolute right-10 top-10 text-3xl animate-float-soft">🚌</div>
        <div className="absolute right-24 top-20 text-2xl animate-float-soft [animation-delay:1s]">🚇</div>
        <p className="relative text-xs uppercase tracking-[0.2em] text-blue-300">Transit Motion Layer</p>
        <p className="relative mt-2 text-4xl font-black text-blue-100">{avg}%</p>
        <p className="relative text-sm text-gray-300">Vehicle motion simulation with demand pulse by corridor</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Coverage" value={86} unit="%" severity="low" icon={Bus} />
        <MetricCard title="Avg Delay" value={6} unit="min" severity="medium" icon={Clock3} />
        <MetricCard title="Crowd Density" value={avg} unit="%" severity={avg > 75 ? 'critical' : 'high'} icon={Users} />
        <MetricCard title="Cancellations" value={3} severity="high" icon={Ban} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <CityMap markers={denseMarkers} center={mapCenter} zoom={11} height="420px" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Density by Zone</h3>
            <BarChart data={bars} bars={[{ key: 'value', color: '#3b82f6' }]} height={220} />
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Hourly Ridership</h3>
            <AreaChart data={ridership} dataKey="value" color="#22c55e" height={220} />
          </div>
        </div>
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
