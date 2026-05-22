-- AlterEnum
ALTER TYPE "TransactionStatus" ADD VALUE 'PENDING';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "midtransOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_midtransOrderId_key" ON "Transaction"("midtransOrderId");
