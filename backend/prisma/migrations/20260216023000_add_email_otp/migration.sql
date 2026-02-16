-- CreateEnum
CREATE TYPE "EmailOtpPurpose" AS ENUM ('CUSTOMER_SIGNUP');

-- CreateTable
CREATE TABLE "EmailOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "purpose" "EmailOtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_createdAt_idx" ON "EmailOtp"("email", "purpose", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EmailOtp_email_purpose_usedAt_expiresAt_idx" ON "EmailOtp"("email", "purpose", "usedAt", "expiresAt");

-- AddForeignKey
ALTER TABLE "EmailOtp" ADD CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
