import { io, type Socket } from 'socket.io-client'

import { SOCKET_URL } from '@/constants/config'

let socket: Socket | null = null
let socketToken: string | null = null

export function connectSocket(token: string): Socket {
  // So khớp theo token, không phải theo `.connected` — lúc kết nối vẫn đang
  // xác lập (chưa kịp connected=true) mà gọi lại hàm này thì so `.connected`
  // sẽ tạo thêm 1 socket thứ hai song song, khiến mọi sự kiện nhận đúp.
  if (socket && socketToken === token) return socket

  socket?.disconnect()
  socketToken = token
  socket = io(SOCKET_URL, {
    path: '/ws',
    auth: { token },
    autoConnect: true,
  })
  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
  socketToken = null
}

export function getSocket(): Socket | null {
  return socket
}
