import { useMemo } from 'react'
import { Droplets, ShieldCheck, AlertCircle, Waves } from 'lucide-react'
import CityMap from '../components/shared/CityMap'
import MetricCard from '../components/shared/MetricCard'
import LineChart from '../components/charts/LineChart'
import BarChart from '../components/charts/BarChart'
import { useCityStore } from '../store/cityStore'
import {
  buildModuleRecommendations,
  expandMetricsForDemo,
  generateHourlyData,
  relocateMetrics,
} from '../data/demoGenerators'

export default function Water() {
  const allMetrics = useCityStore((s) => s.metrics)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const mapCenter = Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
    ? [selectedLocation.lat, selectedLocation.lng]
    : [12.9716, 77.5946]
  const metrics = useMemo(
    () => allMetrics.filter((metric) => metric.metric_type === 'water'),
    [allMetrics],
  )
  const denseMarkers = useMemo(
    () => relocateMetrics(expandMetricsForDemo(metrics), mapCenter[0], mapCenter[1]),
    [metrics, mapCenter],
  )
  const avg = metrics.length ? Math.round(metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length) : 0
  const barData = metrics.map((m) => ({ name: m.zone_id, value: m.value }))
  const history = useMemo(() => generateHourlyData(Math.max(avg, 35), 24), [avg])
  const recommendations = buildModuleRecommendations(
    'water',
    avg,
    metrics.filter((m) => m.severity === 'critical').length,
  )
  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold">Water Grid Monitor</h2>
      <div className="relative overflow-hidden rounded-2xl border border-cyan-600/30 bg-gradient-to-r from-slate-900 via-cyan-900/40 to-slate-900 p-5">
        <div className="absolute -left-8 top-12 h-14 w-60 rounded-full bg-cyan-400/20 blur-2xl animate-float-soft" />
        <div className="absolute left-6 top-24 h-6 w-72 rounded-full bg-cyan-200/20 blur-md animate-wind-drift-slow" />
        <p className="relative text-xs uppercase tracking-[0.2em] text-cyan-300">Hydraulic Stability</p>
        <p className="relative mt-2 text-4xl font-black text-cyan-100">{avg} kPa</p>
        <p className="relative text-sm text-gray-300">Flow animation tracks pressure pulse and leak risk</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Avg Pressure" value={avg} unit="kPa" severity={avg <= 25 ? 'critical' : avg <= 40 ? 'high' : 'medium'} icon={Droplets} />
        <MetricCard title="Leak Anomalies" value={Math.max(2, metrics.filter((m) => m.value < 40).length)} severity="high" icon={AlertCircle} />
        <MetricCard title="Reservoir Level" value={62} unit="%" severity="medium" icon={Waves} />
        <MetricCard title="Quality Index" value={81} unit="/100" severity="low" icon={ShieldCheck} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <CityMap markers={denseMarkers} center={mapCenter} zoom={11} height="420px" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Pressure by Zone</h3>
            <BarChart data={barData} bars={[{ key: 'value', color: '#22c55e' }]} height={220} />
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">24h Pressure Trend</h3>
            <LineChart data={history} lines={[{ key: 'value', color: '#22d3ee' }]} height={220} />
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
