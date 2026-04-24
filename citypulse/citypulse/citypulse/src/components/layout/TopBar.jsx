import { useEffect, useState } from 'react'
import { Bell, Search, MapPin, Activity } from 'lucide-react'
import { useCityStore } from '../../store/cityStore'
import { supabase } from '../../lib/supabase'
import { searchPlaces } from '../../lib/location'

export default function TopBar() {
  const cityScore = useCityStore((s) => s.cityScore)
  const alerts = useCityStore((s) => s.alerts)
  const selectedLocation = useCityStore((s) => s.selectedLocation)
  const setDisasterMode = useCityStore((s) => s.setDisasterMode)
  const setSelectedLocation = useCityStore((s) => s.setSelectedLocation)
  const currentUser = useCityStore((s) => s.currentUser)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const triggerDisaster = async () => {
    await supabase.functions.invoke('simulate-disaster')
    setDisasterMode(true)
  }

  const onSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const places = await searchPlaces(search)
      if (places[0]) setSelectedLocation(places[0])
    } finally {
      setLoading(false)
    }
  }

  const scoreColor =
    cityScore >= 80 ? 'text-emerald-300' : cityScore >= 60 ? 'text-cyan-300' : cityScore >= 40 ? 'text-amber-300' : 'text-rose-400'

  return (
    <header className="cp-topbar flex h-16 items-center justify-between px-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300 drop-shadow-[0_0_6px_rgba(96,214,255,0.7)]" />
          <p className="text-sm font-semibold tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            SMART CITY INTELLIGENCE
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-cyan-300/15 bg-white/[0.03] px-3 py-1 text-xs text-gray-300 md:flex">
          <MapPin className="h-3 w-3 text-cyan-300" />
          <span className="tracking-wide">{selectedLocation.name.split(',')[0]}</span>
        </div>
        <div className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-200/50 md:block">
          {now.toISOString().split('T')[1].slice(0, 8)} UTC
        </div>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <div className="group relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            placeholder="Search city or place worldwide…"
            className="w-80 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white placeholder:text-gray-500 outline-none transition-all duration-300 focus:w-96 focus:border-cyan-400/60 focus:bg-white/[0.06] focus:shadow-[0_0_24px_rgba(96,214,255,0.25)]"
          />
          <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition group-focus-within:opacity-100" />
        </div>
        <button
          className="cp-btn rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 px-3 py-2 text-xs font-semibold text-gray-950"
          onClick={onSearch}
          aria-label="Search"
        >
          {loading ? '…' : <Search className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 md:flex">
          <span className="text-[10px] uppercase tracking-[0.25em] text-gray-400">City Health</span>
          <span className={`font-mono text-base font-bold ${scoreColor} drop-shadow-[0_0_8px_currentColor]`}>
            {cityScore}
          </span>
        </div>

        {currentUser?.email ? (
          <button
            className="cp-btn rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-gray-200 hover:border-white/20"
            onClick={() => supabase.auth.signOut()}
          >
            Logout · {currentUser.email.split('@')[0]}
          </button>
        ) : (
          <button
            className="cp-btn rounded-lg border border-cyan-300/40 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 px-3 py-2 text-xs font-semibold text-cyan-100 hover:border-cyan-300/70"
            onClick={() =>
              supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin },
              })
            }
          >
            Sign in
          </button>
        )}

        <button
          className="cp-btn rounded-lg bg-gradient-to-br from-rose-500 to-red-600 px-3 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_24px_rgba(244,63,94,0.35)]"
          onClick={triggerDisaster}
        >
          🚨 Simulate Disaster
        </button>

        <div className="relative flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-sm text-gray-200">
          <Bell className="h-4 w-4 text-cyan-300" />
          <span className="font-mono text-xs">{alerts.length}</span>
          {alerts.length > 0 && (
            <span className="absolute -right-1 -top-1 cp-pulse-dot" style={{ background: '#f43f5e' }} />
          )}
        </div>
      </div>
    </header>
  )
}
