-- CreateEnum
CREATE TYPE "IssuerHealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'BROKEN');

-- CreateTable
CREATE TABLE "issuer_health_checks" (
    "id" TEXT NOT NULL,
    "issuerId" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "status" "IssuerHealthStatus" NOT NULL,
    "portalAccessible" BOOLEAN NOT NULL,
    "elementsFound" TEXT[],
    "elementsMissing" TEXT[],
    "captchaDetected" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "responseTimeMs" INTEGER NOT NULL,
    "previousStatus" "IssuerHealthStatus",
    "statusChanged" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issuer_health_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "issuer_health_checks_issuerId_checkedAt_idx" ON "issuer_health_checks"("issuerId", "checkedAt");

-- CreateIndex
CREATE INDEX "issuer_health_checks_status_idx" ON "issuer_health_checks"("status");
