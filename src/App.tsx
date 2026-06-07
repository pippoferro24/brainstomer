import { Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from './lib/supabase'
import { useAuth } from './contexts/AuthContext'
import { SetupNotice } from './components/SetupNotice'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { BoardPage } from './pages/BoardPage'
import { IdeaPage } from './pages/IdeaPage'

export default function App() {
  const { session, loading } = useAuth()

  if (!isSupabaseConfigured) return <SetupNotice />

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Caricamento…
      </div>
    )
  }

  if (!session) return <LoginPage />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<BoardPage />} />
        <Route path="/idea/:id" element={<IdeaPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}
