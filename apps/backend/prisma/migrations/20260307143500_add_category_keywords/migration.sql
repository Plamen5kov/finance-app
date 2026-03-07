-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[];
