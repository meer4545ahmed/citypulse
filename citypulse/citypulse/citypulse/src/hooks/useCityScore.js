import { useEffect } from 'react'
import { useCityStore } from '../store/cityStore'

const mapSeverity = { low: 5, medium: 30, high: 65, critical: 95 }

export function useCityScore() {
  const metrics = useCityStore((s) => s.metrics)
  const cityScore = useCityStore((s) => s.cityScore)
  const setCityScore = useCityStore((s) => s.setCityScore)

  useEffect(() => {
    if (!metrics.length) return
    const total = metrics.reduce((sum, m) => sum + (mapSeverity[m.severity] ?? 30), 0)
    const avg = total / metrics.length
    const score = Math.max(0, Math.min(100, Math.round(100 - avg)))
    setCityScore(score)
  }, [metrics, setCityScore])

  const scoreColor =
    cityScore >= 70
      ? 'text-green-400'
      : cityScore >= 50
        ? 'text-yellow-400'
        : cityScore >= 30
          ? 'text-orange-400'
          : 'text-red-500'

  return { cityScore, scoreColor }
}
