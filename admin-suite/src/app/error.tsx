'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
        <h1 className="text-2xl font-heading font-bold text-charcoal mb-2">
          Something went wrong
        </h1>
        <p className="text-slate mb-6">
          {error.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity mx-auto"
        >
          <RefreshCw className="w-5 h-5" />
          Try again
        </button>
      </div>
    </div>
  )
}
