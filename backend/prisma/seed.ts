import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';

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

  // Tài khoản hệ thống đứng tên cho tin nhắn chào tự động trong chat (xem
  // ChatService.maybeSendAutoReply) — không dùng để đăng nhập.
  await prisma.user.upsert({
    where: { email: 'bot@vivugo.vn' },
    update: {},
    create: {
      email: 'bot@vivugo.vn',
      passwordHash: await argon2.hash(randomUUID()),
      fullName: 'VivuGo',
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
      departureCity: 'HO_CHI_MINH',
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
      departureCity: 'HA_NOI',
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
      departureCity: 'HA_NOI',
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
      departureCity: 'HO_CHI_MINH',
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
      departureCity: 'DA_NANG',
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
      departureCity: 'DA_NANG',
      summary: 'Phố cổ về đêm, thả hoa đăng sông Hoài, làng rau Trà Quế.',
      description:
        '2 ngày 1 đêm dạo phố cổ Hội An lung linh ánh đèn lồng, thả hoa đăng sông Hoài và trải nghiệm làm nông dân tại làng rau Trà Quế.',
      location: 'Quảng Nam',
      durationDays: 2,
      durationNights: 1,
      basePrice: 2590000,
      maxGuests: 20,
    },
    {
      title: 'Nha Trang — Biển xanh, đảo ngọc',
      slug: 'nha-trang-bien-xanh-dao-ngoc',
      categorySlug: 'bien-dao',
      region: 'MIEN_TRUNG' as const,
      departureCity: 'DA_NANG',
      summary: 'Tour 4 đảo, tắm bùn khoáng, Vinpearl và hải sản Nha Trang.',
      description:
        '3 ngày 2 đêm khám phá Nha Trang: tour 4 đảo bằng cano, lặn ngắm san hô, tắm bùn khoáng nóng và thưởng thức hải sản tươi sống.',
      location: 'Khánh Hoà',
      durationDays: 3,
      durationNights: 2,
      basePrice: 3990000,
      discountPrice: 3490000,
      maxGuests: 25,
      isFeatured: true,
    },
    {
      title: 'Ninh Bình — Tràng An, Tam Cốc',
      slug: 'ninh-binh-trang-an-tam-coc',
      categorySlug: 'van-hoa-lich-su',
      region: 'MIEN_BAC' as const,
      departureCity: 'HA_NOI',
      summary: 'Ngồi thuyền Tràng An, Tam Cốc, cố đô Hoa Lư và chùa Bái Đính.',
      description:
        '2 ngày 1 đêm ngồi thuyền xuyên hang động Tràng An, ngắm lúa chín Tam Cốc, viếng cố đô Hoa Lư và chùa Bái Đính.',
      location: 'Ninh Bình',
      durationDays: 2,
      durationNights: 1,
      basePrice: 1990000,
      maxGuests: 30,
    },
    {
      title: 'Hà Giang — Vòng cung Đông Bắc',
      slug: 'ha-giang-vong-cung-dong-bac',
      categorySlug: 'nui-rung',
      region: 'MIEN_BAC' as const,
      departureCity: 'HA_NOI',
      summary: 'Đèo Mã Pí Lèng, cột cờ Lũng Cú, sông Nho Quế và cao nguyên đá.',
      description:
        '4 ngày 3 đêm chinh phục cung đường Hà Giang: cổng trời Quản Bạ, cột cờ Lũng Cú, đèo Mã Pí Lèng và du thuyền sông Nho Quế.',
      location: 'Hà Giang',
      durationDays: 4,
      durationNights: 3,
      basePrice: 4590000,
      maxGuests: 16,
      isFeatured: true,
    },
    {
      title: 'Mũi Né — Đồi cát, biển và làng chài',
      slug: 'mui-ne-doi-cat-lang-chai',
      categorySlug: 'bien-dao',
      region: 'MIEN_NAM' as const,
      departureCity: 'HO_CHI_MINH',
      summary: 'Đồi cát bay, suối Tiên, làng chài Mũi Né và hải sản nướng.',
      description:
        '2 ngày 1 đêm ngắm bình minh trên đồi cát bay, lội suối Tiên, thăm làng chài Mũi Né và thưởng thức hải sản nướng bên bờ biển.',
      location: 'Bình Thuận',
      durationDays: 2,
      durationNights: 1,
      basePrice: 1890000,
      maxGuests: 30,
    },
    {
      title: 'Côn Đảo — Hành trình tâm linh',
      slug: 'con-dao-hanh-trinh-tam-linh',
      categorySlug: 'van-hoa-lich-su',
      region: 'MIEN_NAM' as const,
      departureCity: 'HO_CHI_MINH',
      summary: 'Nghĩa trang Hàng Dương, nhà tù Côn Đảo, bãi Đầm Trầu hoang sơ.',
      description:
        '3 ngày 2 đêm viếng nghĩa trang Hàng Dương, tham quan hệ thống nhà tù Côn Đảo, tắm biển Đầm Trầu và lặn ngắm san hô.',
      location: 'Bà Rịa - Vũng Tàu',
      durationDays: 3,
      durationNights: 2,
      basePrice: 5490000,
      maxGuests: 16,
    },
    {
      title: 'Miền Tây — Cần Thơ, chợ nổi Cái Răng',
      slug: 'mien-tay-can-tho-cho-noi',
      categorySlug: 'van-hoa-lich-su',
      region: 'MIEN_NAM' as const,
      departureCity: 'CAN_THO',
      summary: 'Chợ nổi Cái Răng, vườn trái cây, miệt vườn và đờn ca tài tử.',
      description:
        '2 ngày 1 đêm len lỏi chợ nổi Cái Răng lúc sáng sớm, thăm vườn trái cây miệt vườn, nghe đờn ca tài tử và đi xuồng ba lá.',
      location: 'Cần Thơ',
      durationDays: 2,
      durationNights: 1,
      basePrice: 1790000,
      maxGuests: 30,
    },
    {
      title: 'Quy Nhơn — Kỳ Co, Eo Gió',
      slug: 'quy-nhon-ky-co-eo-gio',
      categorySlug: 'bien-dao',
      region: 'MIEN_TRUNG' as const,
      departureCity: 'DA_NANG',
      summary: 'Bãi Kỳ Co nước trong vắt, Eo Gió, Tháp Đôi và Ghềnh Ráng.',
      description:
        '3 ngày 2 đêm khám phá Quy Nhơn: cano ra Kỳ Co, check-in Eo Gió, thăm Tháp Đôi Chăm Pa và ăn bánh xèo tôm nhảy.',
      location: 'Bình Định',
      durationDays: 3,
      durationNights: 2,
      basePrice: 3290000,
      maxGuests: 20,
    },
    {
      title: 'Mộc Châu — Mùa hoa và đồi chè',
      slug: 'moc-chau-mua-hoa-doi-che',
      categorySlug: 'nui-rung',
      region: 'MIEN_BAC' as const,
      departureCity: 'HA_NOI',
      summary: 'Đồi chè trái tim, rừng thông Bản Áng, thác Dải Yếm, hoa mận.',
      description:
        '2 ngày 1 đêm săn mây Mộc Châu, thăm đồi chè trái tim, rừng thông Bản Áng, thác Dải Yếm và thưởng thức sữa bò tươi, thịt bò Mộc Châu.',
      location: 'Sơn La',
      durationDays: 2,
      durationNights: 1,
      basePrice: 1690000,
      maxGuests: 30,
    },
    {
      title: 'Buôn Ma Thuột — Đại ngàn Tây Nguyên',
      slug: 'buon-ma-thuot-dai-ngan-tay-nguyen',
      categorySlug: 'nui-rung',
      region: 'TAY_NGUYEN' as const,
      departureCity: 'HO_CHI_MINH',
      summary: 'Thác Dray Nur, buôn Đôn cưỡi voi, cà phê và cồng chiêng.',
      description:
        '3 ngày 2 đêm khám phá đại ngàn Tây Nguyên: thác Dray Nur, buôn Đôn, hồ Lắk, bảo tàng Thế Giới Cà Phê và đêm lửa trại cồng chiêng.',
      location: 'Đắk Lắk',
      durationDays: 3,
      durationNights: 2,
      basePrice: 3190000,
      maxGuests: 20,
    },
    {
      title: 'Đà Nẵng — Bà Nà Hills, Cầu Vàng',
      slug: 'da-nang-ba-na-hills-cau-vang',
      categorySlug: 'van-hoa-lich-su',
      region: 'MIEN_TRUNG' as const,
      departureCity: 'DA_NANG',
      summary: 'Cầu Vàng Bà Nà, bán đảo Sơn Trà, Ngũ Hành Sơn và biển Mỹ Khê.',
      description:
        '3 ngày 2 đêm khám phá Đà Nẵng: cáp treo Bà Nà Hills và Cầu Vàng, bán đảo Sơn Trà, Ngũ Hành Sơn, biển Mỹ Khê và cầu Rồng phun lửa.',
      location: 'Đà Nẵng',
      durationDays: 3,
      durationNights: 2,
      basePrice: 3590000,
      discountPrice: 3190000,
      maxGuests: 25,
      isFeatured: true,
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
        departureCity: t.departureCity,
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

  const now = new Date();
  const collectionsData = [
    {
      title: 'Tour Tết Nguyên Đán 2027',
      slug: 'tour-tet-nguyen-dan-2027',
      description:
        'Sum vầy đón Tết cổ truyền: về cố đô, phố cổ và làng hoa những ngày xuân.',
      coverSlug: 'col-tet',
      tourSlugs: [
        'hue-co-do-di-san',
        'hoi-an-pho-co-den-long',
        'ninh-binh-trang-an-tam-coc',
        'da-lat-thanh-pho-ngan-hoa',
      ],
      startAt: new Date('2027-01-15'),
      endAt: new Date('2027-02-15'),
    },
    {
      title: 'Tour Hè rực rỡ',
      slug: 'tour-he-ruc-ro',
      description: 'Biển xanh, cát trắng, nắng vàng — trọn vẹn mùa hè trên khắp 3 miền.',
      coverSlug: 'col-he',
      tourSlugs: [
        'phu-quoc-kham-pha-dao-ngoc',
        'nha-trang-bien-xanh-dao-ngoc',
        'quy-nhon-ky-co-eo-gio',
        'mui-ne-doi-cat-lang-chai',
      ],
    },
    {
      title: 'Tour Thu vàng Tây Bắc',
      slug: 'tour-thu-vang-tay-bac',
      description: 'Săn mây, ngắm ruộng bậc thang mùa lúa chín trên cung đường Tây Bắc.',
      coverSlug: 'col-thu',
      tourSlugs: ['sa-pa-san-may-fansipan', 'ha-giang-vong-cung-dong-bac', 'moc-chau-mua-hoa-doi-che'],
      startAt: new Date(now.getFullYear(), 8, 1),
      endAt: new Date(now.getFullYear(), 10, 30),
    },
    {
      title: 'Tour Giáng sinh & Tết Dương lịch',
      slug: 'tour-giang-sinh-tet-duong-lich',
      description: 'Se lạnh cuối năm giữa đồi thông Đà Lạt, cầu Vàng Đà Nẵng và Sa Pa mờ sương.',
      coverSlug: 'col-giang-sinh',
      tourSlugs: ['da-lat-thanh-pho-ngan-hoa', 'da-nang-ba-na-hills-cau-vang', 'sa-pa-san-may-fansipan'],
      startAt: new Date(now.getFullYear(), 11, 1),
      endAt: new Date(now.getFullYear() + 1, 0, 5),
    },
    {
      title: 'Tour Đông se lạnh vùng cao',
      slug: 'tour-dong-se-lanh-vung-cao',
      description: 'Sương giăng núi rừng, chợ phiên vùng cao và cái lạnh đặc trưng miền Bắc.',
      coverSlug: 'col-dong',
      tourSlugs: ['sa-pa-san-may-fansipan', 'moc-chau-mua-hoa-doi-che', 'ha-giang-vong-cung-dong-bac'],
    },
    {
      title: 'Tour lễ 30/4 - 1/5 rực rỡ',
      slug: 'tour-le-30-4-1-5',
      description: 'Kỳ nghỉ lễ dài ngày với những điểm đến được yêu thích nhất cả nước.',
      coverSlug: 'col-le',
      tourSlugs: [
        'da-nang-ba-na-hills-cau-vang',
        'hoi-an-pho-co-den-long',
        'hue-co-do-di-san',
        'phu-quoc-kham-pha-dao-ngoc',
      ],
    },
    {
      title: 'Tour gia đình cuối tuần',
      slug: 'tour-gia-dinh-cuoi-tuan',
      description: 'Hành trình ngắn ngày, nhẹ nhàng, phù hợp cho cả gia đình có trẻ nhỏ.',
      coverSlug: 'col-gia-dinh',
      tourSlugs: [
        'ninh-binh-trang-an-tam-coc',
        'mui-ne-doi-cat-lang-chai',
        'mien-tay-can-tho-cho-noi',
        'da-lat-thanh-pho-ngan-hoa',
      ],
    },
    {
      title: 'Tour trăng mật lãng mạn',
      slug: 'tour-trang-mat-lang-man',
      description: 'Những điểm đến lãng mạn dành cho các cặp đôi mới cưới.',
      coverSlug: 'col-trang-mat',
      tourSlugs: [
        'da-lat-thanh-pho-ngan-hoa',
        'hoi-an-pho-co-den-long',
        'phu-quoc-kham-pha-dao-ngoc',
        'nha-trang-bien-xanh-dao-ngoc',
      ],
    },
    {
      title: 'Tour khám phá Tây Nguyên',
      slug: 'tour-kham-pha-tay-nguyen',
      description: 'Đại ngàn cao nguyên, cà phê và văn hoá cồng chiêng Tây Nguyên.',
      coverSlug: 'col-tay-nguyen',
      tourSlugs: ['buon-ma-thuot-dai-ngan-tay-nguyen', 'da-lat-thanh-pho-ngan-hoa'],
    },
    {
      title: 'Tour miền Tây sông nước',
      slug: 'tour-mien-tay-song-nuoc',
      description: 'Chợ nổi, miệt vườn và biển đảo phương Nam trong một hành trình.',
      coverSlug: 'col-mien-tay',
      tourSlugs: ['mien-tay-can-tho-cho-noi', 'con-dao-hanh-trinh-tam-linh', 'phu-quoc-kham-pha-dao-ngoc'],
    },
  ];

  for (const c of collectionsData) {
    const collection = await prisma.collection.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        title: c.title,
        slug: c.slug,
        description: c.description,
        coverImageUrl: `https://picsum.photos/seed/${c.coverSlug}/1200/700`,
        status: 'PUBLISHED',
        startAt: c.startAt,
        endAt: c.endAt,
        createdById: admin.id,
      },
    });

    const existingTours = await prisma.collectionTour.count({
      where: { collectionId: collection.id },
    });
    if (existingTours === 0) {
      const tours = await prisma.tour.findMany({
        where: { slug: { in: c.tourSlugs } },
        select: { id: true, slug: true },
      });
      // Giữ đúng thứ tự đã khai báo ở tourSlugs, không theo thứ tự trả về của DB.
      const orderedTours = c.tourSlugs
        .map((slug) => tours.find((t) => t.slug === slug))
        .filter((t): t is { id: string; slug: string } => !!t);

      await prisma.collectionTour.createMany({
        data: orderedTours.map((t, i) => ({
          collectionId: collection.id,
          tourId: t.id,
          sortOrder: i,
        })),
      });
    }
  }

  console.log(
    'Seed hoàn tất: 1 admin, 3 danh mục, 16 tour, 3 bài cẩm nang, 10 bộ sưu tập theo chủ đề/mùa.',
  );
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
