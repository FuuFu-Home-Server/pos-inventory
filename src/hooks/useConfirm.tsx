"use client"

import { useState, useCallback } from "react"
import { AlertTriangle } from "lucide-react"

type ConfirmOptions = {
  message: string
  description?: string
}

type ConfirmState = (ConfirmOptions & { resolve: (value: boolean) => void }) | null

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(null)

  const confirm = useCallback((messageOrOptions: string | ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const opts =
        typeof messageOrOptions === "string" ? { message: messageOrOptions } : messageOrOptions
      setState({ ...opts, resolve })
    })
  }, [])

  function handleClose(result: boolean) {
    state?.resolve(result)
    setState(null)
  }

  const dialog = state ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={() => handleClose(false)}
      />
      <div className="relative bg-white rounded-2xl shadow-lg max-w-xs w-full overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={15} className="text-red-500" />
            </div>
            <p className="text-sm font-semibold text-gray-800">{state.message}</p>
          </div>
          {state.description && (
            <p className="text-xs text-gray-500 leading-relaxed mb-4 pl-0">{state.description}</p>
          )}
        </div>
        <div className="border-t border-gray-100 px-6 py-3 flex justify-end gap-2">
          <button
            onClick={() => handleClose(false)}
            className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={() => handleClose(true)}
            className="px-4 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  ) : null

  return { confirm, dialog }
}
