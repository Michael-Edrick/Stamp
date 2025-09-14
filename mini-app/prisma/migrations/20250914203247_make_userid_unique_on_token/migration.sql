/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `NotificationToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "NotificationToken_userId_key" ON "NotificationToken"("userId");
