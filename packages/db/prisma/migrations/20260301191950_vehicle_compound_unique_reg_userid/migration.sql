/*
  Warnings:

  - A unique constraint covering the columns `[registrationNumber,userId]` on the table `vehicles` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "vehicles_registrationNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registrationNumber_userId_key" ON "vehicles"("registrationNumber", "userId");
