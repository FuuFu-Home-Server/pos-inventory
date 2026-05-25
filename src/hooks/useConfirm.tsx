"use client"

import { useState, useCallback } from "react"
import { AlertTriangle } from "lucide-react"

type ConfirmState = {
  message: string
  resolve: (value: boolean) => void
} | null

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(null)

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ message, resolve })
    })
  }, [])

  function handleClose(result: boolean) {
    state?.resolve(result)
    setState(null)
  }

  const dialog = state ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={() => handleClose(false)} />
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <p className="text-sm text-gray-700 leading-relaxed pt-1.5">{state.message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleClose(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => handleClose(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, dialog }
}
