/*
  Warnings:

  - The values [BASIC,PRO] on the enum `SubscriptionType` will be removed. If these variants are still used in the database, this will fail.
  - The values [BASIC,PRO] on the enum `TicketTier` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionType_new" AS ENUM ('STANDARD', 'PREMIUM');
ALTER TABLE "subscriptions" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "subscriptions" ALTER COLUMN "type" TYPE "SubscriptionType_new" USING ("type"::text::"SubscriptionType_new");
ALTER TYPE "SubscriptionType" RENAME TO "SubscriptionType_old";
ALTER TYPE "SubscriptionType_new" RENAME TO "SubscriptionType";
DROP TYPE "SubscriptionType_old";
ALTER TABLE "subscriptions" ALTER COLUMN "type" SET DEFAULT 'STANDARD';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "TicketTier_new" AS ENUM ('FREE', 'STANDARD', 'PREMIUM');
ALTER TABLE "tickets" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "tickets" ALTER COLUMN "tier" TYPE "TicketTier_new" USING ("tier"::text::"TicketTier_new");
ALTER TYPE "TicketTier" RENAME TO "TicketTier_old";
ALTER TYPE "TicketTier_new" RENAME TO "TicketTier";
DROP TYPE "TicketTier_old";
ALTER TABLE "tickets" ALTER COLUMN "tier" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "type" SET DEFAULT 'STANDARD';
