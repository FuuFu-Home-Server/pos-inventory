import { PrismaClient } from "@prisma/client"
import { fakerID_ID as faker } from "@faker-js/faker"
import bcrypt from "bcryptjs"
import { subDays } from "date-fns"

const prisma = new PrismaClient()

const PRODUK_POOL = [
  { name: "Beras", category: "Sembako", variants: [{ name: "5kg", unit: "karung" }, { name: "10kg", unit: "karung" }, { name: "25kg", unit: "karung" }] },
  { name: "Gula Pasir", category: "Sembako", variants: [{ name: "1kg", unit: "kg" }, { name: "2kg", unit: "kg" }] },
  { name: "Minyak Goreng", category: "Sembako", variants: [{ name: "1L", unit: "botol" }, { name: "2L", unit: "botol" }, { name: "Refill 5L", unit: "jerigen" }] },
  { name: "Tepung Terigu", category: "Sembako", variants: [{ name: "1kg", unit: "kg" }, { name: "5kg", unit: "kg" }] },
  { name: "Indomie Goreng", category: "Mie Instan", variants: [{ name: "Satuan", unit: "pcs" }, { name: "1 Dus (40pcs)", unit: "dus" }] },
  { name: "Indomie Kuah Ayam", category: "Mie Instan", variants: [{ name: "Satuan", unit: "pcs" }, { name: "1 Dus (40pcs)", unit: "dus" }] },
  { name: "Sabun Lifebuoy", category: "Kebersihan", variants: [{ name: "Batang 80g", unit: "pcs" }, { name: "Cair 250ml", unit: "botol" }] },
  { name: "Deterjen Rinso", category: "Kebersihan", variants: [{ name: "Sachet 35g", unit: "pcs" }, { name: "800g", unit: "bungkus" }] },
  { name: "Teh Botol Sosro", category: "Minuman", variants: [{ name: "230ml", unit: "botol" }, { name: "1 Krat (24btl)", unit: "krat" }] },
  { name: "Aqua", category: "Minuman", variants: [{ name: "240ml", unit: "pcs" }, { name: "600ml", unit: "botol" }, { name: "1500ml", unit: "botol" }] },
  { name: "Kopi Kapal Api", category: "Minuman", variants: [{ name: "Sachet 25g", unit: "pcs" }, { name: "165g", unit: "bungkus" }] },
  { name: "Susu SGM", category: "Susu", variants: [{ name: "400g", unit: "kaleng" }, { name: "900g", unit: "kaleng" }] },
  { name: "Rokok Gudang Garam", category: "Rokok", variants: [{ name: "Batang", unit: "pcs" }, { name: "Bungkus", unit: "bungkus" }, { name: "1 Slop", unit: "slop" }] },
  { name: "Garam Kapal", category: "Bumbu", variants: [{ name: "250g", unit: "bungkus" }, { name: "1kg", unit: "bungkus" }] },
  { name: "Kecap Manis ABC", category: "Bumbu", variants: [{ name: "135ml", unit: "botol" }, { name: "600ml", unit: "botol" }] },
  { name: "Sambal ABC", category: "Bumbu", variants: [{ name: "135ml", unit: "botol" }, { name: "330ml", unit: "botol" }] },
  { name: "Masako Ayam", category: "Bumbu", variants: [{ name: "Sachet 8g", unit: "pcs" }, { name: "200g", unit: "bungkus" }] },
  { name: "Royco Sapi", category: "Bumbu", variants: [{ name: "Sachet 7g", unit: "pcs" }, { name: "200g", unit: "bungkus" }] },
  { name: "Minyak Tanah", category: "Bahan Bakar", variants: [{ name: "1L", unit: "liter" }] },
  { name: "Telur Ayam", category: "Sembako", variants: [{ name: "Butir", unit: "pcs" }, { name: "1 Tray (30)", unit: "tray" }] },
]

