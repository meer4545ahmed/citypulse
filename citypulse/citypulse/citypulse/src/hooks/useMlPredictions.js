import { useEffect, useState, useCallback } from 'react'
import {
  mlHealth, mlSummary, forecastMetric, forecastBatch,
  detectAnomalies, predictCityScore, runScenario, fetchHeatmap,
} from '../lib/mlService'
import { useCityStore } from '../store/cityStore'

export function useMlHealth(refreshMs = 30000) {
  const [health, setHealth] = useState(null)
  const [summary, setSummary] = useState(null)
  useEffect(() => {
    let active = true
    const tick = async () => {
      const [h, s] = await Promise.all([mlHealth(), mlSummary()])
      if (active) {
        setHealth(h)
        setSummary(s)
      }
    }
    tick()
    const t = setInterval(tick, refreshMs)
    return () => { active = false; clearInterval(t) }
  }, [refreshMs])
  return { health, summary }
}

export function useForecast(zoneId, metricType, horizon = 6, refreshMs = 60000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!zoneId || !metricType) return
    setLoading(true)
    try {
      const d = await forecastMetric(zoneId, metricType, horizon)
      setData(d)
      setError(null)
    } catch (e) {
      setError(e?.message || 'forecast failed')
    } finally {
      setLoading(false)
    }
  }, [zoneId, metricType, horizon])

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, refreshMs)
    return () => clearInterval(t)
  }, [refresh, refreshMs])

  return { data, loading, error, refresh }
}

export function useForecastBatch(zones, metrics, horizon = 6, refreshMs = 90000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let active = true
    const tick = async () => {
      setLoading(true)
      try {
        const d = await forecastBatch(zones, metrics, horizon)
        if (active) setData(d)
      } finally {
        if (active) setLoading(false)
      }
    }
    tick()
    const t = setInterval(tick, refreshMs)
    return () => { active = false; clearInterval(t) }
  }, [JSON.stringify(zones), JSON.stringify(metrics), horizon, refreshMs])
  return { data, loading }
}

export function useAnomalyScan(refreshMs = 45000) {
  const metrics = useCityStore((s) => s.metrics)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!metrics.length) return
    let active = true
    const tick = async () => {
      setLoading(true)
      try {
        const rows = metrics.map((m) => ({
          zone_id: m.zone_id,
          metric_type: m.metric_type,
          value: m.value,
        }))
        const d = await detectAnomalies(rows)
        if (active) setResults(d?.results || [])
      } finally {
        if (active) setLoading(false)
      }
    }
    tick()
    const t = setInterval(tick, refreshMs)
    return () => { active = false; clearInterval(t) }
  }, [metrics, refreshMs])

  return { results, loading, anomalies: results.filter((r) => r.is_anomaly) }
}

export function useScenario(shock, horizon = 6, debounceMs = 350) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    let active = true
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const d = await runScenario(shock, horizon)
        if (active) { setData(d); setError(null) }
      } catch (e) {
        if (active) setError(e?.message || 'scenario failed')
      } finally {
        if (active) setLoading(false)
      }
    }, debounceMs)
    return () => { active = false; clearTimeout(t) }
  }, [JSON.stringify(shock), horizon, debounceMs])
  return { data, loading, error }
}

export function useHeatmap(metricType, tHours = 0, grid = 24, refreshMs = 60000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!metricType) return
    let active = true
    const tick = async () => {
      setLoading(true)
      try {
        const d = await fetchHeatmap(metricType, tHours, grid)
        if (active) setData(d)
      } finally {
        if (active) setLoading(false)
      }
    }
    tick()
    const t = setInterval(tick, refreshMs)
    return () => { active = false; clearInterval(t) }
  }, [metricType, tHours, grid, refreshMs])
  return { data, loading }
}

export function useMlCityScore(refreshMs = 30000) {
  const metrics = useCityStore((s) => s.metrics)
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!metrics.length) return
    let active = true
    const tick = async () => {
      try {
        const d = await predictCityScore(metrics)
        if (active) setData(d)
      } catch {
        if (active) setData(null)
      }
    }
    tick()
    const t = setInterval(tick, refreshMs)
    return () => { active = false; clearInterval(t) }
  }, [metrics, refreshMs])
  return data
}
