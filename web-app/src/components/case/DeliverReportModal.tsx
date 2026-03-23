'use client'

import React, { useState } from 'react'
import {
  X,
  Mail,
  Copy,
  CheckCheck,
  AlertTriangle,
  Loader2,
  Send,
} from 'lucide-react'
import { useToast } from '@/components/Toast'

export interface DeliverReportModalProps {
  caseId: string
  caseNumber: string
  reportPackId?: string
  open: boolean
  onClose: () => void
}

export function DeliverReportModal({
  caseId,
  caseNumber,
  reportPackId,
  open,
  onClose,
}: DeliverReportModalProps) {
  const { addToast } = useToast()

  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [subject, setSubject] = useState(`Assessment Report — Case ${caseNumber}`)
  const [customMessage, setCustomMessage] = useState('')
  const [includeInvoice, setIncludeInvoice] = useState(false)

  const [isSending, setIsSending] = useState(false)
  const [isCopyingLink, setIsCopyingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const resendConfigured = Boolean(
    typeof window !== 'undefined'
      ? true // can't read server env from client; the API returns dryRun flag
      : false
  )

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!recipientEmail || !recipientName) return

    setIsSending(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/deliver-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportPackId,
          recipientEmail,
          recipientName,
          customMessage: customMessage || undefined,
          includeInvoice,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        addToast(data.error || 'Failed to send report', 'error')
        return
      }

      if (data.dryRun) {
        addToast('Email not configured — dry-run logged. Copy the link below to share manually.', 'warning')
      } else {
        addToast(`Report sent to ${recipientEmail}`, 'success')
        onClose()
      }
    } catch (err) {
      addToast('Unexpected error sending report', 'error')
    } finally {
      setIsSending(false)
    }
  }

  async function handleCopyLink() {
    setIsCopyingLink(true)
    try {
      const res = await fetch(`/api/cases/${caseId}/deliver-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportPackId,
          recipientEmail: recipientEmail || 'noreply@refrag.app',
          recipientName: recipientName || 'Recipient',
          includeInvoice,
        }),
      })
      const data = await res.json()
      if (data.downloadUrl) {
        await navigator.clipboard.writeText(data.downloadUrl)
        setLinkCopied(true)
        addToast('Download link copied to clipboard', 'success')
        setTimeout(() => setLinkCopied(false), 3000)
      } else {
        addToast('Could not generate download link', 'error')
      }
    } catch {
      addToast('Failed to copy link', 'error')
    } finally {
      setIsCopyingLink(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deliver-report-title"
    >
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-[#D4CFC7] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D4CFC7]">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#C9663D]" />
            <h2 id="deliver-report-title" className="text-base font-semibold text-charcoal">
              Email Report
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-charcoal/40 hover:text-charcoal transition-colors rounded-md p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning banner — shown; the API returns dryRun which the send handler surfaces */}
        <div className="mx-6 mt-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
          <span>
            If email delivery is not configured, you can use <strong>Copy Link</strong> to share the report manually.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSend} className="flex flex-col gap-4 px-6 py-4">
          {/* Recipient email */}
          <div>
            <label className="block text-xs font-medium text-charcoal/70 mb-1" htmlFor="deliver-to">
              To
            </label>
            <input
              id="deliver-to"
              type="email"
              required
              placeholder="recipient@insurancecompany.com"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="w-full rounded-lg border border-[#D4CFC7] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-[#C9663D]/30 focus:border-[#C9663D]"
            />
          </div>

          {/* Recipient name */}
          <div>
            <label className="block text-xs font-medium text-charcoal/70 mb-1" htmlFor="deliver-name">
              Recipient Name
            </label>
            <input
              id="deliver-name"
              type="text"
              required
              placeholder="e.g. Jane Smith"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full rounded-lg border border-[#D4CFC7] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-[#C9663D]/30 focus:border-[#C9663D]"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-charcoal/70 mb-1" htmlFor="deliver-subject">
              Subject
            </label>
            <input
              id="deliver-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-[#D4CFC7] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-[#C9663D]/30 focus:border-[#C9663D]"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-charcoal/70 mb-1" htmlFor="deliver-message">
              Message <span className="text-charcoal/40">(optional)</span>
            </label>
            <textarea
              id="deliver-message"
              rows={3}
              placeholder="Add a personal message..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full rounded-lg border border-[#D4CFC7] bg-white px-3 py-2 text-sm text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-[#C9663D]/30 focus:border-[#C9663D] resize-none"
            />
          </div>

          {/* Include invoice */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeInvoice}
              onChange={(e) => setIncludeInvoice(e.target.checked)}
              className="w-4 h-4 rounded border-[#D4CFC7] accent-[#C9663D]"
            />
            <span className="text-sm text-charcoal/80">Include invoice</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {/* Copy link */}
            <button
              type="button"
              onClick={handleCopyLink}
              disabled={isCopyingLink}
              className="flex items-center gap-1.5 rounded-lg border border-[#D4CFC7] bg-white px-3 py-2 text-sm font-medium text-charcoal hover:bg-[#f9f7f4] transition-colors disabled:opacity-50"
            >
              {isCopyingLink ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : linkCopied ? (
                <CheckCheck className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </button>

            <div className="flex-1" />

            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-[#D4CFC7] bg-white px-4 py-2 text-sm font-medium text-charcoal hover:bg-[#f9f7f4] transition-colors"
            >
              Cancel
            </button>

            {/* Send */}
            <button
              type="submit"
              disabled={isSending || !recipientEmail || !recipientName}
              className="flex items-center gap-1.5 rounded-lg bg-[#C9663D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b85a33] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSending ? 'Sending…' : 'Send Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
