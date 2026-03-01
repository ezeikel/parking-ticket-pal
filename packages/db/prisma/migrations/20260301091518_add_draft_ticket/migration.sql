-- CreateTable
CREATE TABLE "draft_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "TicketTier" NOT NULL DEFAULT 'PREMIUM',
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "draft_tickets_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "draft_tickets" ADD CONSTRAINT "draft_tickets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
