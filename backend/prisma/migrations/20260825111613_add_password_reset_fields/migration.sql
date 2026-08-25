-- AlterTable
ALTER TABLE "users" ADD COLUMN     "resetPasswordExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_resetPasswordTokenHash_key" ON "users"("resetPasswordTokenHash");
