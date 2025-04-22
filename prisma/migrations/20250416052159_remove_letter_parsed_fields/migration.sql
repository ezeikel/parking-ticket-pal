/*
  Warnings:

  - You are about to drop the column `parsedAmount` on the `letters` table. All the data in the column will be lost.
  - You are about to drop the column `parsedAt` on the `letters` table. All the data in the column will be lost.
  - You are about to drop the column `parsedStatus` on the `letters` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "letters" DROP COLUMN "parsedAmount",
DROP COLUMN "parsedAt",
DROP COLUMN "parsedStatus";
