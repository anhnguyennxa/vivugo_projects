import { Skeleton } from '@/components/ui/skeleton'

export function TourCardSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="space-y-2 p-3.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex justify-between pt-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-10" />
        </div>
      </div>
    </div>
  )
}
