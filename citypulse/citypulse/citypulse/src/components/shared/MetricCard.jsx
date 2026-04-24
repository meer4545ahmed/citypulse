import SeverityPill from './SeverityPill'

export default function MetricCard({ title, value, unit, severity = 'low', icon: Icon, subtitle }) {
  const accent = {
    low: { bar: 'from-emerald-400 to-cyan-400', glow: 'rgba(52,211,153,0.35)' },
    medium: { bar: 'from-amber-300 to-yellow-400', glow: 'rgba(251,191,36,0.35)' },
    high: { bar: 'from-orange-400 to-rose-400', glow: 'rgba(251,146,60,0.35)' },
    critical: { bar: 'from-rose-500 to-red-600', glow: 'rgba(244,63,94,0.5)' },
  }[severity]

  return (
    <div
      className={`cp-card group relative overflow-hidden p-5 ${severity === 'critical' ? 'animate-pulse' : ''}`}
      style={{ '--cp-glow': accent.glow }}
    >
      {/* Left accent bar */}
      <span className={`absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b ${accent.bar} shadow-[0_0_18px_var(--cp-glow)]`} />
      {/* Subtle ambient glow on hover */}
      <span className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-cyan-400/10 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">{title}</p>
        {Icon ? (
          <Icon className="h-4 w-4 text-cyan-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6" />
        ) : null}
      </div>
      <p className="font-mono text-3xl font-bold text-white tracking-tight">
        {value}
        {unit ? <span className="ml-1 text-base font-medium text-gray-400">{unit}</span> : null}
      </p>
      <div className="mt-3 flex items-center justify-between">
        <SeverityPill severity={severity} />
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{subtitle}</p>
      </div>
    </div>
  )
}
