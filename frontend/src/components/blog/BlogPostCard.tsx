import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

import { REGION_LABELS } from '@/constants/region'
import { ROUTES } from '@/constants/routes'
import type { BlogPostSummary } from '@/types/blog'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso),
  )
}

export function BlogPostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link
      to={ROUTES.blogDetail(post.slug)}
      className="group block w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-shadow hover:shadow-md"
    >
      <div
        className="h-36 bg-secondary bg-cover bg-center"
        style={{ backgroundImage: `url(${post.coverImageUrl})` }}
      />
      <div className="p-3.5">
        <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wide text-primary-ink">
          {post.region ? REGION_LABELS[post.region] : 'Cẩm nang'}
          <span className="text-text-faint">·</span>
          <span className="normal-case text-text-muted">{formatDate(post.publishedAt ?? post.createdAt)}</span>
        </p>
        <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold leading-snug text-secondary">
          {post.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs text-text-muted">{post.excerpt}</p>
        <p className="mt-2.5 flex items-center gap-1 text-xs text-text-faint">
          <Eye className="size-3.5" /> {post.viewCount} lượt xem
        </p>
      </div>
    </Link>
  )
}
