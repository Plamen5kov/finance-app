-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION,
    "costBasis" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSnapshot" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "price" DOUBLE PRECISION,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "categoryId" TEXT NOT NULL,
    "merchant" TEXT,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "color" TEXT,
    "predefined" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3),
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recurringPeriod" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'active',
    "description" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "monthlyIncome" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllocationPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationPlanItem" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AllocationPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualAllocation" (
    "id" TEXT NOT NULL,
    "allocationPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" TEXT,
    "categoryId" TEXT,
    "type" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "plannedAmount" DOUBLE PRECISION NOT NULL,
    "actualAmount" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActualAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoalSnapshot" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3),
    "balanceAsOf" DOUBLE PRECISION NOT NULL,
    "allocatedThisMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualSavedThisMonth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "projectedCompletionDate" TIMESTAMP(3),
    "onTrack" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "parseStatus" TEXT NOT NULL DEFAULT 'pending',
    "parseError" TEXT,
    "metadata" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parsedAt" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "date" TIMESTAMP(3) NOT NULL,
    "merchant" TEXT,
    "description" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxInfo" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "country" TEXT NOT NULL,
    "annualSalary" DOUBLE PRECISION,
    "monthlyIncome" DOUBLE PRECISION,
    "freeLanceIncome" DOUBLE PRECISION,
    "stateSocialInsurance" DOUBLE PRECISION,
    "supplementaryPension" DOUBLE PRECISION,
    "healthInsurance" DOUBLE PRECISION,
    "incomeTaxRate" DOUBLE PRECISION,
    "recognizedExpensesRate" DOUBLE PRECISION,
    "totalContributions" DOUBLE PRECISION,
    "taxableIncome" DOUBLE PRECISION,
    "totalTaxLiability" DOUBLE PRECISION,
    "taxPaidToDate" DOUBLE PRECISION,
    "taxRefundDue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "TaxInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Asset_userId_idx" ON "Asset"("userId");

-- CreateIndex
CREATE INDEX "Asset_type_idx" ON "Asset"("type");

-- CreateIndex
CREATE INDEX "AssetSnapshot_assetId_idx" ON "AssetSnapshot"("assetId");

-- CreateIndex
CREATE INDEX "AssetSnapshot_capturedAt_idx" ON "AssetSnapshot"("capturedAt");

-- CreateIndex
CREATE INDEX "Expense_userId_idx" ON "Expense"("userId");

-- CreateIndex
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "ExpenseCategory_userId_idx" ON "ExpenseCategory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_userId_name_key" ON "ExpenseCategory"("userId", "name");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_status_idx" ON "Goal"("status");

-- CreateIndex
CREATE INDEX "Goal_recurringPeriod_idx" ON "Goal"("recurringPeriod");

-- CreateIndex
CREATE INDEX "AllocationPlan_userId_idx" ON "AllocationPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AllocationPlan_userId_month_key" ON "AllocationPlan"("userId", "month");

-- CreateIndex
CREATE INDEX "AllocationPlanItem_planId_idx" ON "AllocationPlanItem"("planId");

-- CreateIndex
CREATE INDEX "AllocationPlanItem_goalId_idx" ON "AllocationPlanItem"("goalId");

-- CreateIndex
CREATE INDEX "ActualAllocation_userId_idx" ON "ActualAllocation"("userId");

-- CreateIndex
CREATE INDEX "ActualAllocation_month_idx" ON "ActualAllocation"("month");

-- CreateIndex
CREATE INDEX "ActualAllocation_goalId_idx" ON "ActualAllocation"("goalId");

-- CreateIndex
CREATE INDEX "ActualAllocation_categoryId_idx" ON "ActualAllocation"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ActualAllocation_userId_goalId_month_key" ON "ActualAllocation"("userId", "goalId", "month");

-- CreateIndex
CREATE INDEX "GoalSnapshot_goalId_idx" ON "GoalSnapshot"("goalId");

-- CreateIndex
CREATE INDEX "GoalSnapshot_month_idx" ON "GoalSnapshot"("month");

-- CreateIndex
CREATE INDEX "GoalSnapshot_onTrack_idx" ON "GoalSnapshot"("onTrack");

-- CreateIndex
CREATE UNIQUE INDEX "GoalSnapshot_goalId_month_key" ON "GoalSnapshot"("goalId", "month");

-- CreateIndex
CREATE INDEX "Document_userId_idx" ON "Document"("userId");

-- CreateIndex
CREATE INDEX "Document_uploadedAt_idx" ON "Document"("uploadedAt");

-- CreateIndex
CREATE INDEX "Transaction_documentId_idx" ON "Transaction"("documentId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "TaxInfo_userId_idx" ON "TaxInfo"("userId");

-- CreateIndex
CREATE INDEX "TaxInfo_taxYear_idx" ON "TaxInfo"("taxYear");

-- CreateIndex
CREATE UNIQUE INDEX "TaxInfo_userId_taxYear_key" ON "TaxInfo"("userId", "taxYear");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSnapshot" ADD CONSTRAINT "AssetSnapshot_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationPlan" ADD CONSTRAINT "AllocationPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationPlanItem" ADD CONSTRAINT "AllocationPlanItem_planId_fkey" FOREIGN KEY ("planId") REFERENCES "AllocationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllocationPlanItem" ADD CONSTRAINT "AllocationPlanItem_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualAllocation" ADD CONSTRAINT "ActualAllocation_allocationPlanId_fkey" FOREIGN KEY ("allocationPlanId") REFERENCES "AllocationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualAllocation" ADD CONSTRAINT "ActualAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualAllocation" ADD CONSTRAINT "ActualAllocation_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualAllocation" ADD CONSTRAINT "ActualAllocation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalSnapshot" ADD CONSTRAINT "GoalSnapshot_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxInfo" ADD CONSTRAINT "TaxInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
