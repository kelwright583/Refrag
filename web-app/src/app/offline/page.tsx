'use client'

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 p-5 rounded-full bg-[#F5F2EE]">
        <WifiOff className="w-10 h-10 text-[#C72A00]" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-bold tracking-wide text-charcoal mb-1">REFRAG</h1>
      <p className="text-xs text-muted uppercase tracking-wide mb-8">From Evidence to Outcome</p>

      <h2 className="text-lg font-semibold text-charcoal mb-3">No internet connection</h2>
      <p className="text-sm text-slate max-w-xs leading-relaxed mb-8">
        Your recent cases are available offline in the Refrag app. Connect to the internet to sync
        new data and upload pending evidence.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-[#C72A00] text-white rounded-lg text-sm font-semibold hover:bg-[#a82300] transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
