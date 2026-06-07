# 🧠 Brainstomer

App di **brainstorming condiviso**: gli utenti propongono idee di progetto, votano
quelle altrui, allegano immagini, propongono miglioramenti approvati a maggioranza,
sviluppano un prototipo e seguono lo storico completo di ogni idea.

## Funzionalità

- 🔐 **Login** con email/password o link magico (ogni utente è identificato).
- 💡 **Idee di progetto**: titolo, descrizione, stato (aperta / in sviluppo / realizzata / archiviata).
- ▲▼ **Voto positivo/negativo** sulle idee e sui miglioramenti (un voto per utente, modificabile).
- 🖼 **Immagini** allegate a ogni idea (upload su Supabase Storage).
- 🛠 **Miglioramenti**: chiunque propone modifiche. Vengono **approvate se la maggioranza vota a favore**; in caso di **pareggio decide il proprietario** dell'idea.
- 🕘 **Storico/audit log**: ogni evento (creazione, proposte, approvazioni, prototipo) è tracciato.
- 🚀 **Prototipo**: editor HTML con anteprima live, condiviso e iterabile da tutti.

## Stack

React + Vite + TypeScript + Tailwind sul frontend, **Supabase** (PostgreSQL + Auth +
Storage + Row Level Security) come backend condiviso.

---

## Setup (una volta sola)

### 1. Crea il progetto Supabase
1. Vai su [app.supabase.com](https://app.supabase.com) e crea un progetto gratuito.
2. Apri **SQL Editor → New query**, incolla tutto il contenuto di
   [`supabase/schema.sql`](supabase/schema.sql) e premi **Run**.
   Crea tabelle, policy di sicurezza, lo storage delle immagini e la logica di voto.
3. In **Settings → API** copia `Project URL` e la `anon public` key.

### 2. Configura le variabili d'ambiente
```bash
cp .env.example .env
# poi apri .env e incolla VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

### 3. Installa e avvia
```bash
npm install
npm run dev
```
Apri l'URL che appare (di solito http://localhost:5173).

> Se non hai ancora configurato `.env`, l'app mostra una schermata con le istruzioni.

---

## Come la condivido con altri utenti? (anche senza Claude Code)

**Claude Code serve solo a sviluppare l'app, non a usarla.** Gli utenti finali —
con o senza Claude Code — hanno bisogno solo di **un link**. Per ottenerlo basta
fare il *deploy* del frontend; il backend (Supabase) è già online nel cloud.

### Deploy gratuito su Vercel (consigliato)
1. Crea un repo Git e pusha questa cartella (`git init && git add . && git commit`).
2. Vai su [vercel.com](https://vercel.com) → **Add New Project** → importa il repo.
3. In **Environment Variables** aggiungi `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Ottieni un URL tipo `https://brainstomer.vercel.app`.
5. In Supabase → **Authentication → URL Configuration** aggiungi quell'URL ai
   *Redirect URLs* (serve per il link magico).

Da quel momento **condividi semplicemente il link**: chiunque si registra con la
propria email e collabora in tempo reale. Non serve installare nulla.

> In alternativa funziona identico su **Netlify** o **Cloudflare Pages** (build
> command `npm run build`, output `dist`).

---

## Regola di approvazione dei miglioramenti

| Voti | Esito |
|------|-------|
| favorevoli > contrari | ✅ Approvato |
| contrari > favorevoli | ❌ Respinto |
| **pareggio** | ⏳ Decide il **proprietario** dell'idea (bottone Approva/Respingi) |

La logica è applicata lato database (trigger in `schema.sql`), quindi è sicura e
coerente anche con più utenti che votano contemporaneamente.

## Struttura del progetto
```
supabase/schema.sql        → schema DB, sicurezza, trigger di voto
src/lib/                   → client Supabase, tipi, data layer (api.ts)
src/contexts/AuthContext   → autenticazione
src/pages/                 → Login, Board (lista idee), Idea (dettaglio)
src/components/tabs/       → Descrizione, Immagini, Miglioramenti, Prototipo, Storico
```
