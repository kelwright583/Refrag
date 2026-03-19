'use client'

import { useState, useEffect } from 'react'
import { X, Send, Save, ChevronDown } from 'lucide-react'
import { CommsTriggerResult } from '@/lib/comms/trigger'
import { EMAIL_TEMPLATES } from '@/lib/comms/email-templates'

interface EmailPreviewPanelProps {
  trigger: CommsTriggerResult
  caseId: string
  onClose: () => void
  onSent: () => void
}

export function EmailPreviewPanel({ trigger, caseId, onClose, onSent }: EmailPreviewPanelProps) {
  const [to, setTo] = useState(trigger.suggestedRecipient?.email || '')
  const [subject, setSubject] = useState(trigger.previewSubject || '')
  const [body, setBody] = useState(trigger.previewBody || '')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    setTo(trigger.suggestedRecipient?.email || '')
    setSubject(trigger.previewSubject || '')
    setBody(trigger.previewBody || '')
  }, [trigger])

  const handleSelectTemplate = (templateId: string) => {
    const tmpl = EMAIL_TEMPLATES.find((t) => t.id === templateId)
    if (tmpl) {
      setSelectedTemplateId(templateId)
      setSubject(tmpl.subject)
      setBody(tmpl.body)
    }
    setShowTemplates(false)
  }

  const handleSend = async () => {
    if (!to.trim()) {
      setError('Recipient email is required')
      return
    }
    if (!subject.trim()) {
      setError('Subject is required')
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const res = await fetch('/api/comms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject: subject.trim(),
          body_html: markdownToSimpleHtml(body),
          case_id: caseId,
          trigger_event: trigger.triggerEvent,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to send email')
      }

      onSent()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleSaveDraft = async () => {
    setIsSavingDraft(true)
    setError(null)

    try {
      const res = await fetch('/api/comms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim() || 'draft',
          subject: `[DRAFT] ${subject.trim()}`,
          body_html: markdownToSimpleHtml(body),
          case_id: caseId,
          trigger_event: trigger.triggerEvent,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save draft')
      }

      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSavingDraft(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-slate focus:outline-none focus:ring-2 focus:ring-accent'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white border-l border-[#D4CFC7] shadow-xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4CFC7]">
          <div>
            <h2 className="text-lg font-heading font-bold text-charcoal">Email Preview</h2>
            {trigger.templateName && (
              <p className="text-xs text-muted mt-0.5">{trigger.templateName}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-slate rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Template picker */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate mb-1">Template</label>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-slate bg-white hover:bg-[#FAFAF8]"
            >
              <span className="truncate">
                {selectedTemplateId
                  ? EMAIL_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name
                  : trigger.templateName || 'Select template...'}
              </span>
              <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />
            </button>
            {showTemplates && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D4CFC7] rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {EMAIL_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl.id)}
                    className="w-full text-left px-3 py-2 text-sm text-slate hover:bg-[#F5F2EE] first:rounded-t-lg last:rounded-b-lg"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-medium text-slate mb-1">
              To
              {trigger.suggestedRecipient?.name && (
                <span className="text-muted font-normal ml-1">
                  ({trigger.suggestedRecipient.name})
                </span>
              )}
            </label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className={inputCls}
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Body (Markdown)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
            />
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Preview</label>
            <div
              className="border border-[#D4CFC7] rounded-lg p-4 bg-[#FAFAF8] text-sm text-slate prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: markdownToSimpleHtml(body) }}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-[#D4CFC7] bg-[#FAFAF8]">
          <button
            onClick={handleSaveDraft}
            disabled={isSavingDraft}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:bg-white disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavingDraft ? 'Saving...' : 'Save as draft'}
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !to.trim() || !subject.trim()}
            className="flex items-center gap-1.5 px-5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-95 disabled:opacity-60"
          >
            <Send className="w-3.5 h-3.5" />
            {isSending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

/**
 * Minimal markdown-to-HTML for email preview.
 * Handles bold, line breaks, and paragraphs.
 */
function markdownToSimpleHtml(md: string): string {
  return md
    .split('\n\n')
    .map((para) => {
      const html = para
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>')
      return `<p>${html}</p>`
    })
    .join('')
}
