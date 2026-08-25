import { RefreshCw, TriangleAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Không tải được dữ liệu',
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-danger-soft bg-danger-soft/40 px-6 py-14 text-center">
      <TriangleAlert className="mb-1 size-8 text-danger" strokeWidth={1.5} />
      <p className="font-display text-sm font-semibold text-secondary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          <RefreshCw /> Thử lại
        </Button>
      )}
    </div>
  )
}
