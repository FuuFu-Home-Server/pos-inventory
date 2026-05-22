export default function ImportPage() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl font-bold md:text-2xl text-gray-900 mb-2">Import Data GDB</h1>
      <p className="text-gray-500 text-sm mb-6">
        Migrasi data dari sistem lama (Firebird/InterBase .GDB)
      </p>
      <div className="max-w-lg bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div>
            <p className="font-semibold text-yellow-800">Fitur Dalam Pengembangan</p>
            <p className="text-sm text-yellow-700 mt-1">
              Modul import file .GDB (Firebird database) sedang dalam tahap pengembangan.
            </p>
            <p className="text-sm text-yellow-600 mt-3 font-medium">Mapping data yang disiapkan:</p>
            <ul className="text-sm text-yellow-700 mt-1 space-y-1 list-disc pl-4">
              <li>SUPLIER → Supplier (nama, alamat, telp)</li>
              <li>CUSTOMER → Customer (nama, alamat, telp)</li>
              <li>ASPASS → User (FLEVEL menentukan role, password di-hash ulang)</li>
              <li>
                BARANG + ISIAN2 → Product + ProductVariant (harga, stok, barcode dari KODE_LAIN, HPP
                dari HRG_BELI)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
