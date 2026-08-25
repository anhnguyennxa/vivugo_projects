# VivuGo

Nền tảng đặt tour & hoạt động du lịch trực tuyến. Xem bản thiết kế đầy đủ (sitemap, ERD, API spec, UI/UX) trong artifact **VivuGo Blueprint** đã chốt ở Phase 1.

## Cấu trúc

```
frontend/   React + TypeScript + Vite + Tailwind v4 + shadcn/ui (thủ công)
backend/    NestJS + Prisma 7 (driver adapter pg) + PostgreSQL
```

## Chạy dự án (development)

**Backend**

```bash
cd backend
cp .env.example .env   # điền DATABASE_URL, JWT secrets thật
npm run start:dev      # http://localhost:3000/api
```

**Frontend**

```bash
cd frontend
npm run dev             # http://localhost:5173, proxy /api -> :3000
```

## Database

PostgreSQL 17 chạy local. Role/DB riêng `vivugo` (không dùng chung với superuser `postgres`). Schema tại `backend/prisma/schema.prisma`, migration đầu tiên `20260825032943_init` đã áp dụng.

```bash
cd backend
npx prisma migrate dev   # tạo/áp dụng migration mới sau khi sửa schema
npx prisma studio        # xem dữ liệu trực quan
```

## Ghi chú kỹ thuật (Phase 2)

- Prisma 7 dùng generator `prisma-client` với `moduleFormat = "cjs"` để tương thích CommonJS của NestJS, và bắt buộc driver adapter (`@prisma/adapter-pg`) — không còn tự kết nối bằng `DATABASE_URL` như Prisma 6.
- `npm audit` báo 1 lỗ hổng high (`deepmerge-ts` qua `@prisma/config`) — chỉ ảnh hưởng CLI dev-time của Prisma khi merge config lồng sâu, không chạm tới `@prisma/client` lúc runtime. Theo dõi bản vá từ Prisma, chưa cần hành động.
- `prisma init` tự sinh `.agents/skills`, `.claude/skills`, `skills-lock.json` trong `backend/` — tài liệu tham khảo chính thức của Prisma cho AI agent, có thể giữ lại hoặc xoá tuỳ ý.

## Trạng thái roadmap

- [x] Giai đoạn 1 — Thiết kế hệ thống
- [x] Giai đoạn 2 — Khởi tạo nền tảng (Frontend, Backend, kết nối DB)
- [ ] Giai đoạn 3 — Nghiệp vụ cốt lõi (Auth, Tours/Booking/Payment/Chat, Admin Dashboard)
- [ ] Giai đoạn 4 — Chất lượng & bảo mật
- [ ] Giai đoạn 5 — Vận hành (Docker, Deploy)
