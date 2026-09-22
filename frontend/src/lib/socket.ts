import { io, type Socket } from 'socket.io-client'

import { API_BASE_URL } from '@/constants/config'

// API_BASE_URL dạng tuyệt đối (https://api.vivugo.vn/api) thì bỏ hậu tố /api để
// lấy origin server; dạng tương đối (/api, dùng qua Vite proxy) thì để socket.io
// tự nối vào origin hiện tại của trang.
function resolveSocketUrl(): string | undefined {
  if (!API_BASE_URL.startsWith('http')) return undefined
  return API_BASE_URL.replace(/\/api\/?$/, '')
}

let socket: Socket | null = null

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(resolveSocketUrl(), {
    path: '/ws',
    auth: { token },
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}

export function getSocket(): Socket | null {
  return socket
}
