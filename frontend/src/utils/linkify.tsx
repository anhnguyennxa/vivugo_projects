import type { ReactNode } from 'react'

// Nhận diện URL đầy đủ (http/https) hoặc domain trần kèm đường dẫn
// (VD vivugo-projects.vercel.app/tours?region=...) — domain trần không kèm
// đường dẫn (VD chỉ "vivugo.vn") không bắt để tránh nhận nhầm câu chữ thường.
const URL_PATTERN = /(?:https?:\/\/[^\s]+)|(?:[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+\/[^\s]*)/g

// Biến URL trong văn bản tin nhắn thành link bấm được, giữ nguyên phần chữ
// còn lại. Dùng cho khung chat (khách hàng + admin) nơi tin nhắn có thể chứa
// đường dẫn tới trang tour.
export function linkifyText(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let key = 0

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0]
    const start = match.index
    if (start > lastIndex) nodes.push(text.slice(lastIndex, start))

    const href = url.startsWith('http') ? url : `https://${url}`
    nodes.push(
      <a
        key={key++}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 hover:opacity-80"
      >
        {url}
      </a>,
    )
    lastIndex = start + url.length
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))

  return nodes
}
