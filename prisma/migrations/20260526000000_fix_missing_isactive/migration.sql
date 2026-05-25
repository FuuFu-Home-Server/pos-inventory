ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "ProductVariant_isActive_idx" ON "ProductVariant"("isActive");
CREATE INDEX IF NOT EXISTS "ProductVariant_isActive_stock_idx" ON "ProductVariant"("isActive", "stock");
