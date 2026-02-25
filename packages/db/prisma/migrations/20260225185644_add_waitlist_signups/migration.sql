-- CreateEnum
CREATE TYPE "WaitlistExitReason" AS ENUM ('SEQUENCE_COMPLETE', 'UNSUBSCRIBED', 'APP_LAUNCHED');

-- CreateTable
CREATE TABLE "waitlist_signups" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "exitReason" "WaitlistExitReason",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "waitlist_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_signups_email_key" ON "waitlist_signups"("email");

-- CreateIndex
CREATE INDEX "waitlist_signups_nextSendAt_completedAt_idx" ON "waitlist_signups"("nextSendAt", "completedAt");

-- CreateIndex
CREATE INDEX "waitlist_signups_email_idx" ON "waitlist_signups"("email");
