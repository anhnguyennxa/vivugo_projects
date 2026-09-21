import { Headset, Mail, MessageCircle, Phone, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { CONTACT } from '@/constants/contact'
import { cn } from '@/lib/utils'

const CHANNELS = [
  { key: 'hotline', label: `Hotline ${CONTACT.hotline.label}`, href: CONTACT.hotline.href, icon: Phone, tone: 'bg-success' },
  { key: 'zalo', label: 'Chat Zalo', href: CONTACT.zalo.href, icon: MessageCircle, tone: 'bg-primary' },
  { key: 'email', label: 'Gửi email', href: CONTACT.email.href, icon: Mail, tone: 'bg-accent' },
]

export function ContactFab() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div ref={ref} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open &&
        CHANNELS.map((c) => (
          <a
            key={c.key}
            href={c.href}
            target={c.key === 'zalo' ? '_blank' : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-full bg-surface py-1.5 pl-4 pr-1.5 text-sm font-semibold text-secondary shadow-md ring-1 ring-border transition-colors hover:bg-surface-alt"
          >
            {c.label}
            <span className={cn('flex size-8 items-center justify-center rounded-full text-white', c.tone)}>
              <c.icon className="size-4" />
            </span>
          </a>
        ))}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Đóng liên hệ' : 'Liên hệ tư vấn'}
        aria-expanded={open}
        className="flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-colors hover:bg-primary-ink"
      >
        {open ? <X className="size-5" /> : <Headset className="size-5" />}
      </button>
    </div>
  )
}
