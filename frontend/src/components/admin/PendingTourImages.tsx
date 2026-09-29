import { ImagePlus, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Quản lý ảnh cho tour CHƯA tồn tại (chưa có id) — chỉ giữ trong state, gắn
// vào tour thật ngay sau khi tạo xong (xem handleSubmit trong AdminTourForm).
export function PendingTourImages({
  urls,
  thumbnailUrl,
  onAdd,
  onRemove,
  onSetThumbnail,
}: {
  urls: string[]
  thumbnailUrl: string
  onAdd: (urls: string[]) => void
  onRemove: (url: string) => void
  onSetThumbnail: (url: string) => void
}) {
  const [pasteText, setPasteText] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleAddPasted() {
    const list = pasteText
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
    if (list.length === 0) return
    if (list.some((u) => !/^https?:\/\/\S+$/.test(u))) return setError('Mỗi dòng phải là một đường dẫn ảnh hợp lệ (http/https)')

    setError(null)
    onAdd(list)
    setPasteText('')
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="font-display text-base font-bold text-ink">Thư viện ảnh</h2>
      <p className="mt-1 text-xs text-text-muted">
        Ảnh sẽ được gắn vào tour ngay khi bạn bấm "Tạo tour" bên trên.
      </p>
      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {urls.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Chưa có ảnh nào.</p>
      ) : (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {urls.map((url) => {
            const isThumbnail = url === thumbnailUrl
            return (
              <li key={url} className="group relative">
                <div
                  className={cn(
                    'h-24 rounded-lg bg-secondary bg-cover bg-center ring-2 ring-offset-2 ring-offset-surface',
                    isThumbnail ? 'ring-primary' : 'ring-transparent',
                  )}
                  style={{ backgroundImage: `url(${url})` }}
                />
                <button
                  type="button"
                  aria-label="Xoá ảnh"
                  onClick={() => onRemove(url)}
                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-white/90 text-danger shadow hover:bg-danger-soft"
                >
                  <Trash2 className="size-3.5" />
                </button>
                {isThumbnail ? (
                  <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    <Star className="size-3 fill-white" /> Đại diện
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetThumbnail(url)}
                    className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-secondary shadow transition-colors hover:bg-primary hover:text-white"
                  >
                    <Star className="size-3" /> Đặt đại diện
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-4">
        <ImageUploadButton multiple label="Tải ảnh từ máy" onUploaded={onAdd} />
      </div>

      <label className="mb-1 mt-4 block text-sm font-medium text-ink">Hoặc dán URL (mỗi dòng một ảnh)</label>
      <textarea
        value={pasteText}
        onChange={(e) => setPasteText(e.target.value)}
        rows={3}
        placeholder="https://…"
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
      />
      <Button type="button" size="sm" className="mt-2" disabled={!pasteText.trim()} onClick={handleAddPasted}>
        <ImagePlus /> Thêm ảnh
      </Button>
    </section>
  )
}
