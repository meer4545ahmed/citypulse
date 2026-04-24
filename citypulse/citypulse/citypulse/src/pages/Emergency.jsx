import CityMap from '../components/shared/CityMap'
import { useCityStore } from '../store/cityStore'
import { relocateMetrics } from '../data/demoGenerators'

export default function Emergency() {
  const alerts = useCityStore((s) => s.alerts)
  const metrics = useCityStore((s) => s.metrics)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const mapCenter = Number.isFinite(selectedLocation?.lat) && Number.isFinite(selectedLocation?.lng)
    ? [selectedLocation.lat, selectedLocation.lng]
    : [12.9716, 77.5946]
  const critical = relocateMetrics(
    metrics.filter((m) => m.severity === 'critical'),
    mapCenter[0],
    mapCenter[1],
  )
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Emergency</h2>
      <p>{alerts.length} active incidents</p>
      <CityMap markers={critical} center={mapCenter} zoom={11} height="460px" />
    </div>
  )
}
