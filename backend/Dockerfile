# ---- build ----
FROM node:24-alpine AS builder
WORKDIR /app

# argon2 là native module — cần toolchain build kể cả khi không có prebuilt cho musl (alpine).
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
# generated/prisma không commit vào git (xem .gitignore) — phải sinh lại ở build time.
RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci --omit=dev
RUN apk del python3 make g++

# tsconfig không set rootDir riêng nên tsc gộp cả src/, generated/, prisma/
# vào chung 1 cây dưới dist/ (dist/src, dist/generated, dist/prisma) — chỉ
# cần copy dist/ là đủ, không cần copy generated/prisma/ nguồn (.ts) riêng.
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/src/main"]
