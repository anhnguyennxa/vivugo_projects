import { Prisma } from '../../generated/prisma/client';

// Dùng chung cho mọi nơi hiển thị thẻ tour (danh sách tour, yêu thích, bài
// cẩm nang liên quan): kèm tối đa vài đợt khởi hành sắp tới còn mở để thẻ
// hiện được ngày khởi hành, không cần gọi thêm API.
export const CARD_DEPARTURES_LIMIT = 6;

export const UPCOMING_DEPARTURES_INCLUDE = {
  where: { status: 'OPEN' as const, departureDate: { gte: new Date() } },
  orderBy: { departureDate: 'asc' as const },
  take: CARD_DEPARTURES_LIMIT,
} satisfies Prisma.Tour$departuresArgs;

export function serializeDepartures<
  T extends { priceOverride: Prisma.Decimal | null },
>(departures: T[]) {
  return departures.map((d) => ({
    ...d,
    priceOverride: d.priceOverride != null ? Number(d.priceOverride) : null,
  }));
}
