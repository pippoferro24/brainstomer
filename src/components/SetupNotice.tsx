export function SetupNotice() {
  return (
    <div className="mx-auto mt-16 max-w-2xl">
      <div className="card border-l-4 border-amber-400">
        <h1 className="mb-2 text-xl font-bold text-slate-900">
          ⚙️ Configurazione Supabase mancante
        </h1>
        <p className="mb-4 text-sm text-slate-600">
          L'app ha bisogno di un backend Supabase per condividere i dati tra gli
          utenti. Segui questi passi:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Crea un progetto gratuito su{' '}
            <a className="text-brand-600 underline" href="https://app.supabase.com">
              app.supabase.com
            </a>
            .
          </li>
          <li>
            Nel <strong>SQL Editor</strong> incolla ed esegui il contenuto di{' '}
            <code className="rounded bg-slate-100 px-1">supabase/schema.sql</code>.
          </li>
          <li>
            In <strong>Settings → API</strong> copia <code>Project URL</code> e{' '}
            <code>anon public key</code>.
          </li>
          <li>
            Crea un file <code className="rounded bg-slate-100 px-1">.env</code> (vedi{' '}
            <code>.env.example</code>) con:
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {`VITE_SUPABASE_URL=...\nVITE_SUPABASE_ANON_KEY=...`}
            </pre>
          </li>
          <li>Riavvia il server di sviluppo (<code>npm run dev</code>).</li>
        </ol>
      </div>
    </div>
  )
}
