import { useMemo } from 'react'
import { Trash2, AlertOctagon, Truck, Recycle } from 'lucide-react'
import CityMap from '../components/shared/CityMap'
import MetricCard from '../components/shared/MetricCard'
import BarChart from '../components/charts/BarChart'
import LineChart from '../components/charts/LineChart'
import { useCityStore } from '../store/cityStore'
import {
  buildModuleRecommendations,
  expandMetricsForDemo,
  generateHourlyData,
  relocateMetrics,
} from '../data/demoGenerators'

export default function Waste() {
  const allMetrics = useCityStore((s) => s.metrics)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const mapCenter = Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
    ? [selectedLocation.lat, selectedLocation.lng]
    : [12.9716, 77.5946]
  const metrics = useMemo(
    () => allMetrics.filter((metric) => metric.metric_type === 'waste'),
    [allMetrics],
  )
  const denseMarkers = useMemo(
    () => relocateMetrics(expandMetricsForDemo(metrics), mapCenter[0], mapCenter[1]),
    [metrics, mapCenter],
  )
  const avg = metrics.length ? Math.round(metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length) : 0
  const bars = metrics.map((m) => ({ name: m.zone_id, value: m.value }))
  const trend = useMemo(() => generateHourlyData(Math.max(avg, 40), 24), [avg])
  const recommendations = buildModuleRecommendations(
    'waste',
    avg,
    metrics.filter((m) => m.severity === 'critical').length,
  )
  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold">Waste Management</h2>
      <div className="relative overflow-hidden rounded-2xl border border-orange-600/30 bg-gradient-to-r from-slate-900 via-orange-900/35 to-slate-900 p-5">
        <div className="absolute left-0 top-20 h-7 w-64 rounded-full bg-orange-300/20 blur-md animate-smog-move" />
        <div className="absolute left-0 top-30 h-8 w-52 rounded-full bg-amber-200/20 blur-md animate-smog-move [animation-delay:2s]" />
        <p className="relative text-xs uppercase tracking-[0.2em] text-orange-300">Collection Pressure</p>
        <p className="relative mt-2 text-4xl font-black text-orange-100">{avg}%</p>
        <p className="relative text-sm text-gray-300">Animated overflow bands indicate high-risk clusters</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Avg Fill Level" value={avg} unit="%" severity={avg > 85 ? 'critical' : avg > 70 ? 'high' : 'medium'} icon={Trash2} />
        <MetricCard title="Critical Bins" value={metrics.filter((m) => m.severity === 'critical').length * 8} severity="critical" icon={AlertOctagon} />
        <MetricCard title="Collection Efficiency" value={78} unit="%" severity="medium" icon={Truck} />
        <MetricCard title="Recycling Index" value={49} unit="%" severity="medium" icon={Recycle} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <CityMap markers={denseMarkers} center={mapCenter} zoom={11} height="420px" />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Zone Fill Comparison</h3>
            <BarChart data={bars} bars={[{ key: 'value', color: '#f59e0b' }]} height={220} />
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">7-Day Trend</h3>
            <LineChart data={trend} lines={[{ key: 'value', color: '#f97316' }]} height={220} />
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
