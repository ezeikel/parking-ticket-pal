-- CreateTable
CREATE TABLE "challenge_arguments" (
    "id" TEXT NOT NULL,
    "contraventionCode" TEXT NOT NULL,
    "argumentType" TEXT NOT NULL,
    "heading" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "signDiagramUrls" TEXT[],
    "sourceUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_arguments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "challenge_arguments_contraventionCode_idx" ON "challenge_arguments"("contraventionCode");

-- CreateIndex
CREATE INDEX "challenge_arguments_contraventionCode_argumentType_idx" ON "challenge_arguments"("contraventionCode", "argumentType");

-- CreateIndex
CREATE UNIQUE INDEX "challenge_arguments_sourceUrl_heading_key" ON "challenge_arguments"("sourceUrl", "heading");
