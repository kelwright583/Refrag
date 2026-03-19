/**
 * Case communications page
 */

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase } from '@/hooks/use-cases'
import { useCommsTemplates, useCommsLog, useCreateCommsLogEntry } from '@/hooks/use-comms'
import { replaceTemplatePlaceholders } from '@/lib/api/comms'
import { CommsChannel } from '@/lib/types/comms'
import { EMAIL_TEMPLATES, resolveTemplatePlaceholders } from '@/lib/comms/email-templates'
import { markdownToHtml } from '@/lib/utils/markdown'
import { useToast } from '@/components/Toast'
import { ArrowLeft, Send, FileText, Mail, MessageSquare, Loader2, X } from 'lucide-react'

export default function CaseCommsPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string

  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: caseData } = useCase(caseId)
  const { data: dbTemplates } = useCommsTemplates()
  const { data: commsLog, isLoading: logLoading, refetch: refetchLog } = useCommsLog(caseId)

  const allTemplates = [
    ...EMAIL_TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      subject_template: t.subject,
      body_template_md: t.body,
      source: 'builtin' as const,
    })),
    ...(dbTemplates || []).map((t) => ({
      ...t,
      source: 'custom' as const,
    })),
  ]

  const selectedTemplate = allTemplates.find((t) => t.id === selectedTemplateId)

  const placeholders = caseData
    ? {
        CaseNumber: caseData.case_number,
        ClientName: caseData.client_name,
        InsurerName: caseData.insurer_name || '',
        BrokerName: caseData.broker_name || '',
        ClaimReference: caseData.claim_reference || '',
        LossDate: caseData.loss_date
          ? new Date(caseData.loss_date).toLocaleDateString('en-ZA')
          : '',
        Location: caseData.location || '',
      }
    : null

  const previewSubject =
    selectedTemplate && placeholders
      ? replaceTemplatePlaceholders(selectedTemplate.subject_template, placeholders)
      : ''
  const previewBody =
    selectedTemplate && placeholders
      ? replaceTemplatePlaceholders(selectedTemplate.body_template_md, placeholders)
      : ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push(`/app/cases/${caseId}`)}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Case
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-charcoal">Communications</h1>
            <p className="text-slate mt-1">Manage case communications and notes</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
            New Communication
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Template Selector & Preview */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4">
            Select Template
          </h2>

          {allTemplates.length > 0 ? (
            <div className="space-y-4">
              <select
                value={selectedTemplateId || ''}
                onChange={(e) => setSelectedTemplateId(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              >
                <option value="">-- Select a template --</option>
                <optgroup label="Standard Templates">
                  {allTemplates
                    .filter((t) => t.source === 'builtin')
                    .map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                </optgroup>
                {allTemplates.some((t) => t.source === 'custom') && (
                  <optgroup label="Custom Templates">
                    {allTemplates
                      .filter((t) => t.source === 'custom')
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>

              {selectedTemplate && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Subject Preview
                    </label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-charcoal">{previewSubject}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Body Preview
                    </label>
                    <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-charcoal font-mono">
                        {previewBody}
                      </pre>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (selectedTemplate && placeholders) {
                        setShowCreateModal(true)
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Send className="w-4 h-4" />
                    Use This Template
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate mb-4">No templates available</p>
              <button
                onClick={() => router.push('/app/settings/templates')}
                className="text-copper hover:opacity-80"
              >
                Create templates in Settings
              </button>
            </div>
          )}
        </div>

        {/* Communications Log */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4">
            Communications Log
          </h2>

          {logLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-copper"></div>
              <p className="text-slate mt-2">Loading...</p>
            </div>
          ) : commsLog && commsLog.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {commsLog.map((entry) => (
                <div
                  key={entry.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.channel === 'email' ? (
                        <Mail className="w-4 h-4 text-slate" />
                      ) : (
                        <MessageSquare className="w-4 h-4 text-slate" />
                      )}
                      <span className="text-sm font-medium text-charcoal capitalize">
                        {entry.channel}
                      </span>
                      {entry.sent_by_user && (
                        <span className="text-xs text-slate">
                          by {entry.sent_by_user.email}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate">
                      {new Date(entry.created_at).toLocaleString('en-ZA')}
                    </span>
                  </div>

                  {entry.subject && (
                    <p className="text-sm font-medium text-charcoal mb-2">{entry.subject}</p>
                  )}

                  {entry.to_recipients && (
                    <p className="text-xs text-slate mb-2">To: {entry.to_recipients}</p>
                  )}

                  <div className="bg-gray-50 rounded-lg p-3 mt-2">
                    <pre className="whitespace-pre-wrap text-sm text-charcoal font-mono">
                      {entry.body_md}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-slate mx-auto mb-4" />
              <p className="text-slate">No communications yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Communication Modal */}
      {showCreateModal && (
        <CreateCommsModal
          caseId={caseId}
          caseData={caseData}
          template={selectedTemplate || undefined}
          placeholders={placeholders || undefined}
          allTemplates={allTemplates}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            setSelectedTemplateId(null)
            refetchLog()
          }}
        />
      )}
    </div>
  )
}

/**
 * Create Communication Modal — supports both log entries and email sending
 */
function CreateCommsModal({
  caseId,
  caseData,
  template,
  placeholders,
  allTemplates,
  onClose,
  onSuccess,
}: {
  caseId: string
  caseData: any
  template?: { subject_template: string; body_template_md: string; id?: string }
  placeholders?: Record<string, string>
  allTemplates: Array<{
    id: string
    name: string
    subject_template: string
    body_template_md: string
    source: 'builtin' | 'custom'
  }>
  onClose: () => void
  onSuccess: () => void
}) {
  const { addToast } = useToast()
  const [channel, setChannel] = useState<CommsChannel>(template ? 'email' : 'note')
  const [selectedLocalTemplateId, setSelectedLocalTemplateId] = useState(template?.id || '')
  const [toRecipients, setToRecipients] = useState(caseData?.insurer_email || '')
  const [subject, setSubject] = useState(
    template && placeholders
      ? replaceTemplatePlaceholders(template.subject_template, placeholders)
      : ''
  )
  const [bodyMd, setBodyMd] = useState(
    template && placeholders
      ? replaceTemplatePlaceholders(template.body_template_md, placeholders)
      : ''
  )
  const [sending, setSending] = useState(false)
  const createEntry = useCreateCommsLogEntry()

  const handleTemplateChange = (templateId: string) => {
    setSelectedLocalTemplateId(templateId)
    const t = allTemplates.find((at) => at.id === templateId)
    if (t && placeholders) {
      setSubject(replaceTemplatePlaceholders(t.subject_template, placeholders))
      setBodyMd(replaceTemplatePlaceholders(t.body_template_md, placeholders))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (channel === 'email') {
      if (!toRecipients.trim()) {
        addToast('Recipient email is required', 'warning')
        return
      }

      setSending(true)
      try {
        const response = await fetch('/api/comms/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: toRecipients.trim(),
            subject,
            case_id: caseId,
            body_html: markdownToHtml(bodyMd),
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Send failed' }))
          if (response.status === 503) {
            addToast('Email sending requires RESEND_API_KEY configuration', 'warning')
            return
          }
          throw new Error(err.error || 'Failed to send email')
        }

        addToast('Email sent successfully', 'success')
        onSuccess()
      } catch (error: any) {
        addToast(error.message || 'Failed to send email', 'error')
      } finally {
        setSending(false)
      }
    } else {
      try {
        await createEntry.mutateAsync({
          caseId,
          input: {
            case_id: caseId,
            channel,
            to_recipients: undefined,
            subject: undefined,
            body_md: bodyMd,
          },
        })
        addToast('Note logged', 'success')
        onSuccess()
      } catch (error: any) {
        addToast(error.message || 'Failed to create communication', 'error')
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">New Communication</h2>
          <button
            onClick={onClose}
            className="text-slate hover:text-charcoal transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Channel *</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as CommsChannel)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            >
              <option value="note">Note</option>
              <option value="email">Email</option>
            </select>
          </div>

          {channel === 'email' && (
            <>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Template
                </label>
                <select
                  value={selectedLocalTemplateId}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                >
                  <option value="">-- No template --</option>
                  <optgroup label="Standard Templates">
                    {allTemplates
                      .filter((t) => t.source === 'builtin')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </optgroup>
                  {allTemplates.some((t) => t.source === 'custom') && (
                    <optgroup label="Custom Templates">
                      {allTemplates
                        .filter((t) => t.source === 'custom')
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  To Recipients *
                </label>
                <input
                  type="text"
                  value={toRecipients}
                  onChange={(e) => setToRecipients(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                  placeholder="email@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                  placeholder="Email subject"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              {channel === 'email' ? 'Email Body (Markdown)' : 'Note'} *
            </label>
            <textarea
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper font-mono text-sm"
              placeholder={
                channel === 'email'
                  ? 'Write your message in Markdown...'
                  : 'Write your note...'
              }
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-charcoal hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(sending || createEntry.isPending) || !bodyMd.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {(sending || createEntry.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending
                ? 'Sending...'
                : createEntry.isPending
                  ? 'Logging...'
                  : channel === 'email'
                    ? 'Send Email'
                    : 'Log Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
