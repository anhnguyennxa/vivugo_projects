import { ArrowLeft, Plus, X } from 'lucide-react'
import { type FormEvent, type ReactNode, useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { DeparturesManager } from '@/components/admin/DeparturesManager'
import { ImageUploadButton } from '@/components/admin/ImageUploadButton'
import { TourImagesManager } from '@/components/admin/TourImagesManager'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { DEPARTURE_CITY_OPTIONS } from '@/constants/departureCity'
import { REGION_OPTIONS } from '@/constants/region'
import { ROUTES } from '@/constants/routes'
import { TOUR_STATUS_LABELS } from '@/constants/tourStatus'
import { useAsync } from '@/hooks/useAsync'
import { createTour, getAdminTour, updateTour, type TourInput } from '@/services/admin'
import { getCategories } from '@/services/categories'
import type { AdminTourDetail, TourStatus } from '@/types/admin'
import type { DepartureCity, ItineraryDay, Region } from '@/types/tour'
import { getApiErrorMessage } from '@/utils/errors'
import { slugify } from '@/utils/slugify'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none'

interface FormState {
  title: string
  slug: string
  categoryId: string
  summary: string
  description: string
  location: string
  region: Region
  departureCity: DepartureCity
  durationDays: string
  durationNights: string
  basePrice: string
  discountPrice: string
  minGuests: string
  maxGuests: string
  thumbnailUrl: string
  status: TourStatus
  isFeatured: boolean
  itinerary: ItineraryDay[]
}

const EMPTY: FormState = {
  title: '',
  slug: '',
  categoryId: '',
  summary: '',
  description: '',
  location: '',
  region: 'MIEN_BAC',
  departureCity: 'HA_NOI',
  durationDays: '2',
  durationNights: '1',
  basePrice: '',
  discountPrice: '',
  minGuests: '1',
  maxGuests: '20',
  thumbnailUrl: '',
  status: 'DRAFT',
  isFeatured: false,
  itinerary: [{ day: 1, title: '', description: '' }],
}

function fromTour(t: AdminTourDetail): FormState {
  return {
    title: t.title,
    slug: t.slug,
    categoryId: t.categoryId,
    summary: t.summary ?? '',
    description: t.description,
    location: t.location,
    region: t.region,
    departureCity: t.departureCity,
    durationDays: String(t.durationDays),
    durationNights: String(t.durationNights),
    basePrice: String(t.basePrice),
    discountPrice: t.discountPrice != null ? String(t.discountPrice) : '',
    minGuests: String(t.minGuests),
    maxGuests: String(t.maxGuests),
    thumbnailUrl: t.thumbnailUrl,
    status: t.status,
    isFeatured: t.isFeatured,
    itinerary: t.itinerary.length > 0 ? t.itinerary : [{ day: 1, title: '', description: '' }],
  }
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium text-secondary">{label}</label>
      {children}
    </div>
  )
}

export function AdminTourForm() {
  const { id } = useParams<{ id: string }>()
  const initial = useAsync(() => (id ? getAdminTour(id) : Promise.resolve(null)), [id])
  // Bản tải lại sau khi thêm/xoá ảnh hoặc đợt khởi hành; ưu tiên hơn bản tải lần đầu.
  const [fresh, setFresh] = useState<AdminTourDetail | null>(null)

  const reload = useCallback(async () => {
    if (id) setFresh(await getAdminTour(id))
  }, [id])

  if (id && initial.status === 'error') {
    return (
      <div className="p-6">
        <ErrorState title="Không tìm thấy tour" description={initial.error} />
      </div>
    )
  }
  if (id && initial.status === 'loading') return <div className="p-6 text-sm text-text-muted">Đang tải…</div>

  const tour = id ? (fresh?.id === id ? fresh : initial.data) : null
  return <TourFormBody key={id ?? 'new'} tour={tour} onReload={reload} />
}

