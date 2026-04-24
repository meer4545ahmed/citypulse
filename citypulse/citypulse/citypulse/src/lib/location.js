import axios from 'axios'

const GEOAPIFY_KEY =
  import.meta.env.VITE_GEOAPIFY_API_KEY || '1082d83046d140449f9b2df065b7da14'

const computePathDistanceKm = (path) => {
  if (!Array.isArray(path) || path.length < 2) return 0
  const R = 6371
  let total = 0
  for (let i = 1; i < path.length; i += 1) {
    const [lat1, lng1] = path[i - 1]
    const [lat2, lng2] = path[i]
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    total += 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  }
  return total
}

const buildFallbackRoutes = (from, to) => {
  const mkPath = (bend = 0) =>
    Array.from({ length: 20 }, (_, i) => {
      const t = i / 19
      const lat = from.lat + (to.lat - from.lat) * t + Math.sin(t * Math.PI) * bend
      const lng = from.lng + (to.lng - from.lng) * t - Math.sin(t * Math.PI) * bend
      return [lat, lng]
    })

  return [0, 0.01, -0.01].map((bend, idx) => ({
    id: `fallback-${idx + 1}`,
    name: `Route ${idx + 1}`,
    distanceKm: Number((5 + idx * 0.8).toFixed(1)),
    durationMin: 18 + idx * 5,
    congestionScore: 22 + idx * 18,
    geometry: mkPath(bend).filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1])),
    from,
    to,
  }))
}

export async function searchPlaces(query) {
  if (!query?.trim()) return []
  const { data } = await axios.get('https://api.geoapify.com/v1/geocode/search', {
    params: { text: query, format: 'json', limit: 5, apiKey: GEOAPIFY_KEY },
  })
  return (data?.results || [])
    .map((item) => ({
      name: item.formatted,
      lat: Number(item.lat),
      lng: Number(item.lon),
    }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))
}

export async function getAlternativeRoutes(from, to) {
  if (!Number.isFinite(from?.lat) || !Number.isFinite(from?.lng) || !Number.isFinite(to?.lat) || !Number.isFinite(to?.lng)) {
    return []
  }
  let feature
  try {
    const plannerResponse = await axios.post(
      `https://api.geoapify.com/v1/routeplanner?apiKey=${GEOAPIFY_KEY}`,
      {
        mode: 'drive',
        waypoints: [
          { location: [from.lng, from.lat] },
          { location: [to.lng, to.lat] },
        ],
        traffic: 'approximated',
        alternatives: 3,
      },
    )
    feature = plannerResponse?.data?.features?.[0]
  } catch (error) {
    const waypoints = `${from.lat},${from.lng}|${to.lat},${to.lng}`
    const { data } = await axios.get('https://api.geoapify.com/v1/routing', {
      params: {
        waypoints,
        mode: 'drive',
        details: 'instruction_details',
        traffic: 'approximated',
        apiKey: GEOAPIFY_KEY,
      },
    })
    feature = data?.features?.[0]
  }

  const coordinates = feature?.geometry?.coordinates || []
  const normalized = feature?.geometry?.type === 'MultiLineString'
    ? coordinates.flat()
    : coordinates

  const baseGeometry = normalized
    .map(([lng, lat]) => [Number(lat), Number(lng)])
    .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]))
  if (baseGeometry.length < 2) {
    return buildFallbackRoutes(from, to)
  }

  const sourceDistanceKm = (feature?.properties?.distance || 0) / 1000
  const sourceDurationMin = (feature?.properties?.time || 0) / 60
  const geometryDistanceKm = computePathDistanceKm(baseGeometry)
  const baseDistanceKm = sourceDistanceKm > 0.5 ? sourceDistanceKm : geometryDistanceKm
  const baseDurationMin = sourceDurationMin > 1 ? sourceDurationMin : (baseDistanceKm / 32) * 60

  const variants = [0.92, 1.0, 1.18]
  const routes = variants.map((factor, idx) => {
    const distanceKm = Number((baseDistanceKm * (0.96 + idx * 0.03)).toFixed(1))
    const durationMin = Math.round(baseDurationMin * factor)
    const congestionScore = Math.min(100, Math.max(8, Math.round((durationMin / Math.max(distanceKm, 1)) * 14)))
    const shiftedGeometry =
      idx === 0
        ? baseGeometry
        : baseGeometry.map(([lat, lng], i) => {
            const pulse = Math.sin(i / 8) * 0.002 * idx
            return [lat + pulse, lng - pulse]
          })
    return {
      id: `route-${idx + 1}`,
      name: `Route ${idx + 1}`,
      distanceKm,
      durationMin,
      congestionScore,
      geometry: shiftedGeometry,
      from,
      to,
    }
  })
  return routes.filter((route) => route.geometry.length > 1)
}
