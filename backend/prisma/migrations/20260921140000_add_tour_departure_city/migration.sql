-- AlterTable
ALTER TABLE "tours" ADD COLUMN     "departureCity" TEXT NOT NULL DEFAULT 'HO_CHI_MINH';

-- Backfill seeded tours by slug
UPDATE "tours" SET "departureCity" = 'HA_NOI' WHERE "slug" IN ('vinh-ha-long-du-thuyen', 'sa-pa-san-may-fansipan');
UPDATE "tours" SET "departureCity" = 'DA_NANG' WHERE "slug" IN ('hue-co-do-di-san', 'hoi-an-pho-co-den-long');

-- CreateIndex
CREATE INDEX "tours_departureCity_idx" ON "tours"("departureCity");
