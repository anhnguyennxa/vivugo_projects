import { Star } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createReview } from '@/services/reviews'
import { getApiErrorMessage } from '@/utils/errors'

export function ReviewForm({
  bookingId,
  onSubmitted,
}: {
  bookingId: string
  onSubmitted: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (rating < 1) {
      setError('Vui lòng chọn số sao đánh giá')
      return
    }
    if (comment.trim().length < 10) {
      setError('Nhận xét cần tối thiểu 10 ký tự')
      return
    }

    setSubmitting(true)
    try {
      await createReview({ bookingId, rating, comment: comment.trim() })
      onSubmitted()
    } catch (err) {
      setError(getApiErrorMessage(err) ?? 'Không thể gửi đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
      <p className="font-display text-sm font-bold text-secondary">
        Bạn đã hoàn thành tour này — chia sẻ trải nghiệm nhé!
      </p>

      {error && (
        <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            onMouseEnter={() => setHoverRating(value)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${value} sao`}
            className="p-0.5"
          >
            <Star
              className={cn(
                'size-6 transition-colors',
                (hoverRating || rating) >= value
                  ? 'fill-accent text-accent'
                  : 'text-border',
              )}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Điều gì khiến chuyến đi của bạn đáng nhớ?"
        className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />

      <Button type="submit" size="sm" className="mt-3" disabled={submitting}>
        {submitting ? 'Đang gửi…' : 'Gửi đánh giá'}
      </Button>
    </form>
  )
}
