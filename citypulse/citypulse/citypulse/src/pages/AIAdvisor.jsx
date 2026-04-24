import AIAdvisorChat from '../components/shared/AIAdvisorChat'
import { useCityStore } from '../store/cityStore'
import SeverityPill from '../components/shared/SeverityPill'
import { useMemo } from 'react'

export default function AIAdvisor() {
  const metrics = useCityStore((s) => s.metrics)
  const alerts = useCityStore((s) => s.alerts)
  const cityScore = useCityStore((s) => s.cityScore)
  const moduleStatus = useMemo(() => {
    const types = ['traffic', 'air', 'energy', 'water', 'waste', 'transport']
    return types.map((type) => {
      const values = metrics.filter((m) => m.metric_type === type)
      const avg = values.length ? Math.round(values.reduce((a, b) => a + b.value, 0) / values.length) : 0
      const critical = values.filter((v) => v.severity === 'critical').length
      return { type, avg, critical, severity: critical ? 'critical' : avg > 75 ? 'high' : avg > 50 ? 'medium' : 'low' }
    })
  }, [metrics])

  return (
    <div className="grid h-[calc(100vh-140px)] grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="custom-scrollbar space-y-4 overflow-auto rounded-xl border border-gray-700 bg-gray-800 p-4 lg:col-span-2">
        <h2 className="text-2xl font-bold">AI Advisor</h2>
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">City Score</p>
          <p className="mt-1 text-4xl font-bold text-blue-400">{cityScore}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">Module Intelligence</p>
          {moduleStatus.map((row) => (
            <div key={row.type} className="rounded-lg border border-gray-700 bg-gray-900 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium capitalize">{row.type}</p>
                <SeverityPill severity={row.severity} />
              </div>
              <div className="h-2 rounded-full bg-gray-700">
                <div className="h-2 rounded-full bg-blue-500" style={{ width: `${Math.min(100, row.avg)}%` }} />
              </div>
              <p className="mt-2 text-xs text-gray-400">Avg value {row.avg} | Critical zones {row.critical}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2 rounded-lg border border-gray-700 bg-gray-900 p-3">
          <p className="text-xs uppercase tracking-wide text-gray-400">Top Active Alerts</p>
          {(alerts.slice(0, 5)).map((alert) => (
            <div key={alert.id} className="rounded border border-gray-700 p-2">
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs text-gray-400">{alert.zone_id} zone</p>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-3">
        <AIAdvisorChat />
      </div>
    </div>
  )
}
