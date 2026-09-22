import { apiClient } from '@/api/client'
import type { ApiSuccess } from '@/types/api'

// Dùng chung cho mọi người dùng đã đăng nhập (ảnh đại diện, ảnh tour, ảnh bìa
// bài cẩm nang…) — quyền gắn ảnh vào từng loại dữ liệu do endpoint ghi tương
// ứng kiểm soát, không phải endpoint upload này.
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData()
  body.append('file', file)
  const { data } = await apiClient.post<ApiSuccess<{ url: string }>>('/uploads/image', body)
  return data.data.url
}
