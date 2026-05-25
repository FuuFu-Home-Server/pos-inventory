ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDefaultCredential" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED';
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "syncFailReason" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "localId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "midtransOrderId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_localId_key" ON "Transaction"("localId");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_midtransOrderId_key" ON "Transaction"("midtransOrderId");
CREATE INDEX IF NOT EXISTS "Transaction_syncStatus_idx" ON "Transaction"("syncStatus");

ALTER TABLE "ReceiptConfig" ADD COLUMN IF NOT EXISTS "staticQrisImage" TEXT;
