import { Prisma } from '../../generated/prisma/client';

export interface PromoWindowFields {
  discountPrice: Prisma.Decimal | null;
  promoStartAt: Date | null;
  promoEndAt: Date | null;
}

// Khuyến mãi có hiệu lực khi có giá giảm và (không có hạn, hoặc đang trong hạn).
// Dùng chung cho lọc ?promo=true và cho việc ẩn giá giảm đã hết hạn khỏi mọi nơi
// khách xem tour (danh sách, yêu thích, tour liên quan trong cẩm nang).
export function isPromoActive(tour: PromoWindowFields, now = new Date()) {
  if (tour.discountPrice == null) return false;
  if (tour.promoStartAt && now < tour.promoStartAt) return false;
  if (tour.promoEndAt && now > tour.promoEndAt) return false;
  return true;
}

// Giá giảm hiệu lực cho khách xem — null nếu chưa/đã hết hạn hoặc không có giá giảm,
// để phía hiển thị tự trở về giá gốc mà không cần biết gì về hạn khuyến mãi.
export function effectiveDiscountPrice(tour: PromoWindowFields, now = new Date()) {
  return isPromoActive(tour, now) ? Number(tour.discountPrice) : null;
}

// Điều kiện Prisma cho where.discountPrice/promoStartAt/promoEndAt khi lọc
// ?promo=true trên danh sách tour công khai. Dùng "AND" (không phải "OR") ở
// cấp cao nhất để tránh đè lên OR của điều kiện tìm kiếm khi gộp where bằng
// spread trong ToursService.findAll.
export function activePromoWhere(now = new Date()): Prisma.TourWhereInput {
  return {
    discountPrice: { not: null },
    AND: [
      { OR: [{ promoStartAt: null }, { promoStartAt: { lte: now } }] },
      { OR: [{ promoEndAt: null }, { promoEndAt: { gte: now } }] },
    ],
  };
}
