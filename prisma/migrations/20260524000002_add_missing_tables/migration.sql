CREATE TABLE IF NOT EXISTS "CategoryOption" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "CategoryOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UnitOption" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UnitOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseList" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseListItem" (
    "id" SERIAL NOT NULL,
    "purchaseListId" INTEGER NOT NULL,
    "productVariantId" INTEGER,
    "productName" TEXT NOT NULL,
    "variantName" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "qtyPerUnit" INTEGER NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "isPurchased" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PurchaseListItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SyncMeta" (
    "storeName" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    CONSTRAINT "SyncMeta_pkey" PRIMARY KEY ("storeName")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CategoryOption_name_key" ON "CategoryOption"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "UnitOption_name_key" ON "UnitOption"("name");

ALTER TABLE "PurchaseListItem" ADD CONSTRAINT "PurchaseListItem_purchaseListId_fkey"
    FOREIGN KEY ("purchaseListId") REFERENCES "PurchaseList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PurchaseListItem" ADD CONSTRAINT "PurchaseListItem_productVariantId_fkey"
    FOREIGN KEY ("productVariantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
