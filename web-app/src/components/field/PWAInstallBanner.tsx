'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const DISMISSED_KEY = 'refrag-pwa-banner-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Don't show if already dismissed
    try {
      if (localStorage.getItem(DISMISSED_KEY) === 'true') return
    } catch {
      return
    }

    // Only show on mobile viewports
    const isMobile = window.matchMedia('(max-width: 768px)').matches
    if (!isMobile) return

    // Don't show if already installed as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) return

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleAdd = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setVisible(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true')
    } catch {
      // Storage unavailable — just hide
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-[#1A1A1A] text-white flex items-center gap-3 px-4 py-3">
      <p className="flex-1 text-xs leading-snug">
        Add Refrag to your home screen for the best experience
      </p>
      <button
        onClick={handleAdd}
        className="shrink-0 px-3 py-1.5 bg-[#C72A00] text-white text-xs font-semibold rounded"
      >
        Add
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss install banner"
        className="shrink-0 text-gray-400 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
