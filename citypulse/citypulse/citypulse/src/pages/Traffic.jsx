import { useEffect, useMemo, useState } from 'react'
import { Car, AlertTriangle, Gauge, Route, Navigation2 } from 'lucide-react'
import CityMap from '../components/shared/CityMap'
import MetricCard from '../components/shared/MetricCard'
import BarChart from '../components/charts/BarChart'
import AreaChart from '../components/charts/AreaChart'
import { useCityStore } from '../store/cityStore'
import {
  expandMetricsForDemo,
  generateHourlyData,
  relocateMetrics,
  generateGlobalTrafficCloud,
} from '../data/demoGenerators'
import { getAlternativeRoutes, searchPlaces } from '../lib/location'

export default function Traffic() {
  const allMetrics = useCityStore((s) => s.metrics)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const mapCenter = useMemo(
    () =>
      Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
        ? [selectedLocation.lat, selectedLocation.lng]
        : [12.9716, 77.5946],
    [selectedLocation?.lat, selectedLocation?.lng],
  )
  const metrics = useMemo(
    () => allMetrics.filter((metric) => metric.metric_type === 'traffic'),
    [allMetrics],
  )
  const denseMarkers = useMemo(
    () => relocateMetrics(expandMetricsForDemo(metrics), mapCenter[0], mapCenter[1]),
    [metrics, mapCenter],
  )
  const globalCloud = useMemo(
    () => generateGlobalTrafficCloud([mapCenter[0], mapCenter[1]], 2200, 1_000_000),
    [mapCenter],
  )
  const mergedTraffic = useMemo(() => [...denseMarkers, ...globalCloud], [denseMarkers, globalCloud])
  const avg = mergedTraffic.length
    ? Math.round(mergedTraffic.reduce((acc, m) => acc + m.value, 0) / mergedTraffic.length)
    : 0
  const worst = mergedTraffic.slice().sort((a, b) => b.value - a.value)[0]
  const barData = ['north', 'south', 'east', 'west', 'central'].map((zone) => {
    const points = mergedTraffic.filter((m) => m.zone_id?.includes(zone) || m.zone_id === zone)
    const value = points.length ? Math.round(points.reduce((a, b) => a + b.value, 0) / points.length) : Math.round(40 + Math.random() * 50)
    return { name: zone, value }
  })
  const hourly = useMemo(() => generateHourlyData(Math.max(avg, 50), 24), [avg])
  const [fromText, setFromText] = useState('Fun World, JC Nagar, Bengaluru')
  const [toText, setToText] = useState('Presidency University, Rajanukunte, Bengaluru')
  const [fromSuggestions, setFromSuggestions] = useState([])
  const [toSuggestions, setToSuggestions] = useState([])
  const [selectedFrom, setSelectedFrom] = useState(null)
  const [selectedTo, setSelectedTo] = useState(null)
  const [routes, setRoutes] = useState([])
  const [routePins, setRoutePins] = useState([])
  const [routeLoading, setRouteLoading] = useState(false)
  const [routeFocusSignal, setRouteFocusSignal] = useState(0)
  const [severityFilter, setSeverityFilter] = useState('all')
  const bestRoute = routes.slice().sort((a, b) => a.congestionScore - b.congestionScore)[0]
  const filteredTraffic = useMemo(
    () => (severityFilter === 'all' ? mergedTraffic : mergedTraffic.filter((m) => m.severity === severityFilter)),
    [mergedTraffic, severityFilter],
  )

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (fromText.trim().length < 3) {
        setFromSuggestions([])
        return
      }
      const results = await searchPlaces(fromText)
      setFromSuggestions(results.slice(0, 5))
    }, 250)
    return () => clearTimeout(timer)
  }, [fromText])

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (toText.trim().length < 3) {
        setToSuggestions([])
        return
      }
      const results = await searchPlaces(toText)
      setToSuggestions(results.slice(0, 5))
    }, 250)
    return () => clearTimeout(timer)
  }, [toText])

  const planRoutes = async () => {
    setRouteLoading(true)
    try {
      const [fromResult] = await searchPlaces(fromText)
      const [toResult] = await searchPlaces(toText)
      const from = selectedFrom || fromResult || {
        name: fromText || 'Start',
          lat: mapCenter[0] - 0.06,
          lng: mapCenter[1] - 0.08,
      }
      const to = selectedTo || toResult || {
        name: toText || 'Destination',
          lat: mapCenter[0] + 0.07,
          lng: mapCenter[1] + 0.08,
      }
      const alternatives = await getAlternativeRoutes(from, to)
      if (!alternatives.length) return
      const sorted = alternatives.sort((a, b) => a.congestionScore - b.congestionScore)
      setRoutes([sorted[0]])
      setRoutePins([
        { type: 'start', lat: from.lat, lng: from.lng, label: from.name },
        { type: 'end', lat: to.lat, lng: to.lng, label: to.name },
      ])
      setRouteFocusSignal((n) => n + 1)
    } catch (error) {
      setRoutes([])
      setRoutePins([])
    } finally {
      setRouteLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-3xl font-bold">Traffic Intelligence</h2>
      <div className="rounded-2xl border border-blue-700/40 bg-gradient-to-r from-slate-900 via-gray-900 to-blue-950/60 p-4 shadow-[0_0_35px_rgba(59,130,246,0.2)]">
        <div className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <MetricCard title="Avg Congestion" value={avg} unit="%" severity={avg > 80 ? 'critical' : avg > 60 ? 'high' : 'medium'} subtitle="Realtime traffic pulse" icon={Gauge} />
          </div>
          <MetricCard title="Critical Clusters" value={mergedTraffic.filter((m) => m.severity === 'critical').length} severity="critical" icon={AlertTriangle} />
          <MetricCard title="Worst Zone" value={worst?.zone_id || 'n/a'} severity={worst?.severity || 'low'} icon={Route} />
          <MetricCard title="Incidents" value={Math.max(12, Math.floor(mergedTraffic.length / 48))} severity="high" icon={Car} />
        </div>
      </div>
      <div className="rounded-xl border border-blue-700/40 bg-gradient-to-r from-slate-900 via-gray-900 to-slate-900 p-4 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-blue-300">Route Intelligence</p>
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="relative">
            <input
              value={fromText}
              onChange={(e) => {
                setFromText(e.target.value)
                setSelectedFrom(null)
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
              placeholder="From location"
            />
            {!!fromSuggestions.length && !selectedFrom && (
              <div className="absolute z-[1000] mt-1 max-h-44 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-900 text-xs">
                {fromSuggestions.map((item) => (
                  <button
                    type="button"
                    key={`${item.name}-${item.lat}`}
                    onClick={() => {
                      setSelectedFrom(item)
                      setFromText(item.name)
                      setFromSuggestions([])
                    }}
                    className="w-full border-b border-gray-800 px-3 py-2 text-left hover:bg-gray-800"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative">
            <input
              value={toText}
              onChange={(e) => {
                setToText(e.target.value)
                setSelectedTo(null)
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
              placeholder="To location"
            />
            {!!toSuggestions.length && !selectedTo && (
              <div className="absolute z-[1000] mt-1 max-h-44 w-full overflow-auto rounded-lg border border-gray-700 bg-gray-900 text-xs">
                {toSuggestions.map((item) => (
                  <button
                    type="button"
                    key={`${item.name}-${item.lat}`}
                    onClick={() => {
                      setSelectedTo(item)
                      setToText(item.name)
                      setToSuggestions([])
                    }}
                    className="w-full border-b border-gray-800 px-3 py-2 text-left hover:bg-gray-800"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={planRoutes} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition hover:scale-[1.02]">
            {routeLoading ? 'Planning...' : 'Find Route'}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setRouteFocusSignal((n) => n + 1)
            }}
            className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white"
          >
            Auto Route
          </button>
          {[
            ['all', 'All Dots'],
            ['critical', 'Red'],
            ['high', 'Orange'],
            ['medium', 'Yellow'],
            ['low', 'Green'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSeverityFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                severityFilter === key ? 'bg-slate-200 text-slate-900' : 'border border-gray-600 text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {bestRoute ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-600/40 bg-green-950/30 px-3 py-2 text-sm text-green-200">
            <Navigation2 className="h-4 w-4" />
            Best route: {bestRoute.name} | {bestRoute.distanceKm} km | {bestRoute.durationMin} min | congestion {bestRoute.congestionScore}/100
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-fit rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <CityMap
            markers={filteredTraffic}
            routes={routes}
            routePins={routePins}
            focusRouteSignal={routeFocusSignal}
            center={mapCenter}
            zoom={11}
            height="460px"
          />
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Congestion by Zone</h3>
            <BarChart data={barData} bars={[{ key: 'value', color: '#ef4444' }]} height={220} />
          </div>
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">24h Peak Predictor</h3>
            <AreaChart data={hourly} dataKey="value" color="#f59e0b" height={220} />
          </div>
          {!!routes.length && (
            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-400">Selected Route</h3>
              <div className="space-y-2 text-sm">
                {routes.map((route) => (
                  <div key={route.id} className="rounded-lg border border-gray-700 bg-gray-900 p-2">
                    <span className={route.id === bestRoute?.id ? 'font-semibold text-green-300' : 'text-gray-200'}>
                      {route.name}: {route.distanceKm} km | {route.durationMin} min | score {route.congestionScore}/100
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
