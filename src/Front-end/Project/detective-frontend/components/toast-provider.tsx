"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

type ToastTone = "info" | "success" | "error"

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastContextValue = {
  notify: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastContextValue>({
  notify: () => undefined,
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const notify = useCallback((message: string, tone: ToastTone = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((previous) => [...previous, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id))
    }, 2800)
  }, [])

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[120] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`surface fade-up pointer-events-auto min-w-64 px-4 py-3 text-sm ${
              toast.tone === "success"
                ? "border-emerald-500/40"
                : toast.tone === "error"
                  ? "border-red-500/40"
                  : ""
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
