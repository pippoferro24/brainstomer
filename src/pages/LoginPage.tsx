import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

type Mode = 'signin' | 'signup' | 'magic'

export function LoginPage() {
  const { signIn, signUp, signInWithMagicLink } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        await signUp(email, password, displayName || email.split('@')[0])
        setInfo('Registrazione completata! Controlla la mail se è richiesta la conferma, poi accedi.')
        setMode('signin')
      } else if (mode === 'magic') {
        await signInWithMagicLink(email)
        setInfo('Ti abbiamo inviato un link magico via email. Aprilo per entrare.')
      } else {
        await signIn(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-4xl">🧠</div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Brainstomer</h1>
          <p className="text-sm text-slate-500">
            Brainstorming condiviso: proponi idee, vota, costruisci insieme.
          </p>
        </div>

        <div className="card">
          <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {(
              [
                ['signin', 'Accedi'],
                ['signup', 'Registrati'],
                ['magic', 'Link magico'],
              ] as [Mode, string][]
            ).map(([m, label]) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m)
                  setError(null)
                  setInfo(null)
                }}
                className={`flex-1 rounded-md py-1.5 transition ${
                  mode === m ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <input
                className="input"
                placeholder="Nome visualizzato"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            )}
            <input
              className="input"
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {mode !== 'magic' && (
              <input
                className="input"
                type="password"
                required
                minLength={6}
                placeholder="Password (min 6 caratteri)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {info}
              </p>
            )}

            <button className="btn-primary w-full" disabled={busy}>
              {busy
                ? 'Attendere…'
                : mode === 'signup'
                  ? 'Crea account'
                  : mode === 'magic'
                    ? 'Inviami il link'
                    : 'Accedi'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