async function main() {
  console.log("Seeding database...")

  const [adminRole, empRole] = await Promise.all([
    prisma.role.upsert({ where: { name: "ADMIN" }, update: {}, create: { name: "ADMIN" } }),
    prisma.role.upsert({ where: { name: "EMPLOYEE" }, update: {}, create: { name: "EMPLOYEE" } }),
  ])

  const hash = await bcrypt.hash("password123", 12)
  await prisma.user.upsert({
    where: { email: "admin@kasir.com" },
    update: {},
    create: { name: "Admin Utama", email: "admin@kasir.com", passwordHash: hash, roleId: adminRole.id },
  })

  const karyawan = [
    { name: "Budi Santoso", email: "kasir1@kasir.com" },
    { name: "Siti Rahayu", email: "kasir2@kasir.com" },
    { name: "Andi Wijaya", email: "kasir3@kasir.com" },
    { name: "Dewi Kusuma", email: "kasir4@kasir.com" },
    { name: "Roni Setiawan", email: "kasir5@kasir.com" },
  ]
  for (const k of karyawan) {
    await prisma.user.upsert({
      where: { email: k.email },
      update: {},
      create: { name: k.name, email: k.email, passwordHash: hash, roleId: empRole.id },
    })
  }

  const pmNames = ["TUNAI", "QRIS", "TRANSFER", "DEBIT", "KREDIT"]
  const paymentMethods = await Promise.all(
    pmNames.map((name) => prisma.paymentMethod.upsert({ where: { name }, update: {}, create: { name } }))
  )

  await prisma.receiptConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      storeName: "Toko Sembako Makmur",
      address: "Jl. Pasar Baru No. 12, Jakarta Pusat",
      phone: "021-1234567",
      headerText: "Selamat Berbelanja!",
      footerText: "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli tidak dapat dikembalikan.",
      showTax: false,
      showCashier: true,
      paperWidth: 80,
    },
  })

  const supplierDefs = [
    "UD Maju Jaya", "CV Sumber Rejeki", "PT Grosir Nusantara", "UD Berkah Abadi",
    "CV Mandiri Sejahtera", "Grosir Pak Haji", "UD Putra Tunggal", "CV Karya Bersama",
    "PT Indo Distributor", "UD Sari Rasa",
  ]
  const suppliers = await Promise.all(
    supplierDefs.map((name) =>
      prisma.supplier.create({
        data: {
          name,
          phone: faker.phone.number(),
          address: faker.location.streetAddress(),
          contactPerson: faker.person.fullName(),
        },
      })
    )
  )

  const allVariants: { id: number; price: number }[] = []
  for (const def of PRODUK_POOL) {
    const supplier = faker.helpers.arrayElement(suppliers)
    const product = await prisma.product.create({
      data: {
        name: def.name,
        category: def.category,
        supplierId: supplier.id,
        variants: {
          create: def.variants.map((v) => ({
            variantName: v.name,
            unit: v.unit,
            barcode: faker.datatype.boolean(0.6) ? faker.string.numeric(13) : null,
            price: Math.round(faker.number.int({ min: 500, max: 500_000 }) / 100) * 100,
            stock: faker.number.int({ min: 30, max: 300 }),
            lowStockThreshold: 5,
          })),
        },
      },
      include: { variants: true },
    })
    allVariants.push(...product.variants.map((v) => ({ id: v.id, price: Number(v.price) })))
  }

  const usedPhones = new Set<string>()
  const customers: { id: number }[] = []
  for (let i = 0; i < 30; i++) {
    let phone: string
    do { phone = faker.string.numeric(10) } while (usedPhones.has(phone))
    usedPhones.add(phone)
    const c = await prisma.customer.create({
      data: {
        name: faker.person.fullName(),
        phone,
        address: faker.location.streetAddress(),
      },
    })
    customers.push(c)
  }

  await Promise.all([
    prisma.discount.create({ data: { name: "Diskon Member 10%", type: "PERCENT", value: 10, scope: "TRANSACTION", isActive: true } }),
    prisma.discount.create({ data: { name: "Promo Hari Ini Rp5.000", type: "FLAT", value: 5000, scope: "TRANSACTION", minPurchase: 50000, isActive: true } }),
    prisma.discount.create({ data: { name: "Hemat Belanja Rp10.000", type: "FLAT", value: 10000, scope: "TRANSACTION", minPurchase: 100000, isActive: true } }),
  ])

  const users = await prisma.user.findMany()
  const tunai = paymentMethods[0]

  for (let i = 0; i < 200; i++) {
    const user = faker.helpers.arrayElement(users)
    const customer = faker.datatype.boolean(0.5) ? faker.helpers.arrayElement(customers) : null
    const count = faker.number.int({ min: 2, max: 5 })
    const selected = faker.helpers.arrayElements(allVariants, count)

    const items = selected.map((v) => {
      const qty = faker.number.int({ min: 1, max: 5 })
      return { variantId: v.id, qty, unitPrice: v.price, subtotal: qty * v.price }
    })

    const subtotal = items.reduce((s, x) => s + x.subtotal, 0)
    const roundedUp = Math.ceil(subtotal / 1000) * 1000
    const paymentAmount = roundedUp + faker.helpers.arrayElement([0, 5000, 10000, 20000])

    await prisma.transaction.create({
      data: {
        userId: user.id,
        customerId: customer?.id ?? null,
        paymentMethodId: tunai.id,
        subtotal,
        total: subtotal,
        discountAmount: 0,
        paymentAmount,
        changeAmount: paymentAmount - subtotal,
        status: "COMPLETED",
        createdAt: faker.date.between({ from: subDays(new Date(), 30), to: new Date() }),
        items: {
          create: items.map((item) => ({
            productVariantId: item.variantId,
            qty: item.qty,
            unitPrice: item.unitPrice,
            itemDiscountAmt: 0,
            subtotal: item.subtotal,
          })),
        },
      },
    })
  }

  for (let i = 0; i < 20; i++) {
    const supplier = faker.helpers.arrayElement(suppliers)
    const user = faker.helpers.arrayElement(users)
    const status = faker.helpers.arrayElement(["DRAFT", "DRAFT", "RECEIVED", "RECEIVED", "CANCELLED"] as const)
    const count = faker.number.int({ min: 1, max: 5 })
    const selected = faker.helpers.arrayElements(allVariants, count)

    await prisma.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        userId: user.id,
        status,
        notes: faker.datatype.boolean(0.5) ? faker.lorem.sentence() : null,
        receivedAt: status === "RECEIVED" ? faker.date.recent({ days: 30 }) : null,
        createdAt: faker.date.between({ from: subDays(new Date(), 60), to: new Date() }),
        items: {
          create: selected.map((v) => {
            const qty = faker.number.int({ min: 5, max: 50 })
            const unitCost = Math.round(v.price * 0.8)
            return { productVariantId: v.id, qty, unitCost, subtotal: qty * unitCost }
          }),
        },
      },
    })
  }

  console.log("Seeding selesai!")
  console.log("   Admin: admin@kasir.com / password123")
  console.log("   Kasir: kasir1@kasir.com / password123")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
