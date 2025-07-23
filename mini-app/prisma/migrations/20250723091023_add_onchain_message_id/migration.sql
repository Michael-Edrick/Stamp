/*
  Warnings:

  - A unique constraint covering the columns `[onChainMessageId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "onChainMessageId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "Message_onChainMessageId_key" ON "Message"("onChainMessageId");

-- CreateIndex
CREATE INDEX "Message_conversationId_idx" ON "Message"("conversationId");
