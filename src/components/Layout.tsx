import { Link, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function Layout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Brainstomer
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {profile && (
              <span className="hidden text-slate-500 sm:inline">
                Ciao, <strong className="text-slate-700">{profile.display_name}</strong>
              </span>
            )}
            <button
              className="btn-ghost"
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
            >
              Esci
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  )
}
