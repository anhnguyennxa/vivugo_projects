import { Prisma } from '../../generated/prisma/client';
import {
  activePromoWhere,
  effectiveDiscountPrice,
  isPromoActive,
} from './promo.util';

const NOW = new Date('2026-09-23T10:00:00.000Z');
const PAST = new Date('2026-09-01T00:00:00.000Z');
const FUTURE = new Date('2026-10-01T00:00:00.000Z');

describe('isPromoActive', () => {
  it('false khi không có giá giảm', () => {
    expect(
      isPromoActive(
        { discountPrice: null, promoStartAt: null, promoEndAt: null },
        NOW,
      ),
    ).toBe(false);
  });

  it('true khi có giá giảm và không giới hạn thời gian', () => {
    expect(
      isPromoActive(
        {
          discountPrice: new Prisma.Decimal('299000'),
          promoStartAt: null,
          promoEndAt: null,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('false khi chưa tới ngày bắt đầu', () => {
    expect(
      isPromoActive(
        {
          discountPrice: new Prisma.Decimal('299000'),
          promoStartAt: FUTURE,
          promoEndAt: null,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it('false khi đã qua ngày kết thúc', () => {
    expect(
      isPromoActive(
        {
          discountPrice: new Prisma.Decimal('299000'),
          promoStartAt: null,
          promoEndAt: PAST,
        },
        NOW,
      ),
    ).toBe(false);
  });

  it('true khi đang trong khoảng thời gian khuyến mãi', () => {
    expect(
      isPromoActive(
        {
          discountPrice: new Prisma.Decimal('299000'),
          promoStartAt: PAST,
          promoEndAt: FUTURE,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('biên: true khi now trùng đúng thời điểm bắt đầu', () => {
    expect(
      isPromoActive(
        {
          discountPrice: new Prisma.Decimal('299000'),
          promoStartAt: NOW,
          promoEndAt: null,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it('biên: true khi now trùng đúng thời điểm kết thúc', () => {
    expect(
      isPromoActive(
        {
          discountPrice: new Prisma.Decimal('299000'),
          promoStartAt: null,
          promoEndAt: NOW,
        },
        NOW,
      ),
    ).toBe(true);
  });
});

describe('effectiveDiscountPrice', () => {
  it('trả về số tiền khi khuyến mãi còn hiệu lực', () => {
    expect(
      effectiveDiscountPrice(
        {
          discountPrice: new Prisma.Decimal('1990000'),
          promoStartAt: PAST,
          promoEndAt: FUTURE,
        },
        NOW,
      ),
    ).toBe(1_990_000);
  });

  it('trả về null khi khuyến mãi đã hết hạn', () => {
    expect(
      effectiveDiscountPrice(
        {
          discountPrice: new Prisma.Decimal('1990000'),
          promoStartAt: null,
          promoEndAt: PAST,
        },
        NOW,
      ),
    ).toBeNull();
  });

  it('trả về null khi không có giá giảm', () => {
    expect(
      effectiveDiscountPrice(
        { discountPrice: null, promoStartAt: null, promoEndAt: null },
        NOW,
      ),
    ).toBeNull();
  });
});

describe('activePromoWhere', () => {
  it('sinh điều kiện Prisma AND(OR start, OR end) đúng cấu trúc và mốc thời gian', () => {
    const where = activePromoWhere(NOW);
    expect(where.discountPrice).toEqual({ not: null });
    expect(where.AND).toEqual([
      { OR: [{ promoStartAt: null }, { promoStartAt: { lte: NOW } }] },
      { OR: [{ promoEndAt: null }, { promoEndAt: { gte: NOW } }] },
    ]);
  });
});
