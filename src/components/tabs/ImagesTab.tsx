import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { deleteImage, fetchImages, uploadImage } from '../../lib/api'
import type { Idea, IdeaImage } from '../../lib/types'

export function ImagesTab({ idea }: { idea: Idea }) {
  const { user } = useAuth()
  const [images, setImages] = useState<IdeaImage[]>([])
  const [loading, setLoading] = useState(true)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      setImages(await fetchImages(idea.id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.id])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !file) return
    setBusy(true)
    setError(null)
    try {
      await uploadImage(idea.id, user.id, file, caption.trim())
      setCaption('')
      setFile(null)
      ;(document.getElementById('file-input') as HTMLInputElement | null)?.value &&
        ((document.getElementById('file-input') as HTMLInputElement).value = '')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore nell'upload")
    } finally {
      setBusy(false)
    }
  }

  async function remove(img: IdeaImage) {
    if (!confirm("Eliminare questa immagine?")) return
    await deleteImage(img)
    await load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleUpload} className="rounded-xl bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            id="file-input"
            type="file"
            accept="image/*"
            className="text-sm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <input
            className="input flex-1"
            placeholder="Didascalia (facoltativa)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button className="btn-primary" disabled={busy || !file}>
            {busy ? 'Caricamento…' : 'Allega'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </form>

      {loading ? (
        <p className="text-slate-400">Caricamento…</p>
      ) : images.length === 0 ? (
        <p className="italic text-slate-400">Nessuna immagine allegata.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {images.map((img) => (
            <figure key={img.id} className="group relative overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img
                src={img.url}
                alt={img.caption}
                className="aspect-video w-full object-cover"
              />
              {img.caption && (
                <figcaption className="px-2 py-1 text-xs text-slate-600">
                  {img.caption}
                </figcaption>
              )}
              {(user?.id === img.uploaded_by || user?.id === idea.owner_id) && (
                <button
                  onClick={() => remove(img)}
                  className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-semibold text-rose-700 opacity-0 transition group-hover:opacity-100"
                >
                  Elimina
                </button>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
