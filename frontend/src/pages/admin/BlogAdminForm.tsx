import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { REGION_OPTIONS } from '@/constants/region'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import {
  createBlogPost,
  getAdminBlogPost,
  updateBlogPost,
  type BlogPostInput,
} from '@/services/blog'
import { getTours } from '@/services/tours'
import type { BlogPostStatus } from '@/types/blog'
import type { Region } from '@/types/tour'
import { getApiErrorMessage } from '@/utils/errors'

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const EMPTY_FORM: BlogPostInput = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  coverImageUrl: '',
  region: undefined,
  status: 'DRAFT',
  relatedTourIds: [],
}

export function BlogAdminForm() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()

  const [form, setForm] = useState<BlogPostInput>(EMPTY_FORM)
  const [slugTouched, setSlugTouched] = useState(false)
  const [loaded, setLoaded] = useState(!isEdit)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: tourOptions } = useAsync(
    () => getTours({ limit: 100 }).then((r) => r.items),
    [],
  )

  useEffect(() => {
    if (!isEdit) return
    getAdminBlogPost(id).then((post) => {
      setForm({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImageUrl: post.coverImageUrl,
        region: post.region ?? undefined,
        status: post.status,
        relatedTourIds: post.relatedTourIds,
      })
      setSlugTouched(true)
      setLoaded(true)
    })
  }, [id, isEdit])

  function handleTitleChange(title: string) {
    setForm((f) => ({ ...f, title, ...(slugTouched ? {} : { slug: slugify(title) }) }))
  }

  function toggleRelatedTour(tourId: string) {
    setForm((f) => {
      const current = f.relatedTourIds ?? []
      return {
        ...f,
        relatedTourIds: current.includes(tourId)
          ? current.filter((t) => t !== tourId)
          : [...current, tourId],
      }
    })
  }

  async function submit(statusOverride?: BlogPostStatus) {
    setError(null)

    if (form.title.trim().length < 5) return setError('Tiêu đề cần tối thiểu 5 ký tự')
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      return setError('Slug chỉ gồm chữ thường, số và dấu gạch ngang')
    }
    if (form.excerpt.trim().length < 10) return setError('Tóm tắt cần tối thiểu 10 ký tự')
    if (form.content.trim().length < 50) return setError('Nội dung cần tối thiểu 50 ký tự')
    if (!form.coverImageUrl.trim()) return setError('Vui lòng nhập ảnh bìa')

    const payload: BlogPostInput = { ...form, status: statusOverride ?? form.status }

    setSubmitting(true)
    try {
      if (isEdit) {
        await updateBlogPost(id, payload)
      } else {
        await createBlogPost(payload)
      }
      navigate(ROUTES.adminBlog)
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể lưu bài viết')
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
        <h1 className="font-display text-2xl font-bold text-secondary">
          {isEdit ? 'Sửa bài viết' : 'Tạo bài viết mới'}
        </h1>
        <Link to={ROUTES.adminBlog} className="text-sm text-text-muted hover:text-secondary">
          Huỷ
        </Link>
      </div>

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          void submit()
        }}
        className="space-y-4"
      >
        {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Tiêu đề</label>
          <input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Slug</label>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true)
              setForm((f) => ({ ...f, slug: e.target.value }))
            }}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 font-mono text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Tóm tắt</label>
          <textarea
            value={form.excerpt}
            onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">
            Nội dung (Markdown)
          </label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            rows={12}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Ảnh bìa (URL)</label>
          <input
            value={form.coverImageUrl}
            onChange={(e) => setForm((f) => ({ ...f, coverImageUrl: e.target.value }))}
            className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary">Vùng miền</label>
            <select
              value={form.region ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, region: (e.target.value || undefined) as Region | undefined }))
              }
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">Không gắn vùng miền</option>
              {REGION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary">Trạng thái</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BlogPostStatus }))}
              className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
            >
              <option value="DRAFT">Nháp</option>
              <option value="PUBLISHED">Đã đăng</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-secondary">Tour liên quan</label>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            {tourOptions?.map((tour) => (
              <label
                key={tour.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-alt"
              >
                <input
                  type="checkbox"
                  checked={(form.relatedTourIds ?? []).includes(tour.id)}
                  onChange={() => toggleRelatedTour(tour.id)}
                />
                {tour.title}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo bài viết'}
          </Button>
          {form.status !== 'PUBLISHED' && (
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={() => void submit('PUBLISHED')}
            >
              Lưu và đăng ngay
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
