-- CreateTable
CREATE TABLE "MerchantCategoryMap" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "merchant" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantCategoryMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MerchantCategoryMap_userId_idx" ON "MerchantCategoryMap"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantCategoryMap_userId_merchant_key" ON "MerchantCategoryMap"("userId", "merchant");

-- AddForeignKey
ALTER TABLE "MerchantCategoryMap" ADD CONSTRAINT "MerchantCategoryMap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantCategoryMap" ADD CONSTRAINT "MerchantCategoryMap_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
