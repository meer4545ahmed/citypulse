// Supabase Edge Function (Deno)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
  )

  const rows = await supabase.from('city_metrics').select('id,metric_type,zone_id')
  const valueByType = { traffic: 95, energy: 550, air: 280, water: 18, waste: 98, transport: 98 }

  await Promise.all(
    (rows.data || []).map((row) =>
      supabase.from('city_metrics').update({
        value: valueByType[row.metric_type] || 95,
        severity: 'critical',
      }).eq('id', row.id),
    ),
  )

  const alerts = [
    'Massive traffic gridlock — NH44 corridor blocked',
    'Power grid overload — 3 zones at 110% capacity',
    'Air quality hazardous — AQI 280 in East zone',
    'Water main burst — Central zone pressure critical',
    'Hospital at 112% capacity — KMC Manipal',
    'Flash flood warning — North zone low areas',
    'Metro lines 2 & 3 suspended — overcrowding',
    'Waste overflow — 4 collection points blocked',
  ].map((title) => ({
    alert_type: 'disaster',
    zone_id: 'central',
    title,
    message: title,
    severity: 'critical',
    is_active: true,
  }))
  await supabase.from('alerts').insert(alerts)
  return new Response(JSON.stringify({ success: true, alertsInserted: 8 }))
})
