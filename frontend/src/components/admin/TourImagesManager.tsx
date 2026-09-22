import { ImagePlus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { Button } from '@/components/ui/button'
import { addTourImages, removeTourImage } from '@/services/admin'
import type { TourImage } from '@/types/tour'
import { getApiErrorMessage } from '@/utils/errors'

export function TourImagesManager({
  tourId,
  images,
  onChanged,
}: {
  tourId: string
  images: TourImage[]
  onChanged: () => void
}) {
  const [urls, setUrls] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    const list = urls
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
    if (list.length === 0) return
    if (list.some((u) => !/^https?:\/\/\S+$/.test(u))) return setError('Mỗi dòng phải là một đường dẫn ảnh hợp lệ (http/https)')

    setError(null)
    setBusy(true)
    try {
      await addTourImages(tourId, list)
      setUrls('')
      onChanged()
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể thêm ảnh')
    } finally {
      setBusy(false)
    }
  }

  async function handleUploaded(uploaded: string[]) {
    setError(null)
    await addTourImages(tourId, uploaded)
    onChanged()
  }

  async function handleRemove(imageId: string) {
    if (!window.confirm('Xoá ảnh này khỏi thư viện tour?')) return
    setError(null)
    setBusy(true)
    try {
      await removeTourImage(tourId, imageId)
      onChanged()
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể xoá ảnh')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-base font-bold text-secondary">Thư viện ảnh</h2>
      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {images.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Chưa có ảnh nào trong thư viện.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <li key={img.id} className="group relative">
              <div
                className="h-24 rounded-lg bg-secondary bg-cover bg-center"
                style={{ backgroundImage: `url(${img.url})` }}
              />
              <button
                type="button"
                aria-label="Xoá ảnh"
                disabled={busy}
                onClick={() => handleRemove(img.id)}
                className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/90 text-danger shadow hover:bg-danger-soft"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <ImageUploadButton multiple label="Tải ảnh từ máy" disabled={busy} onUploaded={handleUploaded} />
      </div>

      <label className="mb-1 mt-4 block text-sm font-medium text-secondary">Hoặc dán URL (mỗi dòng một ảnh)</label>
      <textarea
        value={urls}
        onChange={(e) => setUrls(e.target.value)}
        rows={3}
        placeholder="https://…"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
      />
      <Button type="button" size="sm" className="mt-2" disabled={busy || !urls.trim()} onClick={handleAdd}>
        <ImagePlus /> Thêm ảnh
      </Button>
    </section>
  )
}
