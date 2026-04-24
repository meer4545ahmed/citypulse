import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function AuthSplash({ hasSession = false, onFinish = () => {} }) {
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowLogin(true), 6000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (hasSession && showLogin) {
      const timer = setTimeout(() => onFinish(), 1200)
      return () => clearTimeout(timer)
    }
  }, [hasSession, onFinish, showLogin])

  const loginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.22),transparent_45%),radial-gradient(circle_at_80%_75%,rgba(59,130,246,0.2),transparent_45%),linear-gradient(180deg,#020617,#0b1120)]" />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(148,163,184,0.45)_0.5px,transparent_0.5px)] [background-size:10px_10px]" />
      <div className="absolute -left-16 top-20 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl animate-float-soft" />
      <div className="absolute -right-16 bottom-24 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl animate-float-soft [animation-delay:1.2s]" />

      {!showLogin ? (
        <div className="relative flex flex-col items-center justify-center animate-intro-fade">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Planetary Network Online</p>
          <h1 className="mt-3 bg-gradient-to-r from-cyan-200 via-blue-300 to-cyan-100 bg-clip-text text-6xl font-black tracking-tight text-transparent">
            CITYPULSE
          </h1>
          <p className="mt-2 text-sm text-gray-200">Global Urban Intelligence Platform</p>
          <button
            onClick={() => {
              if (hasSession) onFinish()
              else setShowLogin(true)
            }}
            className="mt-7 rounded-full border border-cyan-400/60 bg-black/40 px-4 py-2 text-xs text-cyan-100"
          >
            Skip intro
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-xl rounded-2xl border border-cyan-400/30 bg-gray-950/70 p-8 backdrop-blur animate-intro-rise">
          <p className="text-xs uppercase tracking-[0.25em] text-blue-300">CityPulse</p>
          <h1 className="mt-2 text-4xl font-black">Smart City Intelligence</h1>
          <p className="mt-3 text-gray-300">
            Sign in to report civic alerts, vote on incidents, and collaborate with city operations.
          </p>
          {hasSession ? (
            <button
              onClick={onFinish}
              className="mt-6 w-full rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-gray-900 transition hover:scale-[1.01]"
            >
              Enter Dashboard
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="mt-6 w-full rounded-xl bg-white px-5 py-3 font-semibold text-gray-900 transition hover:scale-[1.01]"
            >
              Continue with Google
            </button>
          )}
        </div>
      )}
      {showLogin ? null : (
        <button
          onClick={() => {
            if (hasSession) onFinish()
            else loginWithGoogle()
          }}
          className="absolute bottom-8 rounded-full border border-cyan-400/60 bg-black/50 px-5 py-2 text-sm text-cyan-100"
        >
          {hasSession ? 'Enter CityPulse' : 'Enter with Google'}
        </button>
      )}
    </div>
  )
}
