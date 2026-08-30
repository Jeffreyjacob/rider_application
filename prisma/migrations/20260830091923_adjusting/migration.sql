-- AlterTable
ALTER TABLE "PasswordResetToken" ADD COLUMN     "replaceByTokenId" TEXT;

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_tokenHash_idx" ON "PasswordResetToken"("userId", "tokenHash");
