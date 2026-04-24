import { useEffect, useState } from 'react'
import { getWeather } from '../lib/openmeteo'
import { useCityStore } from '../store/cityStore'

export function useWeather() {
  const weather = useCityStore((s) => s.weather)
  const setWeather = useCityStore((s) => s.setWeather)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const lat = Number.isFinite(selectedLocation?.lat) ? selectedLocation.lat : 12.9716
  const lng = Number.isFinite(selectedLocation?.lng) ? selectedLocation.lng : 77.5946
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getWeather(lat, lng)
        setWeather(data)
        setError(null)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const timer = setInterval(load, 10 * 60 * 1000)
    return () => clearInterval(timer)
  }, [lat, lng, setWeather])

  return { weather, loading, error }
}
