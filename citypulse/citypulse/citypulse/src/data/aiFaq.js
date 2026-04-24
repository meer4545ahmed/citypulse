export const AI_FAQ = [
  { q: 'What is city health score?', a: 'City Health Score summarizes all module severities into one 0-100 number. Higher is better and means fewer critical conditions across zones.' },
  { q: 'How is city score calculated?', a: 'Each metric severity maps to low=5, medium=30, high=65, critical=95. City score is 100 minus the average of those values.' },
  { q: 'Why is east zone critical?', a: 'East zone is typically critical when multiple modules spike together, especially traffic, air quality, and waste fill levels.' },
  { q: 'How many zones are monitored?', a: 'CityPulse monitors 5 zones: north, south, east, west, and central Bengaluru.' },
  { q: 'What are the core modules?', a: 'Traffic, Air Quality, Energy, Water, Waste, Transport, Emergency, Alerts, Command Center, and AI Advisor.' },
  { q: 'What does critical mean?', a: 'Critical means immediate operational risk and priority response is required from command teams.' },
  { q: 'What does high severity mean?', a: 'High severity indicates strong degradation and likely escalation if no mitigation action is taken.' },
  { q: 'What does medium severity mean?', a: 'Medium severity means caution state. Conditions are manageable but trending risk may exist.' },
  { q: 'What does low severity mean?', a: 'Low severity means stable operations with low immediate risk.' },
  { q: 'Recommend emergency actions now', a: 'Prioritize zone triage, dispatch units to critical clusters, protect hospitals, and push public advisories for traffic and air hotspots.' },
  { q: 'What is best first response for disaster mode?', a: 'Activate incident command, lock priority corridors for emergency vehicles, and assign one lead officer per critical zone.' },
  { q: 'How to reduce traffic quickly?', a: 'Apply adaptive signal timing, reroute heavy vehicles, publish diversion alerts, and prioritize transit lanes in peak corridors.' },
  { q: 'How to improve air quality today?', a: 'Restrict high-emission corridors temporarily, increase public transit frequency, and issue health advisories for sensitive groups.' },
  { q: 'What drives energy overload?', a: 'Energy overload often comes from synchronized peak demand windows and localized distribution stress in dense zones.' },
  { q: 'How to prevent water pressure collapse?', a: 'Detect pressure drops early, isolate leaks quickly, and rebalance valves toward affected low-pressure zones.' },
  { q: 'How to handle waste overflow?', a: 'Trigger emergency collection routes, prioritize bins above 85% fill, and reassign trucks from low-load zones.' },
  { q: 'How to improve transport crowding?', a: 'Increase short-interval services in peak windows and dispatch feeder buses at overloaded hubs.' },
  { q: 'What should mayor know first?', a: 'Top risks, affected zones, immediate response actions in progress, and next 2-hour forecast should be communicated first.' },
  { q: 'Generate mayor briefing', a: 'City status is elevated with critical pressure in key modules. Response teams are active in hotspot zones. Next priorities are congestion relief, air-risk mitigation, and water stabilization.' },
  { q: 'Which zone is safest now?', a: 'Safest zone is the one with consistently low severities across all modules and no active critical alerts.' },
  { q: 'Which zone is riskiest now?', a: 'Riskiest zone is where multiple modules are high/critical simultaneously and incidents remain unresolved.' },
  { q: 'How often do metrics update?', a: 'Realtime metrics refresh continuously via subscriptions, while simulation updates are usually triggered in regular intervals.' },
  { q: 'Do alerts update live?', a: 'Yes. Alerts stream in real time from Supabase subscriptions and appear immediately in feeds and tables.' },
  { q: 'How to close an alert?', a: 'Use Mark Resolved in the Alerts or Emergency view to set is_active=false and record resolved timestamp.' },
  { q: 'What is congestion threshold critical?', a: 'Traffic is critical at 80%+ congestion in the current severity model.' },
  { q: 'What is energy threshold critical?', a: 'Energy is critical at 450+ in the current demand index model.' },
  { q: 'What is air threshold critical?', a: 'Air is critical at AQI-like severity index 150+ in the configured model.' },
  { q: 'What is water threshold critical?', a: 'Water is critical when pressure is 25 or below, because lower pressure is worse.' },
  { q: 'What is waste threshold critical?', a: 'Waste becomes critical at 85%+ fill level due to overflow risk.' },
  { q: 'What is transport threshold critical?', a: 'Transport crowding is critical at 75%+ occupancy stress in the module model.' },
  { q: 'How to lower critical count?', a: 'Stabilize the highest-impact zones first, then resolve incident bottlenecks to reduce cascading cross-module failures.' },
  { q: 'What does disaster simulation do?', a: 'It pushes all modules to critical values and inserts a burst of critical alerts for live operations testing.' },
  { q: 'How to reset after simulation?', a: 'Resolve active disaster alerts, restore baseline metrics, and disable disaster mode indicator in the UI state.' },
  { q: 'How to prioritize incidents?', a: 'Sort by severity, population impact, service dependency, and time since alert creation.' },
  { q: 'How to protect hospitals during surge?', a: 'Clear emergency routes, divert non-critical load to nearby facilities, and prioritize utility stability around hospitals.' },
  { q: 'What is best communication to citizens?', a: 'Give concise zone-specific guidance: avoid routes, mask advisory, transit alternatives, and expected recovery window.' },
  { q: 'How to compare north vs south?', a: 'Compare module averages, alert counts, and trend direction over recent time windows to identify operational gap.' },
  { q: 'How to predict tonight energy demand?', a: 'Use historical peak profiles with current baseline; expect higher load during evening 6-10 PM window.' },
  { q: 'How to reduce flood risk quickly?', a: 'Prioritize drainage clearance, deploy pumps in low-lying sectors, and pre-position emergency units near risk clusters.' },
  { q: 'How to improve response time?', a: 'Pre-position units by hotspot probability, reduce dispatch approval layers, and reserve green corridors.' },
  { q: 'What KPIs should I present to judges?', a: 'City Score trend, critical alert response time, zone-level recovery rate, and real-time map severity shifts.' },
  { q: 'What makes this platform unique?', a: 'Unified city operations view with live severity intelligence, AI policy guidance, and instant disaster simulation.' },
  { q: 'How does AI use city context?', a: 'The assistant receives current metrics snapshot and uses it to tailor operational recommendations.' },
  { q: 'Can this run without paid APIs?', a: 'Yes. Core stack uses free tiers: Supabase, Open-Meteo, OpenAQ basic calls, Leaflet/OpenStreetMap, optional Groq free tier.' },
  { q: 'Is this production ready for hackathon demo?', a: 'Yes for demo-grade deployment if env variables, DB schema, and realtime functions are configured correctly.' },
  { q: 'What if openaq fails?', a: 'Fallback mock AQ values are used so air module remains functional during API downtime or CORS issues.' },
  { q: 'What if groq key missing?', a: 'Local AI FAQ fallback answers are used automatically so chat stays usable offline.' },
  { q: 'Give top 3 actions now', a: '1) Stabilize critical traffic and emergency corridors, 2) isolate water/energy hotspots, 3) push public advisories with zone-specific guidance.' },
  { q: 'How to explain city score to non-tech judges?', a: 'It is a health meter for city operations: green means stable, yellow means caution, red means urgent action required.' },
  { q: 'How to avoid false panic in alerts?', a: 'Use severity gating, deduplicate repeated events, and include confidence/context in alert messages.' },
  { q: 'What data is simulated here?', a: 'Traffic, energy, water, air, waste, and transport module metrics are simulated and streamed in real time.' },
  { q: 'What is command center purpose?', a: 'Command Center gives a one-screen operational overview of score, map, alerts, and module status.' },
  { q: 'What should be in daily ops report?', a: 'Include city score trend, top incidents, resolved alerts, worst zones, and next-shift recommendations.' },
  { q: 'How to scale citypulse later?', a: 'Add real IoT ingestion pipelines, predictive models, role-based access, and zone-level automation workflows.' },
  { q: 'Can I use this for other cities?', a: 'Yes. Replace zone metadata, baseline thresholds, and data connectors for the target city.' },
]

const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()

export function getFaqAnswer(question) {
  const input = normalize(question)
  const exact = AI_FAQ.find((item) => normalize(item.q) === input)
  if (exact) return exact.a

  const scored = AI_FAQ.map((item) => {
    const tokens = normalize(item.q).split(/\s+/)
    const score = tokens.reduce((acc, token) => (input.includes(token) ? acc + 1 : acc), 0)
    return { ...item, score }
  }).sort((a, b) => b.score - a.score)

  if (scored[0]?.score >= 2) return scored[0].a
  return 'I can answer CityPulse operations questions using built-in playbooks. Ask about traffic, AQI, energy, water, waste, transport, emergency response, city score, or mayor briefing.'
}
