-- User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isDefaultCredential" BOOLEAN NOT NULL DEFAULT false;

-- ProductVariant: isActive column + indexes
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");
CREATE INDEX IF NOT EXISTS "ProductVariant_isActive_stock_idx" ON "ProductVariant"("isActive", "stock");

-- Product: missing indexes
CREATE INDEX IF NOT EXISTS "Product_name_idx" ON "Product"("name");
CREATE INDEX IF NOT EXISTS "Product_category_idx" ON "Product"("category");

-- Transaction: missing columns + indexes
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED';
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "syncFailReason" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "localId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "midtransOrderId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_localId_key" ON "Transaction"("localId");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_midtransOrderId_key" ON "Transaction"("midtransOrderId");
CREATE INDEX IF NOT EXISTS "Transaction_syncStatus_idx" ON "Transaction"("syncStatus");

-- PurchaseOrder: supplierId must be nullable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "supplierId" DROP NOT NULL;

-- ReceiptConfig: missing column
ALTER TABLE "ReceiptConfig" ADD COLUMN IF NOT EXISTS "staticQrisImage" TEXT;

-- Convert enum columns to TEXT so Prisma String fields work correctly
ALTER TABLE "Discount" ALTER COLUMN "type" TYPE TEXT;
ALTER TABLE "Discount" ALTER COLUMN "scope" TYPE TEXT;
ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "PurchaseOrder" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "StockOpname" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
