import { ArrowDown, ArrowLeft, ArrowUp, X } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ImageUploadButton } from '@/components/common/ImageUploadButton'
import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import {
  createCollection,
  getAdminCollection,
  updateCollection,
  type CollectionInput,
} from '@/services/collections'
import { getTours } from '@/services/tours'
import type { CollectionStatus } from '@/types/collection'
import { getApiErrorMessage } from '@/utils/errors'
import { slugify } from '@/utils/slugify'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none'

interface SelectedTour {
  id: string
  title: string
  thumbnailUrl: string
}

export function CollectionAdminForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const { data: tourOptions } = useAsync(() => getTours({ limit: 100 }).then((r) => r.items), [])

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [status, setStatus] = useState<CollectionStatus>('DRAFT')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [selected, setSelected] = useState<SelectedTour[]>([])

  const [loaded, setLoaded] = useState(!isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit) return
    getAdminCollection(id).then((c) => {
      setTitle(c.title)
      setSlug(c.slug)
      setSlugTouched(true)
      setDescription(c.description ?? '')
      setCoverImageUrl(c.coverImageUrl)
      setStatus(c.status)
      setStartAt(c.startAt ? c.startAt.slice(0, 10) : '')
      setEndAt(c.endAt ? c.endAt.slice(0, 10) : '')
      setSelected(c.tours)
      setLoaded(true)
    })
  }, [id, isEdit])

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!slugTouched) setSlug(slugify(value))
  }

  function toggleTour(tourId: string) {
    setSelected((list) => {
      if (list.some((t) => t.id === tourId)) return list.filter((t) => t.id !== tourId)
      const tour = tourOptions?.find((t) => t.id === tourId)
      if (!tour) return list
      return [...list, { id: tour.id, title: tour.title, thumbnailUrl: tour.thumbnailUrl }]
    })
  }

  function moveTour(index: number, direction: -1 | 1) {
    setSelected((list) => {
      const next = [...list]
      const target = index + direction
      if (target < 0 || target >= next.length) return list
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function removeTour(tourId: string) {
    setSelected((list) => list.filter((t) => t.id !== tourId))
  }

  async function submit(statusOverride?: CollectionStatus) {
    setError(null)

    if (title.trim().length < 5) return setError('Tên bộ sưu tập cần tối thiểu 5 ký tự')
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return setError('Slug chỉ gồm chữ thường, số và dấu gạch ngang')
    }
    if (!coverImageUrl.trim()) return setError('Vui lòng chọn ảnh bìa')
    if (startAt && endAt && startAt > endAt) {
      return setError('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc')
    }

    const payload: CollectionInput = {
      title: title.trim(),
      slug,
      description: description.trim() || undefined,
      coverImageUrl,
      status: statusOverride ?? status,
      startAt: startAt ? new Date(`${startAt}T00:00:00`).toISOString() : null,
      endAt: endAt ? new Date(`${endAt}T23:59:59`).toISOString() : null,
      tourIds: selected.map((t) => t.id),
    }

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateCollection(id, payload)
      } else {
        await createCollection(payload)
      }
      navigate(ROUTES.adminCollections)
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể lưu bộ sưu tập')
    } finally {
      setSubmitting(false)
    }
  }

  if (!loaded) {
    return <div className="mx-auto max-w-3xl px-4 py-8 text-sm text-text-muted">Đang tải…</div>
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            to={ROUTES.adminCollections}
            className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-secondary"
          >
            <ArrowLeft className="size-4" /> Bộ sưu tập
          </Link>
          <h1 className="font-display text-2xl font-bold text-secondary">
            {isEdit ? 'Sửa bộ sưu tập' : 'Tạo bộ sưu tập mới'}
          </h1>
        </div>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4 rounded-2xl border border-border bg-surface p-5"
      >
        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Tên bộ sưu tập</label>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Vd: Tour hè 2026"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Slug</label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(e.target.value)
            }}
            className={`${inputClass} font-mono`}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Mô tả (tuỳ chọn)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Ảnh bìa</label>
          <input
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="Dán URL hoặc tải ảnh lên"
            className={inputClass}
          />
          <div className="mt-2 flex items-center gap-3">
            <ImageUploadButton label="Tải ảnh từ máy" onUploaded={([url]) => setCoverImageUrl(url)} />
            {coverImageUrl && (
              <div
                className="h-10 w-16 rounded-md bg-secondary bg-cover bg-center"
                style={{ backgroundImage: `url(${coverImageUrl})` }}
              />
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary">Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CollectionStatus)}
              className={inputClass}
            >
              <option value="DRAFT">Nháp</option>
              <option value="PUBLISHED">Đã đăng</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary">Hiển thị từ ngày (tuỳ chọn)</label>
            <input type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary">Đến hết ngày (tuỳ chọn)</label>
            <input type="date" value={endAt} onChange={(e) => setEndAt(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">
            Tour trong bộ sưu tập ({selected.length})
          </label>
          {selected.length === 0 ? (
            <p className="text-sm text-text-muted">Chưa chọn tour nào — chọn từ danh sách bên dưới.</p>
          ) : (
            <ul className="space-y-1.5 rounded-lg border border-border p-2">
              {selected.map((tour, i) => (
                <li key={tour.id} className="flex items-center gap-2 rounded-md bg-surface-alt px-2 py-1.5">
                  <div
                    className="size-8 shrink-0 rounded bg-secondary bg-cover bg-center"
                    style={{ backgroundImage: `url(${tour.thumbnailUrl})` }}
                  />
                  <p className="line-clamp-1 flex-1 text-sm text-secondary">{tour.title}</p>
                  <button
                    type="button"
                    aria-label="Lên trên"
                    disabled={i === 0}
                    onClick={() => moveTour(i, -1)}
                    className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-surface disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Xuống dưới"
                    disabled={i === selected.length - 1}
                    onClick={() => moveTour(i, 1)}
                    className="flex size-7 items-center justify-center rounded-md text-text-muted hover:bg-surface disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Bỏ khỏi bộ sưu tập"
                    onClick={() => removeTour(tour.id)}
                    className="flex size-7 items-center justify-center rounded-md text-danger hover:bg-danger-soft"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="mb-1 mt-3 block text-sm font-medium text-secondary">Thêm/bớt tour</label>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {tourOptions?.map((tour) => (
              <label
                key={tour.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-alt"
              >
                <input
                  type="checkbox"
                  checked={selected.some((t) => t.id === tour.id)}
                  onChange={() => toggleTour(tour.id)}
                />
                {tour.title}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo bộ sưu tập'}
          </Button>
          {status !== 'PUBLISHED' && (
            <Button type="button" variant="outline" disabled={submitting} onClick={() => void submit('PUBLISHED')}>
              Lưu và đăng ngay
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
