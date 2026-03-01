-- AlterTable
ALTER TABLE "tickets" ALTER COLUMN "contraventionCode" DROP NOT NULL,
ALTER COLUMN "location" DROP NOT NULL,
ALTER COLUMN "initialAmount" DROP NOT NULL,
ALTER COLUMN "issuer" DROP NOT NULL;
