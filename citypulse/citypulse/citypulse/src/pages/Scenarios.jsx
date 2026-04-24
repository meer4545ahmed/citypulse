import { useMemo, useState } from 'react'
import { Beaker, Thermometer, Droplets, Wind, Clock, Flame, CloudRain, PartyPopper, Power, RotateCcw } from 'lucide-react'
import { useScenario } from '../hooks/useMlPredictions'
import BarChart from '../components/charts/BarChart'

const PRESETS = [
  { name: 'Baseline',        icon: RotateCcw,   shock: { temp_delta: 0,  humidity_delta: 0,   wind_delta: 0,    hour_offset: 0 },  color: 'text-gray-300' },
  { name: 'Heatwave +6°C',   icon: Flame,       shock: { temp_delta: 6,  humidity_delta: -15, wind_delta: -1.5, hour_offset: 0 },  color: 'text-orange-300' },
  { name: 'Monsoon Storm',   icon: CloudRain,   shock: { temp_delta: -4, humidity_delta: 25,  wind_delta: 6,    hour_offset: 0 },  color: 'text-blue-300' },
  { name: 'Festival Peak',   icon: PartyPopper, shock: { temp_delta: 1,  humidity_delta: 5,   wind_delta: -1,   hour_offset: 5 },  color: 'text-pink-300' },
  { name: 'Power-cut Hour',  icon: Power,       shock: { temp_delta: 3,  humidity_delta: 10,  wind_delta: 0,    hour_offset: 19 - new Date().getHours() }, color: 'text-yellow-300' },
]

const METRIC_LABELS = {
  traffic: 'Traffic',
  air: 'Air Quality',
  energy: 'Energy',
  water: 'Water',
  waste: 'Waste',
  transport: 'Transport',
}

