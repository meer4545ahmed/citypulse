import axios from 'axios'

const ML_BASE = import.meta.env.VITE_ML_API_URL || `${window.location.protocol}//${window.location.hostname}:8000`

const client = axios.create({ baseURL: ML_BASE, timeout: 8000 })

export async function mlHealth() {
  try {
    const { data } = await client.get('/health')
    return data
  } catch {
    return { ok: false }
  }
}

export async function mlSummary() {
  try {
    const { data } = await client.get('/summary')
    return data
  } catch {
    return null
  }
}

export async function forecastMetric(zoneId, metricType, horizonHours = 6) {
  const { data } = await client.post('/forecast', {
    zone_id: zoneId,
    metric_type: metricType,
    horizon_hours: horizonHours,
  })
  return data
}

export async function forecastBatch(zones, metrics, horizonHours = 6) {
  const { data } = await client.post('/forecast/batch', {
    zones,
    metrics,
    horizon_hours: horizonHours,
  })
  return data
}

export async function detectAnomalies(rows) {
  const { data } = await client.post('/anomaly', { rows })
  return data
}

export async function predictCityScore(metrics) {
  const { data } = await client.post('/city-score', {
    metrics: metrics.map((m) => ({
      zone_id: m.zone_id,
      metric_type: m.metric_type,
      severity: m.severity,
    })),
  })
  return data
}

export async function cleanReadings(rows) {
  const { data } = await client.post('/clean', { rows })
  return data
}

export async function runScenario(shock, horizonHours = 6) {
  const { data } = await client.post('/scenario', {
    shock,
    horizon_hours: horizonHours,
  })
  return data
}

export async function fetchHeatmap(metricType, tHours = 0, grid = 24, bbox = null) {
  const { data } = await client.post('/heatmap', {
    metric_type: metricType,
    t_hours: tHours,
    grid,
    bbox,
  })
  return data
}

export const ML_BASE_URL = ML_BASE
