import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { INITIAL_METRICS } from '../data/seedData'
import { useCityStore } from '../store/cityStore'

export function useRealtimeMetrics() {
  const setMetrics = useCityStore((s) => s.setMetrics)
  const setAlerts = useCityStore((s) => s.setAlerts)
  const addAlert = useCityStore((s) => s.addAlert)
  const updateAlert = useCityStore((s) => s.updateAlert)

  useEffect(() => {
    const boot = async () => {
      const { data: metrics } = await supabase.from('city_metrics').select('*')
      if (!metrics?.length) {
        await supabase.from('city_metrics').insert(INITIAL_METRICS)
        setMetrics(INITIAL_METRICS)
      } else {
        const keys = new Set(metrics.map((m) => `${m.zone_id}-${m.metric_type}`))
        const missing = INITIAL_METRICS.filter((m) => !keys.has(`${m.zone_id}-${m.metric_type}`))
        if (missing.length) {
          await supabase.from('city_metrics').insert(missing)
          setMetrics([...metrics, ...missing])
        } else {
          setMetrics(metrics)
        }
      }
      const { data: alerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (alerts?.length) {
        setAlerts(alerts)
      } else {
        setAlerts([
          {
            id: 'demo-alert-1',
            title: 'Traffic surge near MG Road',
            message: 'Congestion rising to high severity in central zone.',
            zone_id: 'central',
            severity: 'high',
            is_active: true,
            created_at: new Date().toISOString(),
          },
          {
            id: 'demo-alert-2',
            title: 'Air quality unhealthy in east',
            message: 'PM2.5 crossing safe levels. Health advisory suggested.',
            zone_id: 'east',
            severity: 'critical',
            is_active: true,
            created_at: new Date().toISOString(),
          },
        ])
      }
    }
    boot()

    const metricsChannel = supabase
      .channel('city-metrics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'city_metrics' }, async () => {
        const { data } = await supabase.from('city_metrics').select('*')
        setMetrics(data || [])
      })
      .subscribe()

    const alertsChannel = supabase
      .channel('city-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, (payload) => {
        if (payload.new && payload.eventType === 'INSERT') addAlert(payload.new)
        if (payload.new && payload.eventType === 'UPDATE') updateAlert(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(metricsChannel)
      supabase.removeChannel(alertsChannel)
    }
  }, [addAlert, setAlerts, setMetrics, updateAlert])
}
