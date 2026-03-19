/* eslint-disable react-refresh/only-export-components */
import type { PropsWithChildren } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

type ToastType = 'success' | 'error'

type ToastItem = {
  id: number
  text: string
  type: ToastType
}

type ToastContextValue = {
  showToast: (type: ToastType, text: string) => void
  success: (text: string) => void
  error: (text: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, text: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000)

      setToasts((current) => [...current, { id, text, type }])
      window.setTimeout(() => dismissToast(id), 3600)
    },
    [dismissToast],
  )

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (text) => showToast('success', text),
      error: (text) => showToast('error', text),
    }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-[0_6px_18px_rgba(15,23,42,0.08)] ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-white text-[var(--text-primary)]'
                : 'border-red-200 bg-white text-[var(--text-primary)]'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                  toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <div className="min-w-0 flex-1">{toast.text}</div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider')
  }

  return context
}
