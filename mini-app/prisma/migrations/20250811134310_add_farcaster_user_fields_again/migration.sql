/*
  Warnings:

  - A unique constraint covering the columns `[custodyAddress]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "custodyAddress" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "pfpUrl" TEXT,
ALTER COLUMN "walletAddress" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_custodyAddress_key" ON "public"."User"("custodyAddress");
