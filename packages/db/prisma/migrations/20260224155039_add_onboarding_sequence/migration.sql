-- CreateEnum
CREATE TYPE "OnboardingExitReason" AS ENUM ('UPGRADED', 'SEQUENCE_COMPLETE', 'UNSUBSCRIBED', 'TICKET_DELETED', 'TICKET_PAID', 'DEADLINE_PASSED');

-- CreateTable
CREATE TABLE "onboarding_sequences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "exitReason" "OnboardingExitReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "onboarding_sequences_nextSendAt_completedAt_idx" ON "onboarding_sequences"("nextSendAt", "completedAt");

-- CreateIndex
CREATE INDEX "onboarding_sequences_userId_idx" ON "onboarding_sequences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_sequences_userId_ticketId_key" ON "onboarding_sequences"("userId", "ticketId");

-- AddForeignKey
ALTER TABLE "onboarding_sequences" ADD CONSTRAINT "onboarding_sequences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_sequences" ADD CONSTRAINT "onboarding_sequences_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
