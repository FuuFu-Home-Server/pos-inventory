ALTER TABLE "PurchaseOrder" ADD COLUMN "syncStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "PurchaseOrder" ADD COLUMN "localId" TEXT;
CREATE UNIQUE INDEX "PurchaseOrder_localId_key" ON "PurchaseOrder"("localId");
CREATE INDEX "PurchaseOrder_syncStatus_idx" ON "PurchaseOrder"("syncStatus");
