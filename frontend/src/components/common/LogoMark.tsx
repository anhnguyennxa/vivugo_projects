type LogoMarkProps = {
  className?: string
  // "dark": ghim navy + chu V trang (dung tren nen sang, VD header)
  // "light": ghim trang + chu V navy (dung tren nen toi, VD footer)
  variant?: 'dark' | 'light'
}

export function LogoMark({ className, variant = 'dark' }: LogoMarkProps) {
  const pinFill = variant === 'dark' ? '#0f172a' : '#fff'
  const markColor = variant === 'dark' ? '#fff' : '#0f172a'

  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 2C10.477 2 6 6.477 6 12c0 7.5 10 18 10 18s10-10.5 10-18c0-5.523-4.477-10-10-10Z"
        fill={pinFill}
      />
      <path
        d="M11 8.2 16 17l5-8.8"
        stroke={markColor}
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.3 14.6a3 3 0 0 0 3.6 2.9" stroke={markColor} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
