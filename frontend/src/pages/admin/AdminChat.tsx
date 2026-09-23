import { Lock, Send } from 'lucide-react'
import { useEffect, useState } from 'react'

import { EmptyState } from '@/components/common/EmptyState'
import { Button } from '@/components/ui/button'
import { useAsync } from '@/hooks/useAsync'
import { getSocket } from '@/lib/socket'
import {
  closeAdminChatConversation,
  getAdminChatConversationMessages,
  getAdminChatConversations,
  sendAdminChatMessage,
} from '@/services/chat'
import { useAdminChatStore } from '@/stores/adminChat'
import { useAuthStore } from '@/stores/auth'
import type { ChatConversation, ChatMessage, ChatMessageEvent, ChatUser } from '@/types/chat'
import { formatRelativeTime } from '@/utils/format'

type Thread = { conversation: ChatConversation & { user: ChatUser }; messages: ChatMessage[] }

const STATUS_TABS: { value: 'OPEN' | 'CLOSED'; label: string }[] = [
  { value: 'OPEN', label: 'Đang mở' },
  { value: 'CLOSED', label: 'Đã đóng' },
]

export function AdminChat() {
  const adminId = useAuthStore((s) => s.user?.id)
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'CLOSED'>('OPEN')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [thread, setThread] = useState<Thread | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const { status, data: result } = useAsync(
    () => getAdminChatConversations({ status: statusFilter, limit: 30 }),
    [statusFilter, reloadKey],
  )

  async function openConversation(id: string) {
    setSelectedId(id)
    const data = await getAdminChatConversationMessages(id)
    setThread(data)
    setReloadKey((k) => k + 1)
    void useAdminChatStore.getState().refresh()
  }

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    function handler(event: ChatMessageEvent) {
      setReloadKey((k) => k + 1)
      setSelectedId((current) => {
        if (current && event.conversationId === current) {
          setThread((prev) => (prev ? { ...prev, messages: [...prev.messages, event.message] } : prev))
        }
        return current
      })
    }

    socket.on('chat:message', handler)
    return () => {
      socket.off('chat:message', handler)
    }
  }, [])

  async function handleSend() {
    const text = input.trim()
    if (!selectedId || !text || sending) return
    setSending(true)
    setInput('')
    try {
      // Không tự thêm vào thread ở đây — server bắn lại sự kiện chat:message
      // cho mọi admin (kể cả người vừa gửi), listener bên dưới sẽ thêm vào để
      // tránh hiện đúp.
      await sendAdminChatMessage(selectedId, text)
    } finally {
      setSending(false)
    }
  }

  async function handleClose() {
    if (!selectedId) return
    await closeAdminChatConversation(selectedId)
    setThread((prev) => (prev ? { ...prev, conversation: { ...prev.conversation, status: 'CLOSED' } } : prev))
    setReloadKey((k) => k + 1)
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col p-4 sm:p-6">
      <h1 className="font-display text-2xl font-bold text-secondary">Chat hỗ trợ</h1>
      <p className="mt-1 text-sm text-text-muted">Trả lời tin nhắn từ khách hàng</p>

      <div className="mt-4 flex min-h-0 flex-1 gap-4">
        <div className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface">
          <div className="flex gap-1 border-b border-border p-2">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.value)
                  setSelectedId(null)
                  setThread(null)
                }}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold ${
                  statusFilter === tab.value
                    ? 'bg-primary-soft text-primary-ink'
                    : 'text-text-muted hover:bg-surface-alt'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {status === 'loading' && <p className="p-3 text-xs text-text-muted">Đang tải…</p>}
            {status === 'success' && result.items.length === 0 && (
              <p className="p-3 text-center text-xs text-text-muted">Không có hội thoại nào</p>
            )}
            {status === 'success' &&
              result.items.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => void openConversation(c.id)}
                  className={`flex w-full items-start gap-2.5 border-b border-border px-3 py-2.5 text-left hover:bg-surface-alt ${
                    selectedId === c.id ? 'bg-primary-soft/40' : ''
                  }`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-accent to-amber-400 text-xs font-bold text-white">
                    {c.user.fullName.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className="truncate text-sm font-medium text-secondary">{c.user.fullName}</span>
                      {c.unreadCount > 0 && (
                        <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                          {c.unreadCount > 9 ? '9+' : c.unreadCount}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-text-muted">
                      {c.lastMessage?.message ?? 'Chưa có tin nhắn'}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-border bg-surface">
          {!thread && (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState title="Chọn một hội thoại để xem" />
            </div>
          )}

          {thread && (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-secondary">{thread.conversation.user.fullName}</p>
                  <p className="text-xs text-text-muted">{thread.conversation.user.email}</p>
                </div>
                {thread.conversation.status === 'OPEN' && (
                  <Button variant="outline" size="sm" onClick={() => void handleClose()}>
                    <Lock className="size-3.5" /> Đóng hội thoại
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
                {thread.messages.map((m) => {
                  const isMine = m.senderId === adminId
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                          isMine ? 'bg-primary text-white' : 'bg-surface-alt text-secondary'
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
              </div>

              {thread.conversation.status === 'CLOSED' ? (
                <p className="border-t border-border px-4 py-3 text-center text-xs text-text-muted">
                  Hội thoại đã đóng
                </p>
              ) : (
                <div className="flex items-center gap-2 border-t border-border p-3">
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
                    placeholder="Nhập tin nhắn trả lời…"
                    className="h-9 flex-1 rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none"
                  />
                  <Button size="icon" disabled={sending || !input.trim()} onClick={() => void handleSend()}>
                    <Send className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
