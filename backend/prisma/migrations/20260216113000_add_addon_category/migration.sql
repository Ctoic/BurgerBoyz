-- AlterTable
ALTER TABLE "AddOn" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "AddOn_categoryId_idx" ON "AddOn"("categoryId");

-- AddForeignKey
ALTER TABLE "AddOn"
ADD CONSTRAINT "AddOn_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "MenuCategory"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
