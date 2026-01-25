-- CreateEnum
CREATE TYPE "IssuerAutomationStatus" AS ENUM ('LEARNING', 'PENDING_REVIEW', 'VERIFIED', 'NEEDS_HUMAN_HELP', 'FAILED');

-- CreateTable
CREATE TABLE "issuer_automations" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "challengeUrl" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "screenshots" JSONB NOT NULL DEFAULT '[]',
    "status" "IssuerAutomationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "needsAccount" BOOLEAN NOT NULL DEFAULT false,
    "captchaType" TEXT,
    "lastVerified" TIMESTAMP(3),
    "lastFailed" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issuer_automations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "issuer_automations_issuerId_key" ON "issuer_automations"("issuerId");
