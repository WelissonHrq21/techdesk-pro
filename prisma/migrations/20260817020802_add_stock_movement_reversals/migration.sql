-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'REVERSAL';

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "reversalOfMovementId" TEXT;

-- CreateIndex
CREATE INDEX "StockMovement_reversalOfMovementId_idx" ON "StockMovement"("reversalOfMovementId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_reversalOfMovementId_fkey" FOREIGN KEY ("reversalOfMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
