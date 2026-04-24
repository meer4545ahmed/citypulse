import { RouterProvider } from 'react-router-dom'
import { useEffect, useState } from 'react'
import router from './router'
import { useRealtimeMetrics } from './hooks/useRealtimeMetrics'
import { useWeather } from './hooks/useWeather'
import { useAirQuality } from './hooks/useAirQuality'
import { useCityScore } from './hooks/useCityScore'
import { supabase } from './lib/supabase'
import SplashScreen from './components/shared/SplashScreen'
import { useCityStore } from './store/cityStore'

function AppShell() {
  useRealtimeMetrics()
  useWeather()
  useAirQuality()
  useCityScore()
  return <RouterProvider router={router} />
}

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [introDone, setIntroDone] = useState(false)
  const setCurrentUser = useCityStore((s) => s.setCurrentUser)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session || null)
      setCurrentUser(data.session?.user || null)
      setChecking(false)
    })
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null)
      setCurrentUser(nextSession?.user || null)
    })
    return () => {
      mounted = false
      authSub.subscription.unsubscribe()
    }
  }, [setCurrentUser])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-400/30 border-t-cyan-400" />
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/70">Connecting…</p>
        </div>
      </div>
    )
  }
  if (!introDone) return <SplashScreen hasSession={!!session} onFinish={() => setIntroDone(true)} />
  return <AppShell />
}
