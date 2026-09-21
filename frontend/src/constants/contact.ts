// Thông tin liên hệ hiển thị công khai. Đổi số thật bằng biến môi trường VITE_CONTACT_*.
const hotlineDigits = import.meta.env.VITE_CONTACT_HOTLINE ?? '19006868'
const zaloPhone = import.meta.env.VITE_CONTACT_ZALO ?? '0900000000'

export const CONTACT = {
  hotline: {
    label: hotlineDigits.replace(/^(\d{4})(\d{4})$/, '$1 $2'),
    href: `tel:${hotlineDigits}`,
  },
  zalo: {
    label: zaloPhone,
    href: `https://zalo.me/${zaloPhone}`,
  },
  email: {
    label: import.meta.env.VITE_CONTACT_EMAIL ?? 'hi@vivugo.vn',
    href: `mailto:${import.meta.env.VITE_CONTACT_EMAIL ?? 'hi@vivugo.vn'}`,
  },
  address: '12 Nguyễn Huệ, Q.1, TP.HCM',
  workingHours: '08:00 – 21:00 hằng ngày',
} as const
