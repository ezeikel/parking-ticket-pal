-- CreateEnum
CREATE TYPE "PendingIssuerStatus" AS ENUM ('GENERATING', 'PR_CREATED', 'PR_MERGED', 'FAILED');

-- CreateEnum
CREATE TYPE "PendingChallengeStatus" AS ENUM ('WAITING', 'READY', 'PROCESSED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "pending_issuers" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "issuerWebsite" TEXT,
    "prUrl" TEXT,
    "prNumber" INTEGER,
    "status" "PendingIssuerStatus" NOT NULL DEFAULT 'GENERATING',
    "failureReason" TEXT,
    "requestedBy" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedAt" TIMESTAMP(3),
    "mergedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_issuers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pending_challenges" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "challengeReason" TEXT NOT NULL,
    "customReason" TEXT,
    "status" "PendingChallengeStatus" NOT NULL DEFAULT 'WAITING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_issuers_issuerId_key" ON "pending_issuers"("issuerId");

-- CreateIndex
CREATE INDEX "pending_challenges_issuerId_status_idx" ON "pending_challenges"("issuerId", "status");
