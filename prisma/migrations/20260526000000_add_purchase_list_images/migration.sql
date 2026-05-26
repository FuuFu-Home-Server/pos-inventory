CREATE TABLE "PurchaseListImage" (
    "id" SERIAL NOT NULL,
    "purchaseListId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PurchaseListImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PurchaseListImage_filename_key" ON "PurchaseListImage"("filename");

ALTER TABLE "PurchaseListImage" ADD CONSTRAINT "PurchaseListImage_purchaseListId_fkey"
    FOREIGN KEY ("purchaseListId") REFERENCES "PurchaseList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
