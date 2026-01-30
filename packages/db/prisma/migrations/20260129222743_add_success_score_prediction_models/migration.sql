-- CreateEnum
CREATE TYPE "PatternOutcome" AS ENUM ('WINNING', 'LOSING');

-- AlterTable
ALTER TABLE "london_tribunal_cases" ADD COLUMN     "normalizedContraventionCode" TEXT,
ADD COLUMN     "normalizedIssuerId" TEXT;

-- CreateTable
CREATE TABLE "appeal_data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "totalCases" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastImport" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeal_data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contravention_stats" (
    "id" TEXT NOT NULL,
    "contraventionCode" TEXT NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "allowedCount" INTEGER NOT NULL,
    "refusedCount" INTEGER NOT NULL,
    "partiallyAllowedCount" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contravention_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issuer_contravention_stats" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "contraventionCode" TEXT NOT NULL,
    "totalCases" INTEGER NOT NULL,
    "allowedCount" INTEGER NOT NULL,
    "refusedCount" INTEGER NOT NULL,
    "partiallyAllowedCount" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issuer_contravention_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appeal_patterns" (
    "id" TEXT NOT NULL,
    "contraventionCode" TEXT NOT NULL,
    "issuerId" TEXT,
    "pattern" TEXT NOT NULL,
    "outcome" "PatternOutcome" NOT NULL,
    "frequency" INTEGER NOT NULL,
    "exampleCaseRefs" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeal_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "appeal_data_sources_name_key" ON "appeal_data_sources"("name");

-- CreateIndex
CREATE UNIQUE INDEX "contravention_stats_contraventionCode_key" ON "contravention_stats"("contraventionCode");

-- CreateIndex
CREATE INDEX "issuer_contravention_stats_issuerId_idx" ON "issuer_contravention_stats"("issuerId");

-- CreateIndex
CREATE INDEX "issuer_contravention_stats_contraventionCode_idx" ON "issuer_contravention_stats"("contraventionCode");

-- CreateIndex
CREATE UNIQUE INDEX "issuer_contravention_stats_issuerId_contraventionCode_key" ON "issuer_contravention_stats"("issuerId", "contraventionCode");

-- CreateIndex
CREATE INDEX "appeal_patterns_contraventionCode_idx" ON "appeal_patterns"("contraventionCode");

-- CreateIndex
CREATE INDEX "appeal_patterns_outcome_idx" ON "appeal_patterns"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "appeal_patterns_contraventionCode_issuerId_pattern_outcome_key" ON "appeal_patterns"("contraventionCode", "issuerId", "pattern", "outcome");

-- CreateIndex
CREATE INDEX "london_tribunal_cases_normalizedIssuerId_normalizedContrave_idx" ON "london_tribunal_cases"("normalizedIssuerId", "normalizedContraventionCode");
