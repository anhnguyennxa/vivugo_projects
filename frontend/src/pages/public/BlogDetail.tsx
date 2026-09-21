import { Eye } from 'lucide-react'
import Markdown from 'react-markdown'
import { useParams } from 'react-router-dom'

import { Breadcrumb } from '@/components/common/Breadcrumb'
import { ErrorState } from '@/components/common/ErrorState'
import { TourCard } from '@/components/tour/TourCard'
import { Skeleton } from '@/components/ui/skeleton'
import { REGION_LABELS } from '@/constants/region'
import { ROUTES } from '@/constants/routes'
import { useAsync } from '@/hooks/useAsync'
import { getBlogPostBySlug } from '@/services/blog'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function BlogDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { status, data: post, error } = useAsync(() => getBlogPostBySlug(slug!), [slug])

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <Skeleton className="mb-4 h-4 w-64" />
        <Skeleton className="h-64 w-full rounded-2xl sm:h-85" />
        <Skeleton className="mt-6 h-8 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/3" />
        <Skeleton className="mt-6 h-40 w-full" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <ErrorState
          title="Không tìm thấy bài viết"
          description={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: 'Trang chủ', href: ROUTES.home },
          { label: 'Cẩm nang', href: ROUTES.blog },
          { label: post.title },
        ]}
      />

      <div
        className="mt-4 h-56 rounded-2xl bg-secondary bg-cover bg-center sm:h-80"
        style={{ backgroundImage: `url(${post.coverImageUrl})` }}
      />

      <h1 className="mt-6 font-display text-2xl font-bold text-secondary sm:text-3xl">{post.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
        <span>{post.author.fullName}</span>
        <span className="text-text-faint">·</span>
        <span>{formatDate(post.publishedAt ?? post.createdAt)}</span>
        {post.region && (
          <>
            <span className="text-text-faint">·</span>
            <span>{REGION_LABELS[post.region]}</span>
          </>
        )}
        <span className="text-text-faint">·</span>
        <span className="flex items-center gap-1">
          <Eye className="size-3.5" /> {post.viewCount} lượt xem
        </span>
      </div>

      <div
        className="prose-content mt-6 text-[15px] leading-relaxed text-secondary
          [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-secondary
          [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-secondary
          [&_p]:mb-3 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1 [&_strong]:font-semibold
          [&_a]:text-primary [&_a]:underline"
      >
        <Markdown>{post.content}</Markdown>
      </div>

      {post.relatedTours.length > 0 && (
        <div className="mt-10 border-t border-border pt-8">
          <h2 className="mb-4 font-display text-lg font-bold text-secondary">Tour liên quan</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {post.relatedTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
