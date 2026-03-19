'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, X } from 'lucide-react'
import { CommsTriggerResult, TRIGGER_EVENT_LABELS } from '@/lib/comms/trigger'

interface CommsTriggerPromptProps {
  trigger: CommsTriggerResult
  onReviewAndSend: () => void
  onDismiss: () => void
}

export function CommsTriggerPrompt({ trigger, onReviewAndSend, onDismiss }: CommsTriggerPromptProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true))

    timerRef.current = setTimeout(() => {
      handleDismiss()
    }, 15000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }

  const handleReview = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    onReviewAndSend()
  }

  const eventLabel =
    TRIGGER_EVENT_LABELS[trigger.triggerEvent] ||
    `Communication triggered: ${trigger.triggerEvent}`

  const recipientLabel = trigger.suggestedRecipient?.name
    ? `Send to ${trigger.suggestedRecipient.name}?`
    : eventLabel

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 max-w-sm w-full transition-all duration-300 ease-out ${
        isVisible && !isExiting
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="bg-white border border-[#D4CFC7] rounded-xl shadow-lg overflow-hidden">
        {/* Progress bar for auto-dismiss */}
        <div className="h-0.5 bg-[#F5F2EE]">
          <div
            className="h-full bg-accent transition-all ease-linear"
            style={{ animation: 'shrink-width 15s linear forwards' }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center">
              <Mail className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal leading-tight">
                {recipientLabel}
              </p>
              {trigger.previewSubject && (
                <p className="text-xs text-muted mt-1 truncate">
                  {trigger.previewSubject}
                </p>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1 text-muted hover:text-slate rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2 mt-3 ml-12">
            <button
              onClick={handleReview}
              className="px-3.5 py-1.5 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-95 transition-opacity"
            >
              Review &amp; Send
            </button>
            <button
              onClick={handleDismiss}
              className="px-3.5 py-1.5 text-sm text-muted hover:text-slate transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shrink-width {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}
