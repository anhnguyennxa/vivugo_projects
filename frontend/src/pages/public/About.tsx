import { Award, Compass, HeartHandshake, MapPin, ShieldCheck, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Breadcrumb } from '@/components/common/Breadcrumb'
import { ROUTES } from '@/constants/routes'

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'An toàn & minh bạch',
    description: 'Giá tour rõ ràng ngay từ đầu, không phụ phí ẩn, đối tác lưu trú và vận chuyển được chọn lọc kỹ.',
  },
  {
    icon: MapPin,
    title: 'Am hiểu điểm đến trong nước',
    description: 'Chỉ tập trung tour nội địa Việt Nam — từ Tây Bắc đến đồng bằng sông Cửu Long, lịch trình sát thực tế địa phương.',
  },
  {
    icon: HeartHandshake,
    title: 'Hỗ trợ tận tâm',
    description: 'Đội ngũ tư vấn đồng hành từ lúc chọn tour đến khi kết thúc hành trình, phản hồi nhanh qua hotline và Zalo.',
  },
  {
    icon: Award,
    title: 'Trải nghiệm chất lượng',
    description: 'Lịch trình được xây dựng cân bằng giữa khám phá, nghỉ ngơi và ẩm thực địa phương ở từng vùng miền.',
  },
]

export function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: 'Trang chủ', href: ROUTES.home }, { label: 'Về chúng tôi' }]} />

      <h1 className="mt-4 font-display text-2xl font-bold text-ink">Về VivuGo</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">
        VivuGo là nền tảng đặt tour và hoạt động du lịch trực tuyến, tập trung vào các hành trình khám phá Việt Nam.
        Chúng tôi tin rằng một chuyến đi đáng nhớ bắt đầu từ sự chuẩn bị rõ ràng — giá cả minh bạch, lịch trình thực
        tế và hỗ trợ sát sao trong suốt hành trình.
      </p>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-ink">
          <Compass className="size-4.5" />
        </span>
        <div>
          <p className="font-display text-base font-bold text-ink">Sứ mệnh</p>
          <p className="mt-1 text-sm text-text-muted">
            Giúp mọi người Việt Nam dễ dàng tìm và đặt những chuyến du lịch trong nước phù hợp với thời gian, ngân
            sách và sở thích của mình — không cần qua trung gian rườm rà.
          </p>
        </div>
      </div>

      <h2 className="mt-8 font-display text-lg font-bold text-ink">Giá trị cốt lõi</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {VALUES.map((v) => (
          <div key={v.title} className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary-soft text-primary-ink">
              <v.icon className="size-4.5" />
            </span>
            <p className="mt-3 font-display text-sm font-bold text-ink">{v.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">{v.description}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-primary-soft p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-primary-ink">
            <Users className="size-4.5" />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-ink">Cần tư vấn chọn tour?</p>
            <p className="text-xs text-text-muted">Đội ngũ VivuGo sẵn sàng hỗ trợ bạn lên kế hoạch chuyến đi.</p>
          </div>
        </div>
        <Link
          to={ROUTES.contact}
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
        >
          Liên hệ ngay
        </Link>
      </div>
    </div>
  )
}
