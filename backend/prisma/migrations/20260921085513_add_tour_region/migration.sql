-- CreateEnum
CREATE TYPE "Region" AS ENUM ('MIEN_BAC', 'MIEN_TRUNG', 'TAY_NGUYEN', 'MIEN_NAM');

-- AlterTable (nullable first so existing rows can be backfilled)
ALTER TABLE "tours" ADD COLUMN     "region" "Region";

-- Backfill existing seeded tours by slug
UPDATE "tours" SET "region" = 'MIEN_NAM' WHERE "slug" = 'phu-quoc-kham-pha-dao-ngoc';
UPDATE "tours" SET "region" = 'MIEN_BAC' WHERE "slug" = 'vinh-ha-long-du-thuyen';
UPDATE "tours" SET "region" = 'MIEN_BAC' WHERE "slug" = 'sa-pa-san-may-fansipan';
UPDATE "tours" SET "region" = 'TAY_NGUYEN' WHERE "slug" = 'da-lat-thanh-pho-ngan-hoa';
UPDATE "tours" SET "region" = 'MIEN_TRUNG' WHERE "slug" = 'hue-co-do-di-san';
UPDATE "tours" SET "region" = 'MIEN_TRUNG' WHERE "slug" = 'hoi-an-pho-co-den-long';

-- Any other pre-existing rows (e.g. from manual/e2e testing) default to Mien Nam
UPDATE "tours" SET "region" = 'MIEN_NAM' WHERE "region" IS NULL;

-- Now enforce NOT NULL
ALTER TABLE "tours" ALTER COLUMN "region" SET NOT NULL;

-- CreateIndex
CREATE INDEX "tours_region_idx" ON "tours"("region");
