import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon = Inbox, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-alt/50 px-6 py-14 text-center">
      <Icon className="mb-1 size-8 text-text-faint" strokeWidth={1.5} />
      <p className="font-display text-sm font-semibold text-secondary">{title}</p>
      {description && <p className="max-w-sm text-sm text-text-muted">{description}</p>}
    </div>
  )
}
