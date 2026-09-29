-- AlterTable
-- DEFAULT adicionado à mão: o Prisma gera NOT NULL sem default aqui, o que
-- falha em qualquer banco com linhas existentes em Reservation.
ALTER TABLE "Reservation" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ReservationItem" ADD COLUMN     "originalLedModelId" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- AddForeignKey
ALTER TABLE "ReservationItem" ADD CONSTRAINT "ReservationItem_originalLedModelId_fkey" FOREIGN KEY ("originalLedModelId") REFERENCES "LedModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
