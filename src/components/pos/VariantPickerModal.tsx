"use client"

import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import { formatRupiah } from "@/lib/format"

type Variant = {
  id: number
  productId: number
  productName: string
  variantName: string
  price: number
  stock: number
  unit: string
  barcode: string | null
}

interface VariantPickerModalProps {
  open: boolean
  onClose: () => void
  variants: Variant[]
  onSelect: (v: Variant) => void
}

export function VariantPickerModal({ open, onClose, variants, onSelect }: VariantPickerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Pilih Varian">
      <div className="space-y-2">
        {variants.map((v) => (
          <Button
            key={v.id}
            variant="secondary"
            className="w-full justify-between text-left"
            onClick={() => {
              onSelect(v)
              onClose()
            }}
          >
            <span>{v.variantName}</span>
            <span className="text-blue-700 font-semibold">
              {formatRupiah(v.price)} / {v.unit}
            </span>
          </Button>
        ))}
      </div>
    </Modal>
  )
}
