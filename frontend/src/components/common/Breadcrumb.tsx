import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 text-text-faint" />}
          {item.href ? (
            <Link to={item.href} className="text-text-muted hover:text-primary">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-secondary">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
