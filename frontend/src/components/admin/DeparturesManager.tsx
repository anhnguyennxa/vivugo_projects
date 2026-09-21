import { CalendarPlus, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  createDeparture,
  deleteDeparture,
  updateDeparture,
  type DepartureInput,
} from '@/services/admin'
import type { AdminDeparture } from '@/types/admin'
import { getApiErrorMessage } from '@/utils/errors'
import { formatDate, formatVnd } from '@/utils/format'

const STATUS_LABELS: Record<AdminDeparture['status'], string> = {
  OPEN: 'Đang mở',
  CLOSED: 'Đã đóng',
  CANCELLED: 'Đã huỷ',
}

const inputClass =
  'h-9 w-full rounded-lg border border-border bg-surface px-2.5 text-sm focus:border-primary focus:outline-none'

interface FormState {
  id: string | null
  departureDate: string
  returnDate: string
  totalSlots: string
  priceOverride: string
}

function toForm(d?: AdminDeparture): FormState {
  return {
    id: d?.id ?? null,
    departureDate: d ? d.departureDate.slice(0, 10) : '',
    returnDate: d ? d.returnDate.slice(0, 10) : '',
    totalSlots: d ? String(d.totalSlots) : '',
    priceOverride: d?.priceOverride != null ? String(d.priceOverride) : '',
  }
}

export function DeparturesManager({
  tourId,
  departures,
  onChanged,
}: {
  tourId: string
  departures: AdminDeparture[]
  onChanged: () => void
}) {
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function guard(fn: () => Promise<void>, fallback: string) {
    setError(null)
    setBusy(true)
    try {
      await fn()
      onChanged()
      return true
    } catch (err) {
      setError(getApiErrorMessage(err) ?? fallback)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!form) return
    const slots = Number(form.totalSlots)
    if (!form.departureDate || !form.returnDate) return setError('Vui lòng chọn ngày khởi hành và ngày kết thúc')
    if (form.returnDate < form.departureDate) return setError('Ngày kết thúc phải sau ngày khởi hành')
    if (!Number.isInteger(slots) || slots < 1) return setError('Tổng số chỗ phải là số nguyên dương')
    if (form.priceOverride && Number(form.priceOverride) < 0) return setError('Giá riêng không hợp lệ')

    const priceOverride = form.priceOverride ? Number(form.priceOverride) : null
    const ok = await guard(async () => {
      if (form.id) {
        await updateDeparture(form.id, {
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          totalSlots: slots,
          priceOverride,
        })
      } else {
        const input: DepartureInput = {
          departureDate: form.departureDate,
          returnDate: form.returnDate,
          totalSlots: slots,
          ...(priceOverride != null && { priceOverride }),
        }
        await createDeparture(tourId, input)
      }
    }, 'Không thể lưu đợt khởi hành')
    if (ok) setForm(null)
  }

  function handleDelete(d: AdminDeparture) {
    if (!window.confirm(`Xoá đợt khởi hành ${formatDate(d.departureDate)}?`)) return
    void guard(() => deleteDeparture(d.id), 'Không thể xoá đợt khởi hành')
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-secondary">Đợt khởi hành</h2>
        {!form && (
          <Button type="button" size="sm" onClick={() => setForm(toForm())}>
            <CalendarPlus /> Thêm đợt
          </Button>
        )}
      </div>
      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      {form && (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
          <p className="mb-3 text-sm font-semibold text-secondary">{form.id ? 'Sửa đợt khởi hành' : 'Thêm đợt khởi hành'}</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Ngày khởi hành</label>
              <input
                type="date"
                value={form.departureDate}
                onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Ngày kết thúc</label>
              <input
                type="date"
                value={form.returnDate}
                onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Tổng số chỗ</label>
              <input
                type="number"
                min={1}
                value={form.totalSlots}
                onChange={(e) => setForm({ ...form, totalSlots: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Giá riêng (₫, tuỳ chọn)</label>
              <input
                type="number"
                min={0}
                value={form.priceOverride}
                onChange={(e) => setForm({ ...form, priceOverride: e.target.value })}
                placeholder="Theo giá tour"
                className={inputClass}
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={handleSave}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setForm(null)}>
              Huỷ
            </Button>
          </div>
        </div>
      )}

      {departures.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">Chưa có đợt khởi hành nào — khách chưa thể đặt tour này.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs font-semibold uppercase text-text-muted">
              <tr>
                <th className="py-2 pr-3">Khởi hành</th>
                <th className="py-2 pr-3">Chỗ (đã đặt / tổng)</th>
                <th className="py-2 pr-3">Giá riêng</th>
                <th className="py-2 pr-3">Trạng thái</th>
                <th className="py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {departures.map((d) => (
                <tr key={d.id} className="border-t border-border">
                  <td className="py-2.5 pr-3 text-secondary">
                    {formatDate(d.departureDate)} – {formatDate(d.returnDate)}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-secondary">
                    {d.bookedSlots} / {d.totalSlots}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-text-muted">
                    {d.priceOverride != null ? formatVnd(d.priceOverride) : '—'}
                  </td>
                  <td className="py-2.5 pr-3">
                    <select
                      value={d.status}
                      disabled={busy}
                      onChange={(e) =>
                        guard(
                          () => updateDeparture(d.id, { status: e.target.value as AdminDeparture['status'] }),
                          'Không thể đổi trạng thái',
                        )
                      }
                      aria-label="Trạng thái đợt"
                      className="h-8 rounded-md border border-border bg-surface px-2 text-xs focus:border-primary focus:outline-none"
                    >
                      {(Object.keys(STATUS_LABELS) as AdminDeparture['status'][]).map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button type="button" size="sm" variant="outline" aria-label="Sửa" onClick={() => setForm(toForm(d))}>
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        aria-label="Xoá"
                        disabled={busy}
                        onClick={() => handleDelete(d)}
                        className="text-danger hover:bg-danger-soft"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
