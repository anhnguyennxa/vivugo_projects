import { BadRequestException } from '@nestjs/common';

// Dùng chung cho mọi thực thể có khoảng thời gian hiệu lực tuỳ chọn (hạn
// khuyến mãi của tour, hạn hiển thị của bộ sưu tập...).
export function isWithinWindow(
  startAt: Date | null,
  endAt: Date | null,
  now = new Date(),
) {
  if (startAt && now < startAt) return false;
  if (endAt && now > endAt) return false;
  return true;
}

export function ensureDateWindowValid(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
  message = 'Ngày bắt đầu phải trước hoặc bằng ngày kết thúc',
) {
  if (startAt && endAt && new Date(startAt) > new Date(endAt)) {
    throw new BadRequestException(message);
  }
}
