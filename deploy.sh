#!/usr/bin/env bash
# Chạy trên VPS tại thư mục gốc repo:  ./deploy.sh
# Kéo code mới, build lại, áp migration rồi khởi động lại dịch vụ.
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.prod"

[ -f .env.prod ] || { echo "Thiếu .env.prod (sao chép từ .env.prod.example)"; exit 1; }
[ -f backend/.env ] || { echo "Thiếu backend/.env (sao chép từ backend/.env.example, dùng secret thật)"; exit 1; }

git pull --ff-only
$COMPOSE build
$COMPOSE up -d postgres
$COMPOSE run --rm backend-migrate
$COMPOSE up -d
$COMPOSE ps
