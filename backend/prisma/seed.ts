import 'dotenv/config'

import { PrismaPg } from '@prisma/adapter-pg'
import * as argon2 from 'argon2'

import { PrismaClient } from '../generated/prisma/client'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

async function main() {
  const adminPasswordHash = await argon2.hash('Admin123!23')
  const admin = await prisma.user.upsert({
    where: { email: 'admin@vivugo.vn' },
    update: {},
    create: {
      email: 'admin@vivugo.vn',
      passwordHash: adminPasswordHash,
      fullName: 'VivuGo Admin',
      role: 'ADMIN',
    },
  })

  const categoriesData = [
    { name: 'Biển đảo', slug: 'bien-dao', description: 'Nắng, cát và biển xanh' },
    { name: 'Núi rừng', slug: 'nui-rung', description: 'Săn mây, trekking, khí hậu se lạnh' },
    { name: 'Văn hoá & lịch sử', slug: 'van-hoa-lich-su', description: 'Di sản, phố cổ, cố đô' },
  ]

  const categories: Record<string, { id: string }> = {}
  for (const c of categoriesData) {
    categories[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    })
  }

  const toursData = [
    {
      title: 'Phú Quốc — Khám phá đảo Ngọc',
      slug: 'phu-quoc-kham-pha-dao-ngoc',
      categorySlug: 'bien-dao',
      summary: 'Lặn ngắm san hô, tắm biển Bãi Sao, khám phá làng chài Hàm Ninh.',
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
      summary: 'Du thuyền 5 sao, chèo kayak, lặn ngắm san hô giữa hàng nghìn đảo đá vôi.',
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
      summary: 'Chinh phục nóc nhà Đông Dương bằng cáp treo, khám phá bản Cát Cát.',
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
      summary: 'Đại Nội, lăng tẩm triều Nguyễn, du thuyền sông Hương nghe ca Huế.',
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
      summary: 'Phố cổ về đêm, thả hoa đăng sông Hoài, làng rau Trà Quế.',
      description:
        '2 ngày 1 đêm dạo phố cổ Hội An lung linh ánh đèn lồng, thả hoa đăng sông Hoài và trải nghiệm làm nông dân tại làng rau Trà Quế.',
      location: 'Quảng Nam',
      durationDays: 2,
      durationNights: 1,
      basePrice: 2590000,
      maxGuests: 20,
    },
  ]

  for (const t of toursData) {
    const thumbnailUrl = `https://picsum.photos/seed/${t.slug}/800/600`

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
          { day: 1, title: 'Khởi hành', description: 'Đón khách, di chuyển và nhận phòng.' },
          { day: 2, title: 'Khám phá', description: 'Tham quan các điểm đến chính trong ngày.' },
        ],
        location: t.location,
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
    })

    const existingImages = await prisma.tourImage.count({ where: { tourId: tour.id } })
    if (existingImages === 0) {
      await prisma.tourImage.createMany({
        data: [0, 1, 2].map((i) => ({
          tourId: tour.id,
          url: `https://picsum.photos/seed/${t.slug}-${i}/1200/800`,
          sortOrder: i,
        })),
      })
    }

    const existingDepartures = await prisma.departure.count({ where: { tourId: tour.id } })
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
      })
    }
  }

  console.log('Seed hoàn tất: 1 admin, 3 danh mục, 6 tour, mỗi tour 3 ảnh + 2 đợt khởi hành.')
}

main()
  .catch((e: unknown) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
