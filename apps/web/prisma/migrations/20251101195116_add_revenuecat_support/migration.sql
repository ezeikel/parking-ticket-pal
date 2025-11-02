/*
  Warnings:

  - A unique constraint covering the columns `[revenueCatSubscriptionId]` on the table `subscriptions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('STRIPE', 'REVENUECAT');

-- CreateEnum
CREATE TYPE "AppealDecision" AS ENUM ('ALLOWED', 'REFUSED', 'PARTIALLY_ALLOWED', 'WITHDRAWN', 'STRUCK_OUT');

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "revenueCatSubscriptionId" TEXT,
ADD COLUMN     "source" "SubscriptionSource" NOT NULL DEFAULT 'STRIPE';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "revenueCatCustomerId" TEXT;

-- CreateTable
CREATE TABLE "london_tribunal_cases" (
    "id" TEXT NOT NULL,
    "caseReference" TEXT NOT NULL,
    "declarant" TEXT,
    "authority" TEXT NOT NULL,
    "vrm" TEXT,
    "pcn" TEXT,
    "contraventionDate" TIMESTAMP(3),
    "contraventionTime" TEXT,
    "contraventionLocation" TEXT,
    "penaltyAmount" DECIMAL(10,2),
    "contravention" TEXT,
    "referralDate" TIMESTAMP(3),
    "decisionDate" TIMESTAMP(3),
    "adjudicator" TEXT,
    "appealDecision" "AppealDecision" NOT NULL,
    "direction" TEXT,
    "reasons" TEXT NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "london_tribunal_cases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "london_tribunal_cases_caseReference_key" ON "london_tribunal_cases"("caseReference");

-- CreateIndex
CREATE INDEX "london_tribunal_cases_authority_contravention_idx" ON "london_tribunal_cases"("authority", "contravention");

-- CreateIndex
CREATE INDEX "london_tribunal_cases_appealDecision_idx" ON "london_tribunal_cases"("appealDecision");

-- CreateIndex
CREATE INDEX "london_tribunal_cases_contraventionDate_idx" ON "london_tribunal_cases"("contraventionDate");

-- CreateIndex
CREATE INDEX "london_tribunal_cases_caseReference_idx" ON "london_tribunal_cases"("caseReference");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_revenueCatSubscriptionId_key" ON "subscriptions"("revenueCatSubscriptionId");
