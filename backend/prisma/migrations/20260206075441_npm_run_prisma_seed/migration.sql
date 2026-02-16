-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
