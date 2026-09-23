import { MessageCircle, Send, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import { formatRelativeTime } from '@/utils/format'

export function ChatWidget() {
  const userId = useAuthStore((s) => s.user?.id)
  const open = useChatStore((s) => s.open)
  const messages = useChatStore((s) => s.messages)
  const unreadCount = useChatStore((s) => s.unreadCount)
  const loading = useChatStore((s) => s.loading)
  const openPanel = useChatStore((s) => s.openPanel)
  const closePanel = useChatStore((s) => s.closePanel)
  const send = useChatStore((s) => s.send)

  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [open, messages.length])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput('')
    try {
      await send(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <div className="mb-3 flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border bg-secondary px-4 py-3">
            <p className="text-sm font-semibold text-white">Hỗ trợ VivuGo</p>
            <button type="button" onClick={closePanel} aria-label="Đóng chat">
              <X className="size-4 text-white" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {loading && <p className="text-center text-xs text-text-muted">Đang tải…</p>}
            {!loading && messages.length === 0 && (
              <p className="mt-8 text-center text-sm text-text-muted">
                Chào bạn! Đội ngũ VivuGo sẵn sàng hỗ trợ, hãy để lại tin nhắn nhé.
              </p>
            )}
            {messages.map((m) => {
              const isMine = m.senderId === userId
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? 'bg-primary text-white'
                        : 'bg-surface-alt text-secondary'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                    <p className={`mt-0.5 text-[10px] ${isMine ? 'text-white/70' : 'text-text-faint'}`}>
                      {formatRelativeTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          <div className="flex items-center gap-2 border-t border-border p-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="Nhập tin nhắn…"
              className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending || !input.trim()}
              aria-label="Gửi"
              className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => (open ? closePanel() : void openPanel())}
        aria-label="Chat hỗ trợ"
        className="relative flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-transform hover:scale-105"
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!open && unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  )
}
