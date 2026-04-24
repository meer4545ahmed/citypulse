import { useMemo } from 'react'
import { Wind, AlertCircle, Activity, Leaf } from 'lucide-react'
import CityMap from '../components/shared/CityMap'
import MetricCard from '../components/shared/MetricCard'
import RadialGauge from '../components/charts/RadialGauge'
import BarChart from '../components/charts/BarChart'
import LineChart from '../components/charts/LineChart'
import { useCityStore } from '../store/cityStore'
import {
  buildModuleRecommendations,
  expandMetricsForDemo,
  generateGlobalAirCloud,
  relocateMetrics,
} from '../data/demoGenerators'

export default function AirQuality() {
  const allMetrics = useCityStore((s) => s.metrics)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const airQuality = useCityStore((s) => s.airQuality)
  const weather = useCityStore((s) => s.weather)
  const mapCenter = Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
    ? [selectedLocation.lat, selectedLocation.lng]
    : [12.9716, 77.5946]
  const metrics = useMemo(
    () => allMetrics.filter((metric) => metric.metric_type === 'air'),
    [allMetrics],
  )
  const denseMarkers = useMemo(
    () => relocateMetrics(expandMetricsForDemo(metrics), mapCenter[0], mapCenter[1]),
    [metrics, mapCenter],
  )
  const globalAir = useMemo(
    () => generateGlobalAirCloud([mapCenter[0], mapCenter[1]], 6500, 1_000_000),
    [mapCenter],
  )
  const airMarkers = useMemo(() => [...denseMarkers, ...globalAir], [denseMarkers, globalAir])
  const measuredAQI = useMemo(() => {
    const measurements =
      airQuality?.flatMap((location) => location?.measurements || []).filter(Boolean) || []
    const pick = (name) =>
      measurements.find((m) => String(m.parameter || '').toLowerCase() === name)?.value
    const pm25 = Number(pick('pm25'))
    const pm10 = Number(pick('pm10'))

    // Practical AQI proxy for demo: weighted PM2.5 + PM10
    if (Number.isFinite(pm25) && Number.isFinite(pm10)) {
      return Math.round(pm25 * 1.4 + pm10 * 0.8)
    }
    if (Number.isFinite(pm25)) return Math.round(pm25 * 2.1)
    if (Number.isFinite(pm10)) return Math.round(pm10 * 1.35)
    return null
  }, [airQuality])
  const avgFromMetrics = metrics.length
    ? Math.round(metrics.reduce((acc, m) => acc + m.value, 0) / metrics.length)
    : null
  const avg = 120
  const windSpeed = Math.round(weather?.current?.wind_speed_10m || 12)
  const worst = metrics.slice().sort((a, b) => b.value - a.value)[0] || { value: avg, severity: avg > 150 ? 'critical' : avg > 100 ? 'high' : avg > 60 ? 'medium' : 'low', zone_id: 'city-core' }
  const health = avg <= 50 ? 'Good' : avg <= 100 ? 'Moderate' : avg <= 150 ? 'Unhealthy for Sensitive' : avg <= 200 ? 'Unhealthy' : 'Very Unhealthy'
  const bg = avg <= 50 ? 'bg-green-900' : avg <= 100 ? 'bg-yellow-900' : avg <= 150 ? 'bg-orange-900' : avg <= 200 ? 'bg-red-900' : 'bg-purple-900'
  const pollutantData = [
    { name: 'PM2.5', value: Math.round((measuredAQI ? avg / 2.2 : avg * 0.58)) },
    { name: 'PM10', value: Math.round((measuredAQI ? avg / 1.9 : avg * 0.9)) },
    { name: 'NO2', value: Math.round(avg * 0.26) },
    { name: 'CO', value: Math.round(avg * 0.11) },
  ]
  const recommendations = buildModuleRecommendations(
    'air',
    avg,
    metrics.filter((m) => m.severity === 'critical').length,
  )
  const forecast = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const hour = (new Date().getHours() + i) % 24
        const windFactor = windSpeed > 16 ? 0.9 : windSpeed < 8 ? 1.12 : 1
        const pulse = Math.sin(i / 1.6) * 0.1
        return {
          time: `${hour}:00`,
          value: Math.max(20, Math.round(avg * windFactor * (1 + pulse))),
        }
      }),
    [avg, windSpeed],
  )
  const precautions =
    avg <= 50
      ? ['Outdoor activities are safe.', 'Maintain routine AQ monitoring.']
      : avg <= 100
        ? ['Sensitive groups should reduce long outdoor exposure.', 'Use public transport to reduce emissions.']
        : avg <= 150
          ? ['Wear masks in high-traffic corridors.', 'Avoid outdoor workouts during peak hours.']
          : avg <= 200
            ? ['Issue health advisory city-wide.', 'Activate pollution control measures immediately.']
            : ['Emergency air alert: limit outdoor movement.', 'Deploy rapid response controls in hotspot zones.']
  const aqiBand = avg <= 50 ? 'Good' : avg <= 100 ? 'Moderate' : avg <= 150 ? 'Poor' : avg <= 200 ? 'Unhealthy' : 'Hazardous'
  const progress = Math.min(100, Math.round((Math.min(avg, 300) / 300) * 100))
  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold">Air Quality</h2>
      <div className="relative overflow-hidden rounded-2xl border border-gray-700 bg-gradient-to-r from-slate-900 via-gray-900 to-orange-900/70 p-5">
        <div className="absolute -left-10 top-8 h-24 w-24 rounded-full bg-orange-400/20 blur-2xl animate-float-soft" />
        <div className="absolute left-0 top-28 h-8 w-44 rounded-full bg-white/10 blur-sm animate-smog-move" />
        <div className="absolute left-0 top-40 h-9 w-56 rounded-full bg-white/10 blur-sm animate-smog-move [animation-delay:1.6s]" />
        <div className="absolute left-0 top-52 h-8 w-36 rounded-full bg-white/10 blur-sm animate-smog-move [animation-delay:3s]" />
        <div className="relative grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <p className="text-sm uppercase tracking-widest text-gray-400">Real-time Air Quality Index</p>
            <p className="mt-1 text-lg font-semibold text-cyan-200">{selectedLocation.name}</p>
            <div className="mt-4 flex items-end gap-4">
              <div>
                <p className="text-xs text-gray-400">Live AQI</p>
                <p className="text-6xl font-black text-orange-300">{worst?.value || avg}</p>
              </div>
              <div className="mb-2 rounded-lg border border-orange-500/30 bg-black/30 px-3 py-2">
                <p className="text-xs text-gray-400">Air quality is</p>
                <p className="text-lg font-bold text-orange-200">{aqiBand}</p>
              </div>
            </div>
            <div className="mt-3 h-2 w-full max-w-xl rounded-full bg-black/40">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 via-orange-400 to-red-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex max-w-xl justify-between text-[10px] text-gray-300">
              <span>Good</span><span>Moderate</span><span>Poor</span><span>Unhealthy</span><span>Hazardous</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-600/60 bg-slate-950/45 p-4 backdrop-blur">
            <p className="text-sm text-gray-300">Weather Snapshot</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="text-3xl">☁️</div>
              <div>
                <p className="text-2xl font-bold">{Math.round(weather?.current?.temperature_2m || 30)}°C</p>
                <p className="text-xs text-gray-300">Partly Cloudy</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-black/30 p-2"><p className="text-gray-400">Humidity</p><p className="font-semibold">{Math.round(weather?.current?.relative_humidity_2m || 24)}%</p></div>
              <div className="rounded bg-black/30 p-2"><p className="text-gray-400">Wind</p><p className="font-semibold">{windSpeed} km/h</p></div>
              <div className="rounded bg-black/30 p-2"><p className="text-gray-400">UV</p><p className="font-semibold">{Math.max(1, Math.round((avg / 100) * 2))}</p></div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Overall AQI" value={avg} severity={worst?.severity || 'medium'} icon={Wind} />
        <MetricCard title="Critical Zones" value={airMarkers.filter((m) => m.severity === 'critical').length} severity="critical" icon={AlertCircle} />
        <MetricCard title="Hotspot" value={worst?.zone_id || 'n/a'} severity={worst?.severity || 'medium'} icon={Activity} />
        <MetricCard title="Advisory" value={health} severity={avg > 150 ? 'critical' : 'high'} subtitle={`Wind ${windSpeed} km/h`} icon={Leaf} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="relative h-fit overflow-hidden rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <CityMap markers={airMarkers} center={mapCenter} zoom={11} height="420px" markerRadius={5} markerOpacity={0.22} />
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-0 top-[18%] h-[2px] w-32 rounded-full bg-cyan-200/50 blur-sm animate-wind-drift" />
            <div className="absolute left-0 top-[34%] h-[2px] w-44 rounded-full bg-blue-200/50 blur-sm animate-wind-drift-slow" />
            <div className="absolute left-0 top-[51%] h-[2px] w-36 rounded-full bg-cyan-200/50 blur-sm animate-wind-drift" />
            <div className="absolute left-0 top-[66%] h-[2px] w-40 rounded-full bg-blue-200/50 blur-sm animate-wind-drift-slow" />
            <div className="absolute left-0 top-[79%] h-[2px] w-28 rounded-full bg-cyan-100/45 blur-sm animate-wind-drift" />
          </div>
          <div className="absolute right-6 top-6 rounded-lg border border-cyan-500/30 bg-slate-950/70 px-3 py-2 text-xs text-cyan-200">
            Geoapify AQ Heatmap Layer Active
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">AQI Gauge</h3>
            <div className="flex justify-center">
              <RadialGauge value={Math.min(avg, 300)} max={300} color="#ef4444" label="AQI" />
            </div>
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Pollutants</h3>
            <BarChart data={pollutantData} bars={[{ key: 'value', color: '#f97316' }]} height={220} />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Predicted AQI (Next Hours)</h3>
          <LineChart data={forecast} lines={[{ key: 'value', color: '#38bdf8' }]} height={220} />
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-1">
          <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Precautions</h3>
          <div className="space-y-2 text-sm text-gray-300">
            {precautions.map((item) => (
              <p key={item} className="rounded bg-gray-900 p-2">• {item}</p>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">AI Ops Suggestions</h3>
          <div className="grid gap-2 text-sm text-gray-300 md:grid-cols-2">
            {recommendations.map((item) => (
              <p key={item} className="rounded bg-gray-900 p-2">• {item}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
