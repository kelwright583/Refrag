'use client'

import { useEffect, useState } from 'react'

/**
 * Registers service worker and optionally shows install prompt
 * Add to app layout for PWA "Add to Home Screen" support
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {})
        .catch(() => {})
    }

    // Capture install prompt (for "Add to Home Screen")
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }
  }

  if (!showInstallPrompt || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm p-4 bg-slate text-white rounded-lg shadow-lg z-50 flex items-center justify-between gap-3">
      <span className="text-sm">Add Refrag to your home screen?</span>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="text-sm opacity-80 hover:opacity-100"
        >
          Not now
        </button>
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-white text-slate rounded font-medium text-sm hover:bg-gray-100"
        >
          Install
        </button>
      </div>
    </div>
  )
}
