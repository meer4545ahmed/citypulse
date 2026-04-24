import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useCityStore } from '../store/cityStore'
import SeverityPill from '../components/shared/SeverityPill'
import { supabase } from '../lib/supabase'

export default function Alerts() {
  const alerts = useCityStore((s) => s.alerts)
  const addAlert = useCityStore((s) => s.addAlert)
  const updateAlert = useCityStore((s) => s.updateAlert)
  const currentUser = useCityStore((s) => s.currentUser)
  const [form, setForm] = useState({
    category: 'transport',
    severity: 'high',
    zone: 'central',
    title: '',
    description: '',
  })
  const [isGovMode, setIsGovMode] = useState(false)
  const [info, setInfo] = useState('')
  const anonId = currentUser?.id ? `anon-${currentUser.id.slice(0, 8)}` : 'anon-guest'
  const isGuest = !currentUser?.id

  const signInWithGoogle = () => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })

  const postAlert = async () => {
    if (isGuest) { setInfo('Please sign in to post an alert.'); return }
    if (!form.title.trim() || !form.description.trim()) return
    const payload = {
      alert_type: form.category,
      zone_id: form.zone,
      title: form.title,
      message: form.description,
      severity: form.severity,
      is_active: true,
      metadata: {
        thanks: 0,
        no_thanks: 0,
        status: 'pending',
        category: form.category,
        reporterAnonId: anonId,
        reporterUserId: currentUser?.id || null,
      },
    }
    const localId = `local-${Date.now()}`
    addAlert({ ...payload, id: localId, created_at: new Date().toISOString() })
    let inserted = false
    const withMetadata = await supabase.from('alerts').insert(payload).select().single()
    if (!withMetadata.error && withMetadata.data) {
      updateAlert({ ...withMetadata.data, id: localId })
      inserted = true
    }
    if (!inserted) {
      const fallback = await supabase
        .from('alerts')
        .insert({
          alert_type: form.category,
          zone_id: form.zone,
          title: form.title,
          message: form.description,
          severity: form.severity,
          is_active: true,
        })
        .select()
        .single()
      if (!fallback.error && fallback.data) {
        updateAlert({ ...fallback.data, metadata: payload.metadata, id: localId })
        inserted = true
      }
    }
    setInfo(inserted ? `Alert posted by ${anonId}.` : 'Posted locally. Check DB schema migration for server save.')
    setForm((s) => ({ ...s, title: '', description: '' }))
  }

  const vote = async (alert, key) => {
    if (isGuest) { setInfo('Please sign in to vote.'); return }
    const current = alert.metadata || {}
    const next = { ...current, [key]: (current[key] || 0) + 1 }
    updateAlert({ ...alert, metadata: next })
    const { error } = await supabase.from('alerts').update({ metadata: next }).eq('id', alert.id)
    if (error) setInfo('Vote saved locally. Run alerts metadata migration for server persistence.')
  }

  const resolve = async (alert) => {
    updateAlert({ ...alert, is_active: false, metadata: { ...(alert.metadata || {}), status: 'resolved' } })
    await supabase
      .from('alerts')
      .update({
        is_active: false,
        resolved_at: new Date().toISOString(),
        metadata: { ...(alert.metadata || {}), status: 'resolved' },
      })
      .eq('id', alert.id)
  }

  const deleteOwnAlert = async (alert) => {
    updateAlert({ ...alert, is_active: false, metadata: { ...(alert.metadata || {}), status: 'deleted' } })
    const { error } = await supabase.from('alerts').delete().eq('id', alert.id)
    if (error) {
      await supabase.from('alerts').update({ is_active: false }).eq('id', alert.id)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Citizen Alerts Hub</h2>
      {isGuest ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-amber-300/[0.06] px-4 py-3 text-xs text-amber-100">
          <span>You are browsing as a <strong>guest</strong>. Sign in with Google to post alerts and vote.</span>
          <button onClick={signInWithGoogle} className="rounded-lg border border-amber-300/50 bg-amber-300/20 px-3 py-1 font-semibold text-amber-50 hover:bg-amber-300/30">Sign in</button>
        </div>
      ) : (
        <p className="text-xs text-cyan-300">Posting as {anonId}</p>
      )}
      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <p className="mb-3 text-sm uppercase tracking-wide text-gray-400">Report Critical Alert</p>
        <div className="grid gap-3 md:grid-cols-4">
          <select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm">
            <option value="transport">Transport</option>
            <option value="air-quality">Air Quality</option>
            <option value="energy">Energy</option>
            <option value="water">Water</option>
            <option value="waste">Waste</option>
          </select>
          <select value={form.severity} onChange={(e) => setForm((s) => ({ ...s, severity: e.target.value }))} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm">
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <input value={form.zone} onChange={(e) => setForm((s) => ({ ...s, zone: e.target.value }))} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm" placeholder="Zone (e.g. central)" />
          <label className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm">
            <input type="checkbox" checked={isGovMode} onChange={(e) => setIsGovMode(e.target.checked)} />
            Government Mode
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <input value={form.title} onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm md:col-span-2" placeholder="Alert title" />
          <input value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm md:col-span-2" placeholder="Describe issue..." />
          <button onClick={postAlert} disabled={isGuest} title={isGuest ? "Sign in to post" : ""} className={"rounded-lg px-4 py-2 text-sm font-semibold " + (isGuest ? "bg-gray-600 text-gray-300 cursor-not-allowed opacity-60" : "bg-blue-600 text-white")}>Post Alert</button>
        </div>
        {info ? <p className="mt-2 text-xs text-cyan-300">{info}</p> : null}
      </div>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const metadata = alert.metadata || {}
          const status = metadata.status || (alert.is_active ? 'pending' : 'resolved')
          return (
            <div key={alert.id} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{alert.title}</p>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${status === 'resolved' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                    {status}
                  </span>
                  <SeverityPill severity={alert.severity} />
                </div>
              </div>
              <p className="text-sm text-gray-400">{alert.message}</p>
              <p className="mt-1 text-xs text-gray-500">{formatDistanceToNow(new Date(alert.created_at || Date.now()))} ago</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={() => vote(alert, 'thanks')} className="rounded-lg border border-green-700 bg-green-900/30 px-3 py-1 text-xs text-green-300">
                  Thanks ({metadata.thanks || 0})
                </button>
                <button onClick={() => vote(alert, 'no_thanks')} className="rounded-lg border border-red-700 bg-red-900/30 px-3 py-1 text-xs text-red-300">
                  No Thanks ({metadata.no_thanks || 0})
                </button>
                {currentUser?.id && metadata.reporterUserId === currentUser.id ? (
                  <button onClick={() => deleteOwnAlert(alert)} className="rounded-lg border border-gray-500 px-3 py-1 text-xs text-gray-200">
                    Delete My Report
                  </button>
                ) : null}
                {isGovMode && alert.is_active ? (
                  <button onClick={() => resolve(alert)} className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white">
                    Mark Resolved
                  </button>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
