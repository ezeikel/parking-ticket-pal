-- DropIndex
DROP INDEX "tickets_pcnNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "tickets_pcnNumber_vehicleId_key" ON "tickets"("pcnNumber", "vehicleId");
