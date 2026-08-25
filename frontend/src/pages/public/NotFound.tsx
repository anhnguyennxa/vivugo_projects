import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { ROUTES } from '@/constants/routes'

export function NotFound() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-28 text-center">
      <Compass className="mb-4 size-10 text-text-faint" strokeWidth={1.5} />
      <p className="font-mono text-sm font-semibold text-primary">404</p>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-secondary">
        Không tìm thấy trang này
      </h1>
      <p className="mt-2 max-w-sm text-sm text-text-muted">
        Trang bạn tìm có thể đã bị xóa hoặc chưa từng tồn tại. Hãy quay lại trang chủ để tiếp tục
        khám phá.
      </p>
      <Link to={ROUTES.home} className="mt-6">
        <Button>Về trang chủ</Button>
      </Link>
    </div>
  )
}
