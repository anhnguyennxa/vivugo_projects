import { Skeleton } from '@/components/ui/skeleton'

export function TourCardSkeleton() {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-surface">
      <Skeleton className="aspect-4/3 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-6 w-full" />
        <div className="flex items-end justify-between pt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
