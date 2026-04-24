import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const weights = { low: 5, medium: 30, high: 65, critical: 95 }

const resolveSeverity = (type, value) => {
  if (type === 'traffic') return value < 40 ? 'low' : value < 60 ? 'medium' : value < 80 ? 'high' : 'critical'
  if (type === 'energy') return value < 200 ? 'low' : value < 350 ? 'medium' : value < 450 ? 'high' : 'critical'
  if (type === 'air') return value < 50 ? 'low' : value < 100 ? 'medium' : value < 150 ? 'high' : 'critical'
  if (type === 'water') return value > 60 ? 'low' : value > 40 ? 'medium' : value > 25 ? 'high' : 'critical'
  if (type === 'waste') return value < 50 ? 'low' : value < 70 ? 'medium' : value < 85 ? 'high' : 'critical'
  return value < 40 ? 'low' : value < 60 ? 'medium' : value < 75 ? 'high' : 'critical'
}

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  const { data } = await supabase.from('city_metrics').select('*')
  const updated = (data || []).map((row) => {
    const next = Math.max(1, row.value + (Math.random() * 20 - 10))
    return { id: row.id, value: Math.round(next), severity: resolveSeverity(row.metric_type, next) }
  })

  await Promise.all(updated.map((row) => supabase.from('city_metrics').update({ value: row.value, severity: row.severity }).eq('id', row.id)))
  const avg = updated.reduce((sum, row) => sum + weights[row.severity], 0) / Math.max(updated.length, 1)
  await supabase.from('city_score_history').insert({ score: Math.max(0, Math.min(100, Math.round(100 - avg))) })
  return new Response(JSON.stringify({ success: true }))
})
