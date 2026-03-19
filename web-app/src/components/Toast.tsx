'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const iconMap: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const iconColorMap: Record<ToastType, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  warning: 'text-amber-500',
  info: 'text-[#C9663D]',
}

const borderColorMap: Record<ToastType, string> = {
  success: 'border-l-green-600',
  error: 'border-l-red-600',
  warning: 'border-l-amber-500',
  info: 'border-l-[#C9663D]',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = crypto.randomUUID()
      setToasts((prev) => [...prev, { id, type, message, duration }])
      setTimeout(() => removeToast(id), duration)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type]
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 w-80 bg-white border border-[#D4CFC7] ${borderColorMap[toast.type]} border-l-4 rounded-lg px-4 py-3 shadow-lg animate-slide-in-right`}
              role="alert"
            >
              <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColorMap[toast.type]}`} />
              <p className="text-sm text-charcoal flex-1">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-charcoal/40 hover:text-charcoal transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return ctx
}
