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

## Chạy bằng Docker

Cần Docker Desktop (kèm Docker Compose). Chạy toàn bộ 3 thành phần (Postgres, backend, frontend) cùng lúc:

```bash
cp backend/.env.example backend/.env   # điền JWT secrets thật (DATABASE_URL sẽ bị compose ghi đè, không cần sửa)
docker compose up --build              # lần đầu, hoặc sau khi đổi Dockerfile/dependencies

# Lần đầu tiên (hoặc sau khi thêm migration mới), áp migration vào DB trong container:
docker compose run --rm backend-migrate

# Tuỳ chọn: nạp dữ liệu mẫu (admin@vivugo.vn / Admin123!23, tour, cẩm nang, bộ sưu tập)
docker compose run --rm backend-migrate npx tsx prisma/seed.ts
```

Trước khi chạy, tắt các dev server local đang giữ port 3000/5173 (và lưu ý Postgres cài sẵn trên máy cũng dùng port 5432 — nếu bị trùng, đổi cổng host trong `docker-compose.yml`, VD `'5433:5432'`).

- Frontend: http://localhost:5173 (nginx, tự proxy `/api` và `/ws` sang backend — không cần sửa code khi chuyển từ Vite dev sang Docker)
- Backend: http://localhost:3000/api
- Postgres: `localhost:5432`, user/pass/db mặc định đều là `vivugo` (đổi qua biến `POSTGRES_PASSWORD` nếu cần)

Lưu ý: `backend/Dockerfile` build 2 giai đoạn — `builder` cài `devDependencies`, chạy `prisma generate` (thư mục `generated/` không commit vào git, xem `.gitignore`) rồi `nest build`; `runner` chỉ cài dependency production. Entry point thật sau khi build là `dist/src/main.js` (không phải `dist/main.js`) vì `tsconfig` không set `rootDir` riêng nên `tsc` gộp cả `src/`, `generated/`, `prisma.config.ts` vào chung 1 cây dưới `dist/` — `npm run start:prod` và `Dockerfile` đều đã trỏ đúng đường dẫn này.

Dừng và xoá toàn bộ (kể cả volume Postgres):

```bash
docker compose down -v
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

## Ghi chú bảo mật

- **Access token chỉ lưu trong bộ nhớ (Zustand store), không ghi vào `localStorage`/`sessionStorage`.** Đây là lựa chọn chủ đích: mã độc chèn qua lỗ hổng XSS không thể đọc token từ storage bền như thường thấy ở các app lưu JWT vào `localStorage`. Refresh token đi kèm nằm trong cookie `httpOnly` (JS không đọc được), gửi kèm mỗi request nhờ `withCredentials: true`.
- Đánh đổi thật sự **không phải** "mất phiên khi tải lại trang" — `App.tsx` tự gọi `POST /auth/refresh` ngay khi khởi động app, dùng cookie `httpOnly` để lấy access token mới trong lúc hiển thị trạng thái "Đang tải…" (`isHydrating`), nên trải nghiệm người dùng liền mạch. Đánh đổi thật sự là: access token sống ngắn (mặc định 15 phút, `JWT_ACCESS_EXPIRES_IN`) nên toàn bộ phiên đăng nhập phụ thuộc vào cookie `httpOnly` còn hiệu lực (mặc định 7 ngày, `JWT_REFRESH_EXPIRES_IN`) — mất cookie (xoá cookie thủ công, hết hạn, đổi trình duyệt/thiết bị) thì mới phải đăng nhập lại thật sự.

## Trạng thái roadmap

- [x] Giai đoạn 1 — Thiết kế hệ thống
- [x] Giai đoạn 2 — Khởi tạo nền tảng (Frontend, Backend, kết nối DB)
- [x] Giai đoạn 3 — Nghiệp vụ cốt lõi (Auth, Tours/Booking/Payment VNPay, Reviews/Favorites, Blog, Bộ sưu tập, User/Admin Dashboard, Notifications, Chat real-time + chào tự động, Audit log)
- [x] Giai đoạn 4 — Chất lượng & bảo mật (code-splitting bundle Admin, unit test cho VnpayService/promo.util/AuditLogInterceptor, security review toàn bộ diff — không phát hiện lỗ hổng)
- [ ] Giai đoạn 5 — Vận hành (Docker, CI/CD, deploy production, tài khoản VNPay thật)
