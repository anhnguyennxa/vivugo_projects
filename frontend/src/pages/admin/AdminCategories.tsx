import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { ErrorState } from '@/components/common/ErrorState'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { createCategory, deleteCategory, updateCategory } from '@/services/admin'
import { getCategories } from '@/services/categories'
import { getApiErrorMessage } from '@/utils/errors'
import { slugify } from '@/utils/slugify'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none'

interface FormState {
  id: string | null
  name: string
  slug: string
  description: string
  slugTouched: boolean
}

const EMPTY: FormState = { id: null, name: '', slug: '', description: '', slugTouched: false }

export function AdminCategories() {
  const [reloadKey, setReloadKey] = useState(0)
  const { status, data, error } = useAsync(() => getCategories(), [reloadKey])
  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setFormError(null)

    if (form.name.trim().length < 2) return setFormError('Tên danh mục tối thiểu 2 ký tự')
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      return setFormError('Slug chỉ gồm chữ thường, số và dấu gạch ngang')
    }

    const payload = {
      name: form.name.trim(),
      slug: form.slug,
      description: form.description.trim() || undefined,
    }
    setSaving(true)
    try {
      if (form.id) await updateCategory(form.id, payload)
      else await createCategory(payload)
      setForm(null)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setFormError(getApiErrorMessage(err) ?? 'Không thể lưu danh mục')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Xoá danh mục "${name}"?`)) return
    setActionError(null)
    try {
      await deleteCategory(id)
      setReloadKey((k) => k + 1)
    } catch (err) {
      setActionError(getApiErrorMessage(err) ?? 'Không thể xoá danh mục')
    }
  }

  return (
    <div className="max-w-3xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-secondary">Danh mục tour</h1>
          <p className="mt-1 text-sm text-text-muted">{data ? `${data.length} danh mục` : 'Nhóm tour theo chủ đề'}</p>
        </div>
        {!form && (
          <Button onClick={() => setForm(EMPTY)}>
            <Plus /> Thêm danh mục
          </Button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-base font-bold text-secondary">
            {form.id ? 'Sửa danh mục' : 'Thêm danh mục'}
          </h2>
          {formError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary">Tên</label>
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                    ...(form.slugTouched ? {} : { slug: slugify(e.target.value) }),
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-secondary">Slug</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-secondary">Mô tả</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setForm(null)}>
              Huỷ
            </Button>
          </div>
        </form>
      )}

      {actionError && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{actionError}</p>}

      <div className="mt-4">
        {status === 'loading' && <div className="h-40 animate-pulse rounded-xl bg-surface-alt" />}
        {status === 'error' && <ErrorState description={error} onRetry={() => setReloadKey((k) => k + 1)} />}
        {status === 'success' && data.length === 0 && <EmptyState icon={Tags} title="Chưa có danh mục nào" />}
        {status === 'success' && data.length > 0 && (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {data.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-secondary">{c.name}</p>
                  <p className="font-mono text-xs text-text-muted">{c.slug}</p>
                  {c.description && <p className="line-clamp-1 text-xs text-text-muted">{c.description}</p>}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Sửa"
                    onClick={() =>
                      setForm({
                        id: c.id,
                        name: c.name,
                        slug: c.slug,
                        description: c.description ?? '',
                        slugTouched: true,
                      })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    aria-label="Xoá"
                    onClick={() => handleDelete(c.id, c.name)}
                    className="text-danger hover:bg-danger-soft"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
