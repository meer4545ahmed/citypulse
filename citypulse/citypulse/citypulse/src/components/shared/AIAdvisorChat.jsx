import { useState } from 'react'
import { askGroq } from '../../lib/groq'
import { supabase } from '../../lib/supabase'
import { useCityStore } from '../../store/cityStore'

const quickPrompts = [
  'Why is east zone critical?',
  'Recommend emergency response actions',
  'What will energy demand be tonight?',
  'Compare all zone severity levels',
]

export default function AIAdvisorChat() {
  const metrics = useCityStore((s) => s.metrics)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const send = async (text) => {
    if (!text.trim()) return
    setLoading(true)
    setMessages((m) => [...m, { role: 'user', content: text }])
    const reply = await askGroq(text, metrics)
    setMessages((m) => [...m, { role: 'assistant', content: reply }])
    setInput('')
    setLoading(false)
    await supabase.from('policy_logs').insert({ query: text, ai_response: reply, context_snapshot: { metrics } })
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button key={prompt} onClick={() => send(prompt)} className="rounded-full bg-gray-700 px-3 py-1 text-xs">
            {prompt}
          </button>
        ))}
      </div>
      <div className="custom-scrollbar mb-3 flex-1 space-y-2 overflow-auto">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <p className={`inline-block rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'}`}>
              {msg.content}
            </p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-600 bg-gray-900 px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask CityPulse AI..."
        />
        <button className="rounded-lg bg-blue-600 px-3 py-2" disabled={loading} onClick={() => send(input)}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
