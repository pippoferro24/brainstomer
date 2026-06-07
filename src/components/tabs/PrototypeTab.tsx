import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { fetchPrototype, savePrototype } from '../../lib/api'
import type { Idea } from '../../lib/types'

const STARTER = `<!-- Scrivi qui l'HTML del prototipo. L'anteprima si aggiorna in tempo reale. -->
<div style="font-family: system-ui; padding: 2rem; text-align:center">
  <h1>🚀 Il mio prototipo</h1>
  <p>Modifica questo codice per costruire una bozza dell'app.</p>
  <button onclick="alert('Funziona!')">Provami</button>
</div>`

export function PrototypeTab({ idea }: { idea: Idea }) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    fetchPrototype(idea.id).then((p) => {
      setContent(p?.content || STARTER)
      setSavedAt(p?.updated_at ?? null)
      setLoading(false)
    })
  }, [idea.id])

  // Anteprima live (debounce leggero).
  useEffect(() => {
    const t = setTimeout(() => {
      const doc = iframeRef.current?.contentDocument
      if (doc) {
        doc.open()
        doc.write(content)
        doc.close()
      }
    }, 300)
    return () => clearTimeout(t)
  }, [content])

  async function save() {
    if (!user) return
    setBusy(true)
    try {
      await savePrototype(idea.id, user.id, content)
      setSavedAt(new Date().toISOString())
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <p className="text-slate-400">Caricamento…</p>

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Sviluppa qui un prototipo HTML dell'app. È condiviso: chiunque può iterarlo.
        </p>
        <button className="btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Salvataggio…' : '💾 Salva prototipo'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <textarea
          className="input min-h-[420px] font-mono text-xs leading-relaxed"
          spellCheck={false}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="overflow-hidden rounded-lg ring-1 ring-slate-200">
          <iframe
            ref={iframeRef}
            title="Anteprima prototipo"
            sandbox="allow-scripts allow-modals"
            className="h-[420px] w-full bg-white"
          />
        </div>
      </div>
      {savedAt && (
        <p className="text-xs text-slate-400">
          Ultimo salvataggio: {new Date(savedAt).toLocaleString('it-IT')}
        </p>
      )}
    </div>
  )
}
