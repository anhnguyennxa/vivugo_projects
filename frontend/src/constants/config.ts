export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'
export const APP_NAME = 'VivuGo'

// Chỉ dùng riêng cho kết nối Socket.IO (xác thực bằng token, không phụ thuộc
// cookie nên vẫn nối thẳng cross-origin được). Để trống khi API_BASE_URL đã
// cùng domain (dev/Docker/VPS) — socket.io tự nối vào origin hiện tại của trang.
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? undefined
