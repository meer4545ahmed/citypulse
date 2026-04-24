const zoneOffsets = [
  [0, 0],
  [0.003, -0.004],
  [-0.002, 0.005],
  [0.004, 0.003],
]

export const generateHourlyData = (baseValue, hours = 24) =>
  Array.from({ length: hours }, (_, i) => {
    const hour = (new Date().getHours() - hours + i + 24) % 24
    const peak = hour >= 8 && hour <= 10 ? 1.3 : hour >= 17 && hour <= 20 ? 1.45 : hour <= 5 ? 0.7 : 1
    const noise = 0.9 + Math.random() * 0.22
    return { time: `${hour}:00`, value: Math.round(baseValue * peak * noise) }
  })

export const expandMetricsForDemo = (metrics) =>
  metrics.flatMap((metric) =>
    zoneOffsets.map(([dLat, dLng], idx) => ({
      ...metric,
      id: `${metric.id || `${metric.zone_id}-${metric.metric_type}`}-${idx}`,
      lat: metric.lat + dLat,
      lng: metric.lng + dLng,
      value: Math.max(1, Math.round(metric.value * (0.88 + Math.random() * 0.25))),
    })),
  )

export const relocateMetrics = (metrics, lat, lng) => {
  if (!metrics.length) return metrics
  const baseLat = metrics[0].lat || 12.9716
  const baseLng = metrics[0].lng || 77.5946
  const dLat = lat - baseLat
  const dLng = lng - baseLng
  return metrics.map((metric) => ({
    ...metric,
    lat: metric.lat + dLat,
    lng: metric.lng + dLng,
  }))
}

const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export const generateGlobalTrafficCloud = (center, visiblePoints = 1600, universeSize = 1_000_000) =>
  Array.from({ length: visiblePoints }, (_, idx) => {
    const seed = idx + center[0] * 1000 + center[1] * 1000
    const spreadLat = (seededRandom(seed) - 0.5) * 1.2
    const spreadLng = (seededRandom(seed + 99) - 0.5) * 1.2
    const value = Math.round(30 + seededRandom(seed + 7) * 70)
    const severity = value >= 82 ? 'critical' : value >= 62 ? 'high' : value >= 42 ? 'medium' : 'low'
    return {
      id: `global-${Math.floor(seededRandom(seed + 500) * universeSize)}-${idx}`,
      zone_id: `cluster-${(idx % 24) + 1}`,
      metric_type: 'traffic',
      value,
      severity,
      lat: center[0] + spreadLat,
      lng: center[1] + spreadLng,
    }
  })

export const generateGlobalAirCloud = (center, visiblePoints = 4500, universeSize = 1_000_000) =>
  Array.from({ length: visiblePoints }, (_, idx) => {
    const seed = idx + center[0] * 1200 + center[1] * 1400
    const spreadLat = (seededRandom(seed) - 0.5) * 1.5
    const spreadLng = (seededRandom(seed + 77) - 0.5) * 1.5
    const value = Math.round(35 + seededRandom(seed + 17) * 230)
    const severity = value >= 180 ? 'critical' : value >= 130 ? 'high' : value >= 80 ? 'medium' : 'low'
    return {
      id: `aq-global-${Math.floor(seededRandom(seed + 500) * universeSize)}-${idx}`,
      zone_id: `aq-cluster-${(idx % 36) + 1}`,
      metric_type: 'air',
      value,
      severity,
      lat: center[0] + spreadLat,
      lng: center[1] + spreadLng,
    }
  })

export const buildModuleRecommendations = (module, avg, criticalCount) => {
  const common = [
    `Geo-focus active: city-wide simulation tuned for current map center.`,
    `Realtime + demo blend enabled to keep data dense for presentations.`,
  ]
  const moduleSpecific = {
    air: [
      `Issue advisory in top hotspots and promote transit in peak corridors.`,
      `Deploy temporary low-emission restrictions where AQI remains elevated.`,
    ],
    energy: [
      `Shift non-critical loads from peak windows to off-peak periods.`,
      `Prioritize feeder stabilization in high-demand clusters.`,
    ],
    water: [
      `Inspect low-pressure clusters first; prioritize leak isolation.`,
      `Rebalance valve pressure to protect critical service points.`,
    ],
    waste: [
      `Reroute collection fleet to bins above 85% occupancy first.`,
      `Open temporary overflow points near critical clusters.`,
    ],
    transport: [
      `Increase service frequency along overloaded corridors.`,
      `Push diversion advisories for routes with high crowd density.`,
    ],
  }[module] || []
  return [
    `${module.toUpperCase()} pressure: avg ${avg}, critical clusters ${criticalCount}.`,
    ...moduleSpecific,
    ...common,
  ]
}
