import { Skeleton } from '@/components/ui/skeleton'

export function BlogPostCardSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  )
}
