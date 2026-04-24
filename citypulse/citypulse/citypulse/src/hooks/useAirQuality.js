import { useEffect, useState } from 'react'
import { getAirQuality } from '../lib/openaq'
import { useCityStore } from '../store/cityStore'

export function useAirQuality() {
  const airQuality = useCityStore((s) => s.airQuality)
  const setAirQuality = useCityStore((s) => s.setAirQuality)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await getAirQuality()
        setAirQuality(data)
        setError(null)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    load()
    const timer = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [setAirQuality])

  return { airQuality, loading, error }
}
