/*
  Warnings:

  - The values [APPEAL] on the enum `ReminderType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `notificaticationType` on the `reminders` table. All the data in the column will be lost.
  - Added the required column `sendAt` to the `reminders` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'ALL';

-- AlterEnum
BEGIN;
CREATE TYPE "ReminderType_new" AS ENUM ('REDUCED_PAYMENT_DUE', 'FULL_PAYMENT_DUE', 'APPEAL_DEADLINE', 'NOTICE_TO_OWNER_RESPONSE', 'CHARGE_CERTIFICATE_RESPONSE', 'FORM_DEADLINE', 'OUT_OF_TIME_NOTICE');
ALTER TABLE "reminders" ALTER COLUMN "type" TYPE "ReminderType_new" USING ("type"::text::"ReminderType_new");
ALTER TYPE "ReminderType" RENAME TO "ReminderType_old";
ALTER TYPE "ReminderType_new" RENAME TO "ReminderType";
DROP TYPE "ReminderType_old";
COMMIT;

-- AlterTable
ALTER TABLE "forms" ADD COLUMN     "dueAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reminders" DROP COLUMN "notificaticationType",
ADD COLUMN     "notificationType" "NotificationType" DEFAULT 'EMAIL',
ADD COLUMN     "sendAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "reminders_ticketId_sendAt_idx" ON "reminders"("ticketId", "sendAt");
