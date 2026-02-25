/*
  Warnings:

  - The values [STANDARD] on the enum `TicketTier` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `subscriptions` table. If the table is not empty, all the data it contains will be lost.

*/
-- Migrate any STANDARD tickets to FREE before removing the enum value
UPDATE "tickets" SET "tier" = 'FREE' WHERE "tier" = 'STANDARD';
UPDATE "pending_tickets" SET "tier" = 'FREE' WHERE "tier" = 'STANDARD';

-- AlterEnum
BEGIN;
CREATE TYPE "TicketTier_new" AS ENUM ('FREE', 'PREMIUM');
ALTER TABLE "public"."tickets" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "tier" TYPE "TicketTier_new" USING ("tier"::text::"TicketTier_new");
ALTER TABLE "pending_tickets" ALTER COLUMN "tier" TYPE "TicketTier_new" USING ("tier"::text::"TicketTier_new");
ALTER TYPE "TicketTier" RENAME TO "TicketTier_old";
ALTER TYPE "TicketTier_new" RENAME TO "TicketTier";
DROP TYPE "public"."TicketTier_old";
ALTER TABLE "tickets" ALTER COLUMN "tier" SET DEFAULT 'FREE';
COMMIT;

-- DropForeignKey
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastPremiumPurchaseAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "subscriptions";

-- DropEnum
DROP TYPE "SubscriptionSource";

-- DropEnum
DROP TYPE "SubscriptionType";
