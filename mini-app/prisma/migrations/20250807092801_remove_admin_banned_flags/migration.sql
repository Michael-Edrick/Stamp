/*
  Warnings:

  - You are about to drop the column `displayName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `fid` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `pfpUrl` on the `User` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "User_fid_key";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "displayName",
DROP COLUMN "fid",
DROP COLUMN "pfpUrl";
