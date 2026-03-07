-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'My Household',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- Add householdId to all data-owning models
ALTER TABLE "Asset" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "Liability" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "Expense" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "ExpenseCategory" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "MerchantCategoryMap" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "Goal" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "AllocationPlan" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "ActualAllocation" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "Document" ADD COLUMN "householdId" TEXT NOT NULL;
ALTER TABLE "TaxInfo" ADD COLUMN "householdId" TEXT NOT NULL;

-- Drop old unique constraints (userId-scoped)
ALTER TABLE "ExpenseCategory" DROP CONSTRAINT "ExpenseCategory_userId_name_key";
ALTER TABLE "MerchantCategoryMap" DROP CONSTRAINT "MerchantCategoryMap_userId_merchant_key";
ALTER TABLE "AllocationPlan" DROP CONSTRAINT "AllocationPlan_userId_month_key";
ALTER TABLE "ActualAllocation" DROP CONSTRAINT "ActualAllocation_userId_goalId_month_key";
ALTER TABLE "TaxInfo" DROP CONSTRAINT "TaxInfo_userId_taxYear_key";

-- Create new unique constraints (householdId-scoped)
CREATE UNIQUE INDEX "HouseholdMember_userId_householdId_key" ON "HouseholdMember"("userId", "householdId");
CREATE UNIQUE INDEX "ExpenseCategory_householdId_name_key" ON "ExpenseCategory"("householdId", "name");
CREATE UNIQUE INDEX "MerchantCategoryMap_householdId_merchant_key" ON "MerchantCategoryMap"("householdId", "merchant");
CREATE UNIQUE INDEX "AllocationPlan_householdId_month_key" ON "AllocationPlan"("householdId", "month");
CREATE UNIQUE INDEX "ActualAllocation_householdId_goalId_month_key" ON "ActualAllocation"("householdId", "goalId", "month");
CREATE UNIQUE INDEX "TaxInfo_householdId_taxYear_key" ON "TaxInfo"("householdId", "taxYear");

-- Create indexes
CREATE INDEX "HouseholdMember_userId_idx" ON "HouseholdMember"("userId");
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");
CREATE INDEX "Asset_householdId_idx" ON "Asset"("householdId");
CREATE INDEX "Liability_householdId_idx" ON "Liability"("householdId");
CREATE INDEX "Expense_householdId_idx" ON "Expense"("householdId");
CREATE INDEX "ExpenseCategory_householdId_idx" ON "ExpenseCategory"("householdId");
CREATE INDEX "MerchantCategoryMap_householdId_idx" ON "MerchantCategoryMap"("householdId");
CREATE INDEX "Goal_householdId_idx" ON "Goal"("householdId");
CREATE INDEX "AllocationPlan_householdId_idx" ON "AllocationPlan"("householdId");
CREATE INDEX "ActualAllocation_householdId_idx" ON "ActualAllocation"("householdId");
CREATE INDEX "Document_householdId_idx" ON "Document"("householdId");
CREATE INDEX "TaxInfo_householdId_idx" ON "TaxInfo"("householdId");

-- Add foreign keys
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Liability" ADD CONSTRAINT "Liability_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MerchantCategoryMap" ADD CONSTRAINT "MerchantCategoryMap_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AllocationPlan" ADD CONSTRAINT "AllocationPlan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActualAllocation" ADD CONSTRAINT "ActualAllocation_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document" ADD CONSTRAINT "Document_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaxInfo" ADD CONSTRAINT "TaxInfo_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
