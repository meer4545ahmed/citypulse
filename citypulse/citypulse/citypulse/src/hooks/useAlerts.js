import { useMemo } from 'react'
import { useCityStore } from '../store/cityStore'

export function useAlerts() {
  const alerts = useCityStore((s) => s.alerts)
  const activeAlerts = useMemo(() => alerts.filter((a) => a.is_active !== false), [alerts])
  const criticalCount = useMemo(
    () => activeAlerts.filter((a) => a.severity === 'critical').length,
    [activeAlerts],
  )
  return { alerts, activeAlerts, criticalCount }
}
