/**
 * Error display component
 */

'use client'

import { AlertCircle, X } from 'lucide-react'
import { getUserFriendlyError } from '@/lib/utils/error-handling'

interface ErrorDisplayProps {
  error: unknown
  onDismiss?: () => void
  title?: string
}

export function ErrorDisplay({ error, onDismiss, title }: ErrorDisplayProps) {
  const message = getUserFriendlyError(error)

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-medium text-red-800 mb-1">{title}</h3>
          )}
          <p className="text-sm text-red-700">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
