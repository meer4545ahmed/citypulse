import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Map as MapIcon,
  Car,
  Wind,
  Zap,
  Droplets,
  Trash2,
  Bus,
  Bot,
  Brain,
  Beaker,
  Bell,
} from 'lucide-react'

const nav = [
  ['/', 'Command Center', LayoutDashboard],
  ['/live-map', 'Live Map', MapIcon],
  ['/traffic', 'Traffic', Car],
  ['/air-quality', 'Air Quality', Wind],
  ['/energy', 'Energy', Zap],
  ['/water', 'Water', Droplets],
  ['/waste', 'Waste', Trash2],
  ['/transport', 'Transport', Bus],
  ['/ai-advisor', 'AI Advisor', Bot],
  ['/ml-insights', 'ML Insights', Brain],
  ['/scenarios', 'Scenarios', Beaker],
  ['/alerts', 'Alerts', Bell],
]

export default function Sidebar() {
  return (
    <aside className="relative w-60 border-r border-cyan-300/10 bg-gradient-to-b from-[#070b16] via-[#06090f] to-[#04060c] p-4">
      {/* subtle accent line */}
      <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent" />

      <div className="mb-6 flex items-center gap-2 px-1">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_24px_rgba(96,214,255,0.45)]">
          <span className="absolute inset-0 rounded-lg bg-cyan-300/30 blur-md" />
          <span className="relative text-sm font-black text-gray-950">CP</span>
        </div>
        <div>
          <h1 className="cp-shimmer-text text-lg font-extrabold tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            CITYPULSE
          </h1>
          <p className="text-[9px] uppercase tracking-[0.3em] text-cyan-200/60">v4.20 · LIVE</p>
        </div>
      </div>

      <nav className="cp-stagger space-y-1">
        {nav.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-300 ${
                isActive
                  ? 'cp-nav-active text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.03]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-cyan-300 to-violet-400 transition-all duration-300 ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                  }`}
                />
                <Icon
                  className={`h-4 w-4 transition-all duration-300 ${
                    isActive
                      ? 'text-cyan-300 drop-shadow-[0_0_8px_rgba(96,214,255,0.7)]'
                      : 'text-gray-500 group-hover:text-cyan-200 group-hover:scale-110'
                  }`}
                />
                <span className="font-medium tracking-wide">{label}</span>
                {isActive && (
                  <span className="ml-auto cp-pulse-dot" style={{ width: 6, height: 6 }} />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="cp-divider mb-3" />
        <div className="flex items-center justify-between rounded-lg border border-cyan-300/10 bg-white/[0.02] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="cp-pulse-dot" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Network OK</span>
          </div>
          <span className="font-mono text-[10px] text-cyan-300/70">12.8K</span>
        </div>
      </div>
    </aside>
  )
}
