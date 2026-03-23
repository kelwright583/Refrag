'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Registers /sw.js on mount and shows a non-intrusive update banner
 * when a new service worker version is detected.
 */
export function ServiceWorkerRegistration() {
  const [showUpdateBanner, setShowUpdateBanner] = useState(false)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  const handleRefresh = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    }
    window.location.reload()
  }, [waitingWorker])

  const handleDismiss = useCallback(() => {
    setShowUpdateBanner(false)
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    let registration: ServiceWorkerRegistration | null = null

    const onControllerChange = () => {
      // A new service worker has taken control — prompt the user to refresh
      setShowUpdateBanner(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg

        // If there's already a waiting worker on page load, show banner
        if (reg.waiting) {
          setWaitingWorker(reg.waiting)
          setShowUpdateBanner(true)
        }

        // Listen for future updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (!newWorker) return

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version installed but old one still in control
              setWaitingWorker(newWorker)
              setShowUpdateBanner(true)
            }
          })
        })
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err)
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  if (!showUpdateBanner) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9999] bg-[#C72A00] text-white flex items-center justify-between px-4 py-2.5 shadow-md"
      style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
    >
      <span className="text-sm font-medium">Update available — refresh for the latest version</span>
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={handleRefresh}
          className="px-3 py-1 bg-white text-[#C72A00] rounded text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          Refresh
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss update banner"
          className="text-white opacity-80 hover:opacity-100 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}
