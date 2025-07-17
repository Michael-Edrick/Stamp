-- AlterTable
ALTER TABLE "User" ADD COLUMN     "premiumCost" INTEGER DEFAULT 5,
ADD COLUMN     "standardCost" INTEGER DEFAULT 1,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
