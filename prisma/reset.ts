import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Flushing database...")
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "TransactionItem",
      "Transaction",
      "StockOpnameItem",
      "StockOpname",
      "PurchaseOrderItem",
      "PurchaseOrder",
      "ProductVariant",
      "Product",
      "ImportLog",
      "ReceiptConfig",
      "Discount",
      "PaymentMethod",
      "Supplier",
      "Customer",
      "User",
      "CategoryOption",
      "UnitOption"
    RESTART IDENTITY CASCADE
  `)
  console.log("Done. Run seed next.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