export default function Scenarios() {
  const [shock, setShock] = useState({ temp_delta: 0, humidity_delta: 0, wind_delta: 0, hour_offset: 0 })
  const [horizon, setHorizon] = useState(6)
  const { data, loading } = useScenario(shock, horizon)

  const setKey = (k, v) => setShock((s) => ({ ...s, [k]: Number(v) }))
  const apply = (preset) => setShock(preset.shock)

  const byMetric = useMemo(() => {
    if (!data?.shocked?.metrics) return []
    const groups = {}
    for (const r of data.shocked.metrics) {
      if (!groups[r.metric_type]) groups[r.metric_type] = []
      groups[r.metric_type].push(r)
    }
    return Object.entries(groups).map(([metric, rows]) => ({
      metric,
      rows: rows.map((r) => ({ name: r.zone_id, value: Number((r.delta_pct).toFixed(1)) })),
      avgDelta: rows.reduce((acc, r) => acc + r.delta_pct, 0) / rows.length,
    }))
  }, [data])

  const baselineScore = data?.baseline?.city_score ?? 0
  const shockedScore = data?.shocked?.city_score ?? 0
  const scoreDelta = data?.score_delta ?? 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="bg-gradient-to-r from-amber-300 to-pink-400 bg-clip-text text-3xl font-extrabold text-transparent">
            Scenario Simulator
          </h2>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
            What-if analysis · ML re-runs forecasts under shocked weather
          </p>
        </div>
        {loading && <span className="text-xs text-gray-400">re-running models…</span>}
      </div>

      {/* Presets */}
      <div className="rounded-xl border border-amber-300/20 bg-gradient-to-r from-[#1a120a] to-[#0a0d18] p-4">
        <p className="mb-3 text-xs uppercase tracking-widest text-amber-200">Quick Presets</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => {
            const Icon = p.icon
            return (
              <button
                key={p.name}
                onClick={() => apply(p)}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white transition hover:border-amber-300/40 hover:bg-amber-300/10"
              >
                <Icon className={`h-4 w-4 ${p.color}`} />
                {p.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Shock controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-cyan-300/20 bg-[#0a0d18] p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-cyan-200">Weather Shock</p>
          <div className="space-y-3">
            <Slider icon={Thermometer} label="Temperature Δ" unit="°C" min={-10} max={15} step={0.5}
              value={shock.temp_delta} onChange={(v) => setKey('temp_delta', v)} color="text-orange-300" />
            <Slider icon={Droplets} label="Humidity Δ" unit="%" min={-30} max={30} step={1}
              value={shock.humidity_delta} onChange={(v) => setKey('humidity_delta', v)} color="text-blue-300" />
            <Slider icon={Wind} label="Wind Δ" unit="m/s" min={-5} max={10} step={0.5}
              value={shock.wind_delta} onChange={(v) => setKey('wind_delta', v)} color="text-emerald-300" />
            <Slider icon={Clock} label="Hour offset" unit="h" min={0} max={23} step={1}
              value={shock.hour_offset} onChange={(v) => setKey('hour_offset', v)} color="text-violet-300" />
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <span>Forecast horizon</span>
            <select
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="rounded border border-white/10 bg-[#04070d] px-2 py-1 text-white"
            >
              {[3, 6, 12, 24].map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
          </div>
        </div>

        {/* Score impact */}
        <div className="rounded-xl border border-violet-300/20 bg-gradient-to-br from-[#0d0a1f] to-[#0a0d18] p-4">
          <p className="mb-3 text-xs uppercase tracking-widest text-violet-200">Predicted City Health Impact</p>
          <div className="flex items-end justify-around">
            <ScorePill label="Baseline" value={baselineScore} color="emerald" />
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-400">Δ Score</p>
              <p className={`text-3xl font-extrabold ${scoreDelta < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                {scoreDelta > 0 ? '+' : ''}{scoreDelta}
              </p>
            </div>
            <ScorePill label="Shocked" value={shockedScore} color={shockedScore < baselineScore ? 'rose' : 'emerald'} />
          </div>
          <div className="mt-4 rounded-md border border-white/5 bg-[#04070d] p-3 text-xs text-gray-300">
            <p className="mb-1 font-semibold text-white">Interpretation</p>
            {scoreDelta < -5 && <p className="text-rose-200">Severe degradation predicted. Trigger pre-emptive interventions.</p>}
            {scoreDelta >= -5 && scoreDelta < 0 && <p className="text-amber-200">Mild degradation. Monitor closely; pre-stage assets in worst-hit zones.</p>}
            {scoreDelta >= 0 && <p className="text-emerald-200">No net loss expected. Conditions tolerable.</p>}
          </div>
        </div>
      </div>

      {/* Per-metric impact */}
      <div className="rounded-xl border border-amber-300/20 bg-[#0a0d18] p-4">
        <div className="mb-3 flex items-center gap-2">
          <Beaker className="h-4 w-4 text-amber-300" />
          <p className="text-xs uppercase tracking-widest text-amber-200">Predicted Δ% per Zone</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {byMetric.map(({ metric, rows, avgDelta }) => (
            <div key={metric} className="rounded-lg border border-white/5 bg-[#04070d] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{METRIC_LABELS[metric] || metric}</span>
                <span className={`font-mono text-xs ${avgDelta > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                  avg {avgDelta > 0 ? '+' : ''}{avgDelta.toFixed(1)}%
                </span>
              </div>
              <BarChart
                data={rows}
                bars={[{ key: 'value', color: avgDelta > 0 ? '#fb7185' : '#34d399' }]}
                height={140}
              />
            </div>
          ))}
        </div>
        {!byMetric.length && <p className="text-sm text-gray-500">Adjust any slider to see ML-predicted impact.</p>}
      </div>
    </div>
  )
}

function Slider({ icon: Icon, label, unit, min, max, step, value, onChange, color }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-gray-300">
          <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
        </span>
        <span className="font-mono text-white">{value > 0 ? '+' : ''}{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cp-time-slider w-full"
      />
    </div>
  )
}

function ScorePill({ label, value, color }) {
  const ringClasses = {
    emerald: 'border-emerald-300/40 bg-emerald-300/10 text-emerald-200',
    rose: 'border-rose-300/40 bg-rose-300/10 text-rose-200',
  }[color] || ''
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-widest text-gray-400">{label}</p>
      <div className={`mt-1 inline-flex h-20 w-20 items-center justify-center rounded-full border-2 text-2xl font-bold ${ringClasses}`}>
        {value}
      </div>
    </div>
  )
}
