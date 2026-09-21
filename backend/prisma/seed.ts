import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';

import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  const adminPasswordHash = await argon2.hash('Admin123!23');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vivugo.vn' },
    update: {},
    create: {
      email: 'admin@vivugo.vn',
      passwordHash: adminPasswordHash,
      fullName: 'VivuGo Admin',
      role: 'ADMIN',
    },
  });

  const categoriesData = [
    {
      name: 'Biển đảo',
      slug: 'bien-dao',
      description: 'Nắng, cát và biển xanh',
    },
    {
      name: 'Núi rừng',
      slug: 'nui-rung',
      description: 'Săn mây, trekking, khí hậu se lạnh',
    },
    {
      name: 'Văn hoá & lịch sử',
      slug: 'van-hoa-lich-su',
      description: 'Di sản, phố cổ, cố đô',
    },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const c of categoriesData) {
    categories[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  const toursData = [
    {
      title: 'Phú Quốc — Khám phá đảo Ngọc',
      slug: 'phu-quoc-kham-pha-dao-ngoc',
      categorySlug: 'bien-dao',
      region: 'MIEN_NAM' as const,
      summary:
        'Lặn ngắm san hô, tắm biển Bãi Sao, khám phá làng chài Hàm Ninh.',
      description:
        'Trọn gói 3 ngày 2 đêm khám phá đảo Ngọc Phú Quốc: tắm biển, lặn ngắm san hô, thưởng thức hải sản tươi sống và dạo chợ đêm Dinh Cậu.',
      location: 'Kiên Giang',
      durationDays: 3,
      durationNights: 2,
      basePrice: 4990000,
      discountPrice: 4290000,
      maxGuests: 20,
      isFeatured: true,
    },
    {
      title: 'Vịnh Hạ Long — Di sản giữa lòng biển',
      slug: 'vinh-ha-long-du-thuyen',
      categorySlug: 'bien-dao',
      region: 'MIEN_BAC' as const,
      summary:
        'Du thuyền 5 sao, chèo kayak, lặn ngắm san hô giữa hàng nghìn đảo đá vôi.',
      description:
        'Trải nghiệm nghỉ đêm trên du thuyền 5 sao giữa Vịnh Hạ Long, chèo kayak khám phá hang động và thưởng thức ẩm thực hải sản cao cấp.',
      location: 'Quảng Ninh',
      durationDays: 3,
      durationNights: 2,
      basePrice: 5990000,
      maxGuests: 16,
      isFeatured: true,
    },
    {
      title: 'Sa Pa — Săn mây Fansipan',
      slug: 'sa-pa-san-may-fansipan',
      categorySlug: 'nui-rung',
      region: 'MIEN_BAC' as const,
      summary:
        'Chinh phục nóc nhà Đông Dương bằng cáp treo, khám phá bản Cát Cát.',
      description:
        '2 ngày 1 đêm săn mây trên đỉnh Fansipan, tham quan bản Cát Cát, thưởng thức đặc sản vùng cao Tây Bắc.',
      location: 'Lào Cai',
      durationDays: 2,
      durationNights: 1,
      basePrice: 2990000,
      maxGuests: 25,
      isFeatured: true,
    },
    {
      title: 'Đà Lạt — Thành phố ngàn hoa',
      slug: 'da-lat-thanh-pho-ngan-hoa',
      categorySlug: 'nui-rung',
      region: 'TAY_NGUYEN' as const,
      summary: 'Đồi chè Cầu Đất, thác Datanla, chợ đêm Đà Lạt se lạnh.',
      description:
        '3 ngày 2 đêm dạo quanh thành phố ngàn hoa: đồi chè Cầu Đất, thác Datanla, vườn dâu tây và chợ đêm Đà Lạt.',
      location: 'Lâm Đồng',
      durationDays: 3,
      durationNights: 2,
      basePrice: 3490000,
      maxGuests: 20,
    },
    {
      title: 'Huế — Cố đô di sản',
      slug: 'hue-co-do-di-san',
      categorySlug: 'van-hoa-lich-su',
      region: 'MIEN_TRUNG' as const,
      summary:
        'Đại Nội, lăng tẩm triều Nguyễn, du thuyền sông Hương nghe ca Huế.',
      description:
        '2 ngày 1 đêm tham quan Đại Nội Huế, các lăng tẩm triều Nguyễn và du thuyền sông Hương nghe ca Huế truyền thống.',
      location: 'Thừa Thiên Huế',
      durationDays: 2,
      durationNights: 1,
      basePrice: 2790000,
      maxGuests: 25,
      isFeatured: true,
    },
    {
      title: 'Hội An — Phố cổ đèn lồng',
      slug: 'hoi-an-pho-co-den-long',
      categorySlug: 'van-hoa-lich-su',
      region: 'MIEN_TRUNG' as const,
      summary: 'Phố cổ về đêm, thả hoa đăng sông Hoài, làng rau Trà Quế.',
      description:
        '2 ngày 1 đêm dạo phố cổ Hội An lung linh ánh đèn lồng, thả hoa đăng sông Hoài và trải nghiệm làm nông dân tại làng rau Trà Quế.',
      location: 'Quảng Nam',
      durationDays: 2,
      durationNights: 1,
      basePrice: 2590000,
      maxGuests: 20,
    },
  ];

  for (const t of toursData) {
    const thumbnailUrl = `https://picsum.photos/seed/${t.slug}/800/600`;

    const tour = await prisma.tour.upsert({
      where: { slug: t.slug },
      update: {},
      create: {
        title: t.title,
        slug: t.slug,
        categoryId: categories[t.categorySlug].id,
        summary: t.summary,
        description: t.description,
        itinerary: [
          {
            day: 1,
            title: 'Khởi hành',
            description: 'Đón khách, di chuyển và nhận phòng.',
          },
          {
            day: 2,
            title: 'Khám phá',
            description: 'Tham quan các điểm đến chính trong ngày.',
          },
        ],
        location: t.location,
        region: t.region,
        durationDays: t.durationDays,
        durationNights: t.durationNights,
        basePrice: t.basePrice,
        discountPrice: t.discountPrice,
        maxGuests: t.maxGuests,
        thumbnailUrl,
        status: 'PUBLISHED',
        isFeatured: t.isFeatured ?? false,
        createdById: admin.id,
      },
    });

    const existingImages = await prisma.tourImage.count({
      where: { tourId: tour.id },
    });
    if (existingImages === 0) {
      await prisma.tourImage.createMany({
        data: [0, 1, 2].map((i) => ({
          tourId: tour.id,
          url: `https://picsum.photos/seed/${t.slug}-${i}/1200/800`,
          sortOrder: i,
        })),
      });
    }

    const existingDepartures = await prisma.departure.count({
      where: { tourId: tour.id },
    });
    if (existingDepartures === 0) {
      await prisma.departure.createMany({
        data: [
          {
            tourId: tour.id,
            departureDate: daysFromNow(14),
            returnDate: daysFromNow(14 + t.durationDays - 1),
            totalSlots: t.maxGuests,
            bookedSlots: Math.floor(t.maxGuests * 0.3),
          },
          {
            tourId: tour.id,
            departureDate: daysFromNow(35),
            returnDate: daysFromNow(35 + t.durationDays - 1),
            totalSlots: t.maxGuests,
          },
        ],
      });
    }
  }

  const blogPostsData = [
    {
      title: 'Kinh nghiệm du lịch Phú Quốc từ A đến Z',
      slug: 'kinh-nghiem-du-lich-phu-quoc',
      region: 'MIEN_NAM' as const,
      relatedSlugs: ['phu-quoc-kham-pha-dao-ngoc'],
      excerpt:
        'Nên đi Phú Quốc mùa nào, ăn gì, chơi gì và những lưu ý quan trọng trước khi lên đường.',
      content: `## Nên đi Phú Quốc vào mùa nào?

Phú Quốc đẹp nhất từ tháng 11 đến tháng 4 — mùa khô, ít mưa, biển lặng, rất thích hợp để tắm biển và lặn ngắm san hô.

## Những trải nghiệm không thể bỏ lỡ

- Lặn ngắm san hô ở Hòn Móng Tay
- Tắm biển Bãi Sao — bãi biển đẹp bậc nhất Việt Nam
- Dạo chợ đêm Dinh Cậu, thưởng thức hải sản tươi sống
- Cáp treo Hòn Thơm — tuyến cáp treo vượt biển dài nhất thế giới

## Lưu ý khi đi

Nhớ mang kem chống nắng, mũ rộng vành và đặt phòng/tour trước ít nhất 2 tuần vào mùa cao điểm.`,
      coverImageUrl:
        'https://picsum.photos/seed/blog-phu-quoc/1200/700',
    },
    {
      title: 'Sổ tay du lịch miền Bắc: Hạ Long, Sa Pa nên đi đâu trước?',
      slug: 'so-tay-du-lich-mien-bac',
      region: 'MIEN_BAC' as const,
      relatedSlugs: ['vinh-ha-long-du-thuyen', 'sa-pa-san-may-fansipan'],
      excerpt:
        'So sánh trải nghiệm giữa Vịnh Hạ Long và Sa Pa để chọn hành trình phù hợp với bạn.',
      content: `## Hạ Long hay Sa Pa?

Nếu thích biển đảo và nghỉ dưỡng trên du thuyền, chọn **Vịnh Hạ Long**. Nếu thích khí hậu se lạnh, săn mây và trekking, chọn **Sa Pa**.

## Vịnh Hạ Long

Du thuyền 5 sao giữa hàng nghìn đảo đá vôi, chèo kayak khám phá hang động — trải nghiệm nghỉ dưỡng đẳng cấp.

## Sa Pa

Chinh phục Fansipan bằng cáp treo, dạo bản Cát Cát, thưởng thức đặc sản vùng cao Tây Bắc trong tiết trời se lạnh.

## Gợi ý lịch trình

Nếu có 5-6 ngày, bạn hoàn toàn có thể kết hợp cả hai điểm đến trong một chuyến đi miền Bắc.`,
      coverImageUrl: 'https://picsum.photos/seed/blog-mien-bac/1200/700',
    },
    {
      title: 'Cẩm nang khám phá miền Trung: Huế, Hội An trong 4 ngày',
      slug: 'cam-nang-kham-pha-mien-trung',
      region: 'MIEN_TRUNG' as const,
      relatedSlugs: ['hue-co-do-di-san', 'hoi-an-pho-co-den-long'],
      excerpt:
        'Lịch trình 4 ngày khám phá cố đô Huế và phố cổ Hội An dành cho người lần đầu đến miền Trung.',
      content: `## Ngày 1-2: Huế

Tham quan Đại Nội, các lăng tẩm triều Nguyễn và du thuyền sông Hương nghe ca Huế vào buổi tối.

## Ngày 3-4: Hội An

Di chuyển đến Hội An, dạo phố cổ về đêm, thả hoa đăng sông Hoài và trải nghiệm làm nông dân tại làng rau Trà Quế.

## Ẩm thực nên thử

Bún bò Huế, cơm hến, cao lầu, mì Quảng — mỗi món đều mang một câu chuyện văn hoá riêng của miền Trung.`,
      coverImageUrl: 'https://picsum.photos/seed/blog-mien-trung/1200/700',
    },
  ];

  for (const p of blogPostsData) {
    const relatedTours = await prisma.tour.findMany({
      where: { slug: { in: p.relatedSlugs } },
      select: { id: true },
    });

    await prisma.blogPost.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        content: p.content,
        coverImageUrl: p.coverImageUrl,
        region: p.region,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        authorId: admin.id,
        relatedTours: { connect: relatedTours.map((t) => ({ id: t.id })) },
      },
    });
  }

  console.log(
    'Seed hoàn tất: 1 admin, 3 danh mục, 6 tour, mỗi tour 3 ảnh + 2 đợt khởi hành, 3 bài cẩm nang.',
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
