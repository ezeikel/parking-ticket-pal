-- CreateEnum
CREATE TYPE "LegalInstrumentType" AS ENUM ('ACT', 'STATUTORY_INSTRUMENT', 'GUIDANCE');

-- CreateTable
CREATE TABLE "legal_references" (
    "id" TEXT NOT NULL,
    "instrumentName" TEXT NOT NULL,
    "instrumentType" "LegalInstrumentType" NOT NULL,
    "sectionIdentifier" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "topicTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_references_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "legal_references_sourceUrl_sectionIdentifier_key" ON "legal_references"("sourceUrl", "sectionIdentifier");
