'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="font-sans">
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-500 mb-6">
              {error.message || 'A critical error occurred'}
            </p>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-3 bg-[#C9663D] text-white rounded-lg hover:opacity-90 transition-opacity mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
