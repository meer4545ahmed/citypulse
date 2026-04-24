import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet'

const isValidPoint = (point) =>
  Array.isArray(point) &&
  point.length === 2 &&
  Number.isFinite(point[0]) &&
  Number.isFinite(point[1])

function MapBehavior({ center, routes, focusRouteSignal }) {
  const map = useMap()

  useEffect(() => {
    const scheduleInvalidate = () =>
      requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true })
      })

    scheduleInvalidate()
    const resizeObserver = new ResizeObserver(() => scheduleInvalidate())
    resizeObserver.observe(map.getContainer())

    return () => resizeObserver.disconnect()
  }, [map])

  useEffect(() => {
    if (!routes.length || !routes[0]?.geometry?.length) return
    const points = routes[0].geometry.filter(isValidPoint)
    if (!points.length) return
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 })
  }, [map, routes, focusRouteSignal])

  useEffect(() => {
    if (!isValidPoint(center)) return
    const current = map.getCenter()
    if (Math.abs(current.lat - center[0]) > 0.0001 || Math.abs(current.lng - center[1]) > 0.0001) {
      map.setView(center, map.getZoom(), { animate: false })
    }
  }, [map, center])

  return null
}

export default function CityMap({
  markers = [],
  routes = [],
  routePins = [],
  focusRouteSignal = 0,
  center = [12.9716, 77.5946],
  zoom = 12,
  height = '400px',
  markerRadius = 2,
  markerOpacity = 0.8,
}) {
  const geoApiKey = import.meta.env.VITE_GEOAPIFY_API_KEY || '1082d83046d140449f9b2df065b7da14'
  const safeCenter = isValidPoint(center) ? center : [12.9716, 77.5946]
  const colorFor = (severity) =>
    ({ low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444' })[severity] || '#3b82f6'
  const [vehicleIdx, setVehicleIdx] = useState(0)
  const bestRoute = routes[0] || null
  const vehiclePath = (bestRoute?.geometry || []).filter(isValidPoint)
  const vehiclePosition = vehiclePath.length ? vehiclePath[vehicleIdx % vehiclePath.length] : null
  const safeMarkers = useMemo(
    () => markers.filter((marker) => Number.isFinite(marker?.lat) && Number.isFinite(marker?.lng)),
    [markers],
  )
  const safeRoutes = useMemo(
    () =>
      routes
        .map((route) => ({
          ...route,
          geometry: (route.geometry || []).filter(isValidPoint),
        }))
        .filter((route) => route.geometry.length > 1),
    [routes],
  )
  const safePins = useMemo(
    () => routePins.filter((pin) => Number.isFinite(pin?.lat) && Number.isFinite(pin?.lng)),
    [routePins],
  )

  useEffect(() => {
    setVehicleIdx(0)
  }, [routes])

  useEffect(() => {
    if (!vehiclePath.length) return
    const timer = setInterval(() => {
      setVehicleIdx((idx) => (idx + 1) % vehiclePath.length)
    }, 550)
    return () => clearInterval(timer)
  }, [vehiclePath.length])

  return (
    <div style={{ height, minHeight: 420 }}>
      <MapContainer center={safeCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <MapBehavior
          center={safeCenter}
          routes={safeRoutes}
          focusRouteSignal={focusRouteSignal}
        />
        <TileLayer
          attribution="Geoapify © OpenStreetMap contributors"
          url={`https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?&apiKey=${geoApiKey}`}
        />
        {safeMarkers.map((marker, idx) => (
          <CircleMarker
            key={`${marker.zone_id}-${marker.metric_type}-${idx}`}
            center={[marker.lat, marker.lng]}
            radius={markerRadius}
            pathOptions={{
              color: colorFor(marker.severity),
              fillColor: colorFor(marker.severity),
              fillOpacity: markerOpacity,
            }}
          >
            <Popup>
              <p className="font-semibold">{marker.zone_id}</p>
              <p>{marker.metric_type}: {marker.value}</p>
              <p>{marker.severity}</p>
            </Popup>
          </CircleMarker>
        ))}
        {safeRoutes.map((route, idx) => (
          <Polyline
            key={route.id || idx}
            positions={route.geometry}
            pathOptions={{
              color: '#111111',
              weight: 6,
              opacity: 0.95,
            }}
          />
        ))}
        {safePins.map((pin, idx) => (
          <CircleMarker
            key={`${pin.type}-${idx}`}
            center={[pin.lat, pin.lng]}
            radius={pin.type === 'start' ? 6 : 7}
            pathOptions={{
              color: pin.type === 'start' ? '#0f172a' : '#ff4da6',
              fillColor: pin.type === 'start' ? '#0f172a' : '#ff4da6',
              fillOpacity: 1,
              weight: 2,
            }}
          >
            <Popup>
              <p className="font-semibold">{pin.type === 'start' ? 'Start 📍' : 'Destination 📍'}</p>
              <p className="text-xs text-gray-400">{pin.label}</p>
            </Popup>
          </CircleMarker>
        ))}
        {vehiclePosition ? (
          <CircleMarker
            center={vehiclePosition}
            radius={5}
            pathOptions={{ color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 1, weight: 2 }}
          >
            <Popup>
              <p className="font-semibold">Vehicle</p>
            </Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  )
}
