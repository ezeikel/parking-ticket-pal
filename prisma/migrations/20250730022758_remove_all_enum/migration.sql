/*
  Warnings:

  - The values [ALL] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."NotificationType_new" AS ENUM ('EMAIL', 'SMS');
ALTER TABLE "public"."reminders" ALTER COLUMN "notificationType" DROP DEFAULT;
ALTER TABLE "public"."reminders" ALTER COLUMN "notificationType" TYPE "public"."NotificationType_new" USING ("notificationType"::text::"public"."NotificationType_new");
ALTER TYPE "public"."NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "public"."NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
ALTER TABLE "public"."reminders" ALTER COLUMN "notificationType" SET DEFAULT 'EMAIL';
COMMIT;
