-- CreateTable
CREATE TABLE "pending_tickets" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "pcnNumber" TEXT NOT NULL,
    "vehicleReg" TEXT NOT NULL,
    "issuerType" TEXT NOT NULL,
    "ticketStage" TEXT NOT NULL,
    "tier" "TicketTier" NOT NULL,
    "challengeReason" TEXT,
    "imageUrl" TEXT,
    "tempImagePath" TEXT,
    "initialAmount" INTEGER,
    "issuer" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "claimedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_tickets_stripeSessionId_key" ON "pending_tickets"("stripeSessionId");

-- CreateIndex
CREATE INDEX "pending_tickets_email_idx" ON "pending_tickets"("email");

-- CreateIndex
CREATE INDEX "pending_tickets_claimed_idx" ON "pending_tickets"("claimed");
