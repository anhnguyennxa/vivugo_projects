import { Compass, Mail, MapPin, Phone } from 'lucide-react'
import { Link } from 'react-router-dom'

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.9h2.65l.4-3.08h-3.05V8.06c0-.89.25-1.5 1.52-1.5h1.63V3.8A21.8 21.8 0 0 0 14.2 3.6c-2.55 0-4.3 1.56-4.3 4.42V10H7.24v3.08h2.66V21h3.6Z" />
    </svg>
  )
}
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.7" />
      <circle cx="17.2" cy="6.8" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12s0-3.2-.4-4.7a2.9 2.9 0 0 0-2-2C18 5 12 5 12 5s-6 0-7.6.3a2.9 2.9 0 0 0-2 2C2 8.8 2 12 2 12s0 3.2.4 4.7a2.9 2.9 0 0 0 2 2C6 19 12 19 12 19s6 0 7.6-.3a2.9 2.9 0 0 0 2-2c.4-1.5.4-4.7.4-4.7ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" />
    </svg>
  )
}

import { APP_NAME } from '@/constants/config'
import { ROUTES } from '@/constants/routes'

const FOOTER_LINKS = {
  company: [
    { label: 'Về chúng tôi', href: ROUTES.about },
    { label: 'Liên hệ', href: ROUTES.contact },
    { label: 'Tuyển dụng', href: '#' },
  ],
  explore: [
    { label: 'Tất cả tour', href: ROUTES.tours },
    { label: 'Điểm đến nổi bật', href: ROUTES.tours },
  ],
  legal: [
    { label: 'Chính sách bảo mật', href: '#' },
    { label: 'Điều khoản sử dụng', href: '#' },
    { label: 'Chính sách hoàn hủy', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-blue-400 text-white">
              <Compass className="size-4.5" strokeWidth={2.2} />
            </span>
            <span className="font-display text-lg font-extrabold text-white">{APP_NAME}</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-slate-400">
            Nền tảng đặt tour và hoạt động du lịch trực tuyến — trọn gói, minh bạch, thanh toán an
            toàn.
          </p>
          <div className="mt-4 flex gap-3">
            {[FacebookIcon, InstagramIcon, YoutubeIcon].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="flex size-8 items-center justify-center rounded-full bg-white/10 text-slate-300 transition-colors hover:bg-primary hover:text-white"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Công ty</h4>
          <ul className="space-y-2">
            {FOOTER_LINKS.company.map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="text-sm text-slate-400 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Khám phá</h4>
          <ul className="space-y-2">
            {FOOTER_LINKS.explore.map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="text-sm text-slate-400 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <h4 className="mb-3 mt-5 text-sm font-semibold text-white">Chính sách</h4>
          <ul className="space-y-2">
            {FOOTER_LINKS.legal.map((l) => (
              <li key={l.label}>
                <Link to={l.href} className="text-sm text-slate-400 hover:text-white">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Liên hệ</h4>
          <ul className="space-y-3 text-sm text-slate-400">
            <li className="flex gap-2">
              <MapPin className="size-4 shrink-0 text-primary" /> 12 Nguyễn Huệ, Q.1, TP.HCM
            </li>
            <li className="flex gap-2">
              <Phone className="size-4 shrink-0 text-primary" /> 1900 6868
            </li>
            <li className="flex gap-2">
              <Mail className="size-4 shrink-0 text-primary" /> hi@vivugo.vn
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} {APP_NAME}. Đã đăng ký bản quyền.
      </div>
    </footer>
  )
}
