/*
  Warnings:

  - Added the required column `extractedText` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "extractedText" TEXT NOT NULL;
