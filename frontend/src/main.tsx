import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './stores/theme'
import { App } from './App.tsx'

// Tab mở từ trước lần deploy mới nhất có thể giữ tham chiếu tới file JS đã
// tách lazy-load (VD trang admin) nhưng không còn tồn tại trên server sau khi
// deploy đè lên — Vite bắn sự kiện này khi gặp đúng trường hợp đó, tự tải lại
// trang 1 lần để lấy đúng bản build hiện tại thay vì hiện trang lỗi trắng.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
