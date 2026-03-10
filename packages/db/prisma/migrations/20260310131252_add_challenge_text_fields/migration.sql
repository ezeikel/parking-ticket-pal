-- AlterTable
ALTER TABLE "challenges" ADD COLUMN     "additionalInfo" TEXT,
ADD COLUMN     "challengeText" TEXT,
ADD COLUMN     "challengeTextGeneratedAt" TIMESTAMP(3);
