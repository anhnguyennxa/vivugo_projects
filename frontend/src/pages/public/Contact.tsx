import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'

import { Breadcrumb } from '@/components/common/Breadcrumb'
import { CONTACT } from '@/constants/contact'
import { ROUTES } from '@/constants/routes'

const CARDS = [
  {
    icon: Phone,
    title: 'Hotline',
    value: CONTACT.hotline.label,
    href: CONTACT.hotline.href,
    note: 'Gọi để được tư vấn tour nhanh nhất',
  },
  {
    icon: MessageCircle,
    title: 'Zalo',
    value: CONTACT.zalo.label,
    href: CONTACT.zalo.href,
    note: 'Nhắn tin, gửi hình ảnh, nhận báo giá',
  },
  {
    icon: Mail,
    title: 'Email',
    value: CONTACT.email.label,
    href: CONTACT.email.href,
    note: 'Dành cho yêu cầu chi tiết, đoàn đông',
  },
]

export function Contact() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Trang chủ', href: ROUTES.home }, { label: 'Liên hệ' }]} />
      <h1 className="mt-4 font-display text-2xl font-bold text-secondary">Liên hệ VivuGo</h1>
      <p className="mt-1 text-sm text-text-muted">
        Đội ngũ tư vấn luôn sẵn sàng hỗ trợ bạn chọn tour và đặt chỗ.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target={c.title === 'Zalo' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-ink">
              <c.icon className="size-4.5" />
            </span>
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-text-muted">{c.title}</p>
            <p className="mt-0.5 break-all font-display text-base font-bold text-secondary">{c.value}</p>
            <p className="mt-1 text-xs text-text-muted">{c.note}</p>
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-3 rounded-2xl border border-border bg-surface p-5 text-sm text-secondary">
        <p className="flex items-center gap-2">
          <MapPin className="size-4 text-primary" /> {CONTACT.address}
        </p>
        <p className="flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Giờ làm việc: {CONTACT.workingHours}
        </p>
      </div>
    </div>
  )
}
