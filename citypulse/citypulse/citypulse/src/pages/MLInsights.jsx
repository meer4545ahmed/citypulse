import { useMemo, useState } from 'react'
import { Brain, Activity, AlertOctagon, TrendingUp, Cpu, Gauge } from 'lucide-react'
import LineChart from '../components/charts/LineChart'
import SeverityPill from '../components/shared/SeverityPill'
import {
  useMlHealth, useForecast, useAnomalyScan, useMlCityScore,
} from '../hooks/useMlPredictions'
import { useCityStore } from '../store/cityStore'

const ZONES = ['north', 'south', 'east', 'west', 'central']
const METRICS = ['traffic', 'energy', 'air', 'water', 'waste', 'transport']

export default function MLInsights() {
  const [zone, setZone] = useState('east')
  const [metric, setMetric] = useState('air')
  const [horizon, setHorizon] = useState(12)

  const { health, summary } = useMlHealth()
  const { data: forecast, loading } = useForecast(zone, metric, horizon)
  const { results: anomScan, anomalies } = useAnomalyScan()
  const mlScore = useMlCityScore()
  const ruleScore = useCityStore((s) => s.cityScore)
  const allMetrics = useCityStore((s) => s.metrics)

  const chartData = useMemo(() => {
    if (!forecast?.points) return []
    return forecast.points.map((p) => ({
      time: new Date(p.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      value: p.value,
    }))
  }, [forecast])

  const anomByMetric = useMemo(() => {
    const acc = {}
    anomalies.forEach((a) => { acc[a.metric_type] = (acc[a.metric_type] || 0) + 1 })
    return acc
  }, [anomalies])

  const offline = !health?.ok

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-fuchsia-400" />
          <h2 className="text-2xl font-bold">ML Insights</h2>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${offline ? 'bg-red-900/40 text-red-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
            {offline ? 'ML service offline' : `online · ${health?.n_forecasters || 0} models`}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          {summary?.trained_at ? `Last trained: ${new Date(summary.trained_at).toLocaleString('en-IN')}` : '—'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-400">City Score (rule)</p>
            <Gauge className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-blue-400">{ruleScore}</p>
          <p className="mt-1 text-xs text-gray-500">100 − mean(severity weight)</p>
        </div>
        <div className="rounded-xl border border-fuchsia-700/50 bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-400">City Score (ML)</p>
            <Cpu className="h-4 w-4 text-fuchsia-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-fuchsia-400">
            {mlScore ? mlScore.city_score_ml.toFixed(1) : '—'}
          </p>
          <p className="mt-1 text-xs text-gray-500">RandomForestRegressor</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-400">Live Anomalies</p>
            <AlertOctagon className="h-4 w-4 text-orange-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-orange-400">{anomalies.length}</p>
          <p className="mt-1 text-xs text-gray-500">IsolationForest · {anomScan.length} scanned</p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-gray-400">Forecast MAPE</p>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-400">
            {summary?.forecast_avg_mape ?? '—'}%
          </p>
          <p className="mt-1 text-xs text-gray-500">avg across {summary?.n_forecasters || 0} forecasters</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm uppercase tracking-wide text-gray-400">Forecast</p>
            <select className="rounded bg-gray-900 px-2 py-1 text-xs" value={zone} onChange={(e) => setZone(e.target.value)}>
              {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
            </select>
            <select className="rounded bg-gray-900 px-2 py-1 text-xs" value={metric} onChange={(e) => setMetric(e.target.value)}>
              {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select className="rounded bg-gray-900 px-2 py-1 text-xs" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
              {[3, 6, 12, 24].map((h) => <option key={h} value={h}>{h}h horizon</option>)}
            </select>
            <span className="ml-auto text-xs text-gray-500">
              {forecast ? `${forecast.model}` : loading ? 'loading…' : '—'}
            </span>
          </div>
          {chartData.length ? (
            <LineChart data={chartData} lines={[{ key: 'value', color: '#d946ef' }]} height={280} />
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-gray-500">
              {offline ? 'ML service unreachable' : 'No forecast yet'}
            </div>
          )}
          {forecast?.points?.length ? (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {forecast.points.slice(0, 6).map((p) => (
                <div key={p.ts} className="rounded border border-gray-700 bg-gray-900 p-2 text-center">
                  <p className="text-[10px] uppercase text-gray-500">
                    {new Date(p.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm font-bold text-fuchsia-300">{p.value}</p>
                  <SeverityPill severity={p.severity} />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <p className="mb-3 text-sm uppercase tracking-wide text-gray-400">Anomalies by Module</p>
          <div className="space-y-2">
            {METRICS.map((m) => (
              <div key={m} className="flex items-center justify-between rounded border border-gray-700 bg-gray-900 px-3 py-2">
                <span className="capitalize">{m}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${anomByMetric[m] ? 'bg-orange-900/40 text-orange-300' : 'bg-gray-700 text-gray-400'}`}>
                  {anomByMetric[m] || 0}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">Detector: IsolationForest, contamination 2%</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <p className="mb-3 text-sm uppercase tracking-wide text-gray-400">Live anomaly hits</p>
        {anomalies.length === 0 ? (
          <p className="text-sm text-gray-500">No anomalies in current snapshot.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {anomalies.slice(0, 12).map((a, i) => {
              const matched = allMetrics.find((m) => m.zone_id === a.zone_id && m.metric_type === a.metric_type)
              return (
                <div key={i} className="rounded border border-orange-700/50 bg-orange-950/20 p-3">
                  <p className="text-sm font-semibold capitalize">{a.zone_id} · {a.metric_type}</p>
                  <p className="text-xs text-gray-400">value {matched?.value ?? '—'} · score {a.score}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-xs text-gray-400">
        <div className="flex items-center gap-2 text-gray-300">
          <Activity className="h-4 w-4" />
          <p className="font-semibold">Models in production</p>
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>Forecast:</b> 30 × GradientBoostingRegressor (one per zone × metric), features: lag1, lag2, lag3, lag24, roll6, hour, dow, weekend, temp, humidity, wind</li>
          <li><b>Anomaly:</b> 6 × IsolationForest (one per metric type), contamination 2%</li>
          <li><b>City Score:</b> RandomForestRegressor over 30 severity-weight features</li>
          <li><b>Cleaning layer:</b> schema validation, unit normalization, sanity bounds, MAD z-score outlier flag, rolling-median imputation, quality score</li>
        </ul>
      </div>
    </div>
  )
}