function TourFormBody({ tour, onReload }: { tour: AdminTourDetail | null; onReload: () => Promise<void> }) {
  const isEdit = !!tour
  const navigate = useNavigate()
  const { data: categories } = useAsync(() => getCategories(), [])

  const [form, setForm] = useState<FormState>(() => (tour ? fromTour(tour) : EMPTY))
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function setItinerary(index: number, patch: Partial<ItineraryDay>) {
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    }))
  }

  function addDay() {
    setForm((f) => ({ ...f, itinerary: [...f.itinerary, { day: f.itinerary.length + 1, title: '', description: '' }] }))
  }

  function removeDay(index: number) {
    setForm((f) => ({
      ...f,
      itinerary: f.itinerary.filter((_, i) => i !== index).map((d, i) => ({ ...d, day: i + 1 })),
    }))
  }

  function buildPayload(): TourInput | string {
    if (form.title.trim().length < 5) return 'Tiêu đề tối thiểu 5 ký tự'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) return 'Slug chỉ gồm chữ thường, số và dấu gạch ngang'
    if (!form.categoryId) return 'Vui lòng chọn danh mục'
    if (form.description.trim().length < 20) return 'Mô tả tối thiểu 20 ký tự'
    if (!form.location.trim()) return 'Vui lòng nhập điểm đến'
    if (!/^https?:\/\/\S+$/.test(form.thumbnailUrl)) return 'Ảnh đại diện phải là đường dẫn http/https hợp lệ'

    const durationDays = Number(form.durationDays)
    const durationNights = Number(form.durationNights)
    const basePrice = Number(form.basePrice)
    const minGuests = Number(form.minGuests)
    const maxGuests = Number(form.maxGuests)
    if (!Number.isInteger(durationDays) || durationDays < 1) return 'Số ngày phải là số nguyên dương'
    if (!Number.isInteger(durationNights) || durationNights < 0) return 'Số đêm không hợp lệ'
    if (!(basePrice > 0)) return 'Giá gốc phải lớn hơn 0'
    if (!Number.isInteger(minGuests) || minGuests < 1) return 'Số khách tối thiểu không hợp lệ'
    if (!Number.isInteger(maxGuests) || maxGuests < minGuests) return 'Số khách tối đa phải ≥ số khách tối thiểu'

    let discountPrice: number | null = null
    if (form.discountPrice) {
      discountPrice = Number(form.discountPrice)
      if (!(discountPrice >= 0) || discountPrice >= basePrice) return 'Giá khuyến mãi phải nhỏ hơn giá gốc'
    }

    const itinerary = form.itinerary.filter((d) => d.title.trim() || d.description.trim())
    if (itinerary.some((d) => !d.title.trim())) return 'Mỗi ngày trong lịch trình cần có tiêu đề'

    return {
      title: form.title.trim(),
      slug: form.slug,
      categoryId: form.categoryId,
      summary: form.summary.trim() || undefined,
      description: form.description.trim(),
      itinerary: itinerary.map((d, i) => ({ day: i + 1, title: d.title.trim(), description: d.description.trim() })),
      location: form.location.trim(),
      region: form.region,
      departureCity: form.departureCity,
      durationDays,
      durationNights,
      basePrice,
      discountPrice,
      minGuests,
      maxGuests,
      thumbnailUrl: form.thumbnailUrl,
      status: form.status,
      isFeatured: form.isFeatured,
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSaved(false)

    const payload = buildPayload()
    if (typeof payload === 'string') return setError(payload)

    setSaving(true)
    try {
      if (isEdit) {
        await updateTour(tour.id, payload)
        setSaved(true)
        await onReload()
      } else {
        // Tạo mới không gửi discountPrice: null (DTO chỉ nhận số)
        const { discountPrice, ...rest } = payload
        const created = await createTour(discountPrice != null ? { ...rest, discountPrice } : rest)
        navigate(ROUTES.adminTourEdit(created.id), { replace: true })
      }
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể lưu tour')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <Link to={ROUTES.adminTours} className="mb-2 inline-flex items-center gap-1 text-sm text-text-muted hover:text-secondary">
          <ArrowLeft className="size-4" /> Danh sách tour
        </Link>
        <h1 className="font-display text-2xl font-bold text-secondary">{isEdit ? 'Sửa tour' : 'Tạo tour mới'}</h1>
        {!isEdit && (
          <p className="mt-1 text-sm text-text-muted">Sau khi tạo, bạn có thể thêm ảnh và đợt khởi hành.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        {saved && <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">Đã lưu thay đổi</p>}

        <Field label="Tên tour">
          <input
            value={form.title}
            onChange={(e) => {
              set('title', e.target.value)
              if (!slugTouched) set('slug', slugify(e.target.value))
            }}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug">
            <input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                set('slug', e.target.value)
              }}
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Danh mục">
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={inputClass}>
              <option value="">Chọn danh mục…</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Tóm tắt (hiện trên thẻ tour)">
          <input value={form.summary} onChange={(e) => set('summary', e.target.value)} className={inputClass} />
        </Field>
        <Field label="Mô tả chi tiết">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Điểm đến">
            <input value={form.location} onChange={(e) => set('location', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Vùng miền">
            <select value={form.region} onChange={(e) => set('region', e.target.value as Region)} className={inputClass}>
              {REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Điểm khởi hành">
            <select
              value={form.departureCity}
              onChange={(e) => set('departureCity', e.target.value as DepartureCity)}
              className={inputClass}
            >
              {DEPARTURE_CITY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Số ngày">
            <input type="number" min={1} value={form.durationDays} onChange={(e) => set('durationDays', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Số đêm">
            <input type="number" min={0} value={form.durationNights} onChange={(e) => set('durationNights', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Khách tối thiểu">
            <input type="number" min={1} value={form.minGuests} onChange={(e) => set('minGuests', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Khách tối đa">
            <input type="number" min={1} value={form.maxGuests} onChange={(e) => set('maxGuests', e.target.value)} className={inputClass} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Giá gốc (₫/khách)">
            <input type="number" min={0} value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} className={inputClass} />
          </Field>
          <Field label="Giá khuyến mãi (₫, tuỳ chọn)">
            <input type="number" min={0} value={form.discountPrice} onChange={(e) => set('discountPrice', e.target.value)} className={inputClass} />
          </Field>
        </div>

        <Field label="Ảnh đại diện">
          <input
            value={form.thumbnailUrl}
            onChange={(e) => set('thumbnailUrl', e.target.value)}
            placeholder="Dán URL hoặc tải ảnh lên"
            className={inputClass}
          />
          <div className="mt-2 flex items-center gap-3">
            <ImageUploadButton label="Tải ảnh từ máy" onUploaded={([url]) => set('thumbnailUrl', url)} />
            {form.thumbnailUrl && (
              <div
                className="h-10 w-16 rounded-md bg-secondary bg-cover bg-center"
                style={{ backgroundImage: `url(${form.thumbnailUrl})` }}
              />
            )}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Trạng thái">
            <select value={form.status} onChange={(e) => set('status', e.target.value as TourStatus)} className={inputClass}>
              {(Object.keys(TOUR_STATUS_LABELS) as TourStatus[]).map((s) => (
                <option key={s} value={s}>
                  {TOUR_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-secondary">
            <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
            Tour nổi bật (hiện ở trang chủ)
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-secondary">Lịch trình</label>
            <Button type="button" size="sm" variant="outline" onClick={addDay}>
              <Plus /> Thêm ngày
            </Button>
          </div>
          <div className="space-y-3">
            {form.itinerary.map((d, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-sm font-bold text-primary-ink">Ngày {i + 1}</span>
                  <input
                    value={d.title}
                    onChange={(e) => setItinerary(i, { title: e.target.value })}
                    placeholder="Tiêu đề"
                    className={inputClass}
                  />
                  {form.itinerary.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Xoá ngày ${i + 1}`}
                      onClick={() => removeDay(i)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
                <textarea
                  value={d.description}
                  onChange={(e) => setItinerary(i, { description: e.target.value })}
                  rows={2}
                  placeholder="Mô tả hoạt động trong ngày"
                  className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-2 rounded-b-2xl border-t border-border bg-surface px-5 py-3">
          <Button type="submit" disabled={saving}>
            {saving ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo tour'}
          </Button>
          <Link to={ROUTES.adminTours}>
            <Button type="button" variant="outline">
              Quay lại
            </Button>
          </Link>
        </div>
      </form>

      {tour && (
        <>
          <TourImagesManager tourId={tour.id} images={tour.images} onChanged={() => void onReload()} />
          <DeparturesManager tourId={tour.id} departures={tour.departures} onChanged={() => void onReload()} />
        </>
      )}
    </div>
  )
}
