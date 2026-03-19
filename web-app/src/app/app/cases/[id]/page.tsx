'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase, useUpdateCase, useUpdateCaseStatus, useUpdateCasePriority } from '@/hooks/use-cases'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'
import { CaseStatus, CasePriority } from '@/lib/types/case'
import { NotificationPrompt, RecipientType } from '@/lib/types/notification-rule'
import { sendCaseNotification } from '@/lib/api/notification-rules'
import { getVerticalConfig } from '@/lib/verticals'
import { CaseWorkspace } from '@/components/case/CaseWorkspace'

const STATUS_OPTIONS: CaseStatus[] = [
  'draft',
  'assigned',
  'site_visit',
  'awaiting_quote',
  'reporting',
  'submitted',
  'additional',
  'closed',
]

const PRIORITY_OPTIONS: CasePriority[] = ['low', 'normal', 'high']

const PRIORITY_COLORS: Record<CasePriority, string> = {
  low: 'bg-green-100 text-green-800',
  normal: 'bg-navy/10 text-navy',
  high: 'bg-red-100 text-red-700',
}

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string
  const [isEditing, setIsEditing] = useState(false)

  const [notifPrompt, setNotifPrompt] = useState<NotificationPrompt | null>(null)
  const [formData, setFormData] = useState({
    client_name: '',
    insurer_name: '',
    broker_name: '',
    claim_reference: '',
    loss_date: '',
    location: '',
    status: 'draft' as CaseStatus,
    priority: 'normal' as CasePriority,
  })

  const { data: caseData, isLoading } = useCase(caseId)
  const updateCase = useUpdateCase()
  const updateStatus = useUpdateCaseStatus()
  const updatePriority = useUpdateCasePriority()

  useEffect(() => {
    if (caseData && !isEditing) {
      setFormData({
        client_name: caseData.client_name,
        insurer_name: caseData.insurer_name || '',
        broker_name: caseData.broker_name || '',
        claim_reference: caseData.claim_reference || '',
        loss_date: caseData.loss_date || '',
        location: caseData.location || '',
        status: caseData.status,
        priority: caseData.priority,
      })
    }
  }, [caseData, isEditing])

  const verticalConfig = caseData ? getVerticalConfig(caseData.vertical ?? 'general') : null

  const handleSave = async () => {
    try {
      await updateCase.mutateAsync({
        caseId,
        updates: {
          client_name: formData.client_name,
          insurer_name: formData.insurer_name || undefined,
          broker_name: formData.broker_name || undefined,
          claim_reference: formData.claim_reference || undefined,
          loss_date: formData.loss_date || undefined,
          location: formData.location || undefined,
          priority: formData.priority,
        },
      })
      setIsEditing(false)
    } catch (error: any) {
      alert(error.message || 'Failed to update case')
    }
  }

  const handleStatusChange = async (status: CaseStatus) => {
    try {
      const result = await updateStatus.mutateAsync({ caseId, status })
      if (result.notification_prompt) {
        setNotifPrompt(result.notification_prompt)
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update status')
    }
  }

  const handlePriorityChange = async (priority: CasePriority) => {
    try {
      await updatePriority.mutateAsync({ caseId, priority })
    } catch (error: any) {
      alert(error.message || 'Failed to update priority')
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading case...</p>
        </div>
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-charcoal text-lg mb-4">Case not found</p>
          <button
            onClick={() => router.push('/app/dashboard')}
            className="text-copper hover:opacity-80"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-5">
        <button
          onClick={() => router.push('/app/dashboard')}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cases
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-heading font-bold text-charcoal">
              {caseData.case_number}
            </h1>
            {verticalConfig && (
              <span className="px-2.5 py-0.5 text-xs font-medium bg-[#F5F2EE] text-slate rounded-full border border-[#D4CFC7]">
                {verticalConfig.label}
              </span>
            )}
            {isEditing ? (
              <select
                value={formData.priority}
                onChange={(e) => {
                  const p = e.target.value as CasePriority
                  setFormData({ ...formData, priority: p })
                  handlePriorityChange(p)
                }}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30"
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            ) : (
              <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full capitalize ${PRIORITY_COLORS[caseData.priority]}`}>
                {caseData.priority}
              </span>
            )}
          </div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false)
                  setFormData({
                    client_name: caseData.client_name,
                    insurer_name: caseData.insurer_name || '',
                    broker_name: caseData.broker_name || '',
                    claim_reference: caseData.claim_reference || '',
                    loss_date: caseData.loss_date || '',
                    location: caseData.location || '',
                    status: caseData.status,
                    priority: caseData.priority,
                  })
                }}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateCase.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          )}
        </div>
        <p className="text-slate mt-1">{caseData.client_name} &middot; {caseData.claim_reference || 'No ref'}</p>
      </div>

      {/* Status Bar */}
      <div className="mb-6">
        <div className="grid grid-cols-8 gap-0 border border-[#D4CFC7] rounded-lg overflow-hidden">
          {STATUS_OPTIONS.map((status, i) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`py-2.5 text-sm font-medium text-center transition-colors capitalize ${
                i < STATUS_OPTIONS.length - 1 ? 'border-r border-[#D4CFC7]' : ''
              } ${
                caseData.status === status
                  ? 'bg-charcoal text-white'
                  : 'bg-white text-charcoal hover:bg-[#FAFAF8]'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Workspace Tabs */}
      <CaseWorkspace caseData={caseData} orgSettings={{}} />

      {/* Notification Prompt Modal */}
      {notifPrompt && caseData && (
        <NotificationPromptModal
          prompt={notifPrompt}
          caseData={caseData}
          caseId={caseId}
          onClose={() => setNotifPrompt(null)}
        />
      )}
    </div>
  )
}

function NotificationPromptModal({
  prompt,
  caseData,
  caseId,
  onClose,
}: {
  prompt: NotificationPrompt
  caseData: any
  caseId: string
  onClose: () => void
}) {
  const STATUS_LABELS: Record<string, string> = {
    draft: 'Draft', assigned: 'Assigned', site_visit: 'Site Visit',
    awaiting_quote: 'Awaiting Quote', reporting: 'Reporting', submitted: 'Submitted',
    additional: 'Additional', closed: 'Closed',
  }

  const replacePlaceholders = (text: string) => {
    return text
      .replace(/\{\{CaseNumber\}\}/g, caseData.case_number || '')
      .replace(/\{\{ClientName\}\}/g, caseData.client_name || '')
      .replace(/\{\{InsurerName\}\}/g, caseData.insurer_name || '')
      .replace(/\{\{BrokerName\}\}/g, caseData.broker_name || '')
      .replace(/\{\{ClaimReference\}\}/g, caseData.claim_reference || '')
      .replace(/\{\{LossDate\}\}/g, caseData.loss_date || '')
      .replace(/\{\{Location\}\}/g, caseData.location || '')
  }

  const subject = prompt.template_subject ? replacePlaceholders(prompt.template_subject) : `Case ${caseData.case_number} status updated to ${STATUS_LABELS[prompt.to_status] || prompt.to_status}`
  const body = prompt.template_body ? replacePlaceholders(prompt.template_body) : `Case ${caseData.case_number} has been updated to ${STATUS_LABELS[prompt.to_status] || prompt.to_status}.`

  const [selectedRecipients, setSelectedRecipients] = useState<Record<RecipientType, boolean>>({
    client: prompt.default_recipients.includes('client'),
    broker: prompt.default_recipients.includes('broker'),
    insurer: prompt.default_recipients.includes('insurer'),
    panelbeater: prompt.default_recipients.includes('panelbeater'),
  })
  const [sending, setSending] = useState(false)
  const [emailInputs, setEmailInputs] = useState<Record<RecipientType, string>>({
    client: '',
    broker: '',
    insurer: '',
    panelbeater: '',
  })

  const RECIPIENT_LABELS: Record<RecipientType, string> = {
    client: `Client (${caseData.client_name || 'N/A'})`,
    broker: `Broker (${caseData.broker_name || 'N/A'})`,
    insurer: `Insurer (${caseData.insurer_name || 'N/A'})`,
    panelbeater: 'Panelbeater',
  }

  const handleSend = async () => {
    const activeTypes = (Object.entries(selectedRecipients) as [RecipientType, boolean][])
      .filter(([, v]) => v)
      .map(([k]) => k)

    const emails = activeTypes
      .map((t) => emailInputs[t])
      .filter(Boolean)

    if (emails.length === 0) {
      alert('Please enter at least one recipient email address')
      return
    }

    setSending(true)
    try {
      await sendCaseNotification(caseId, {
        rule_id: prompt.rule_id,
        recipients: emails,
        recipient_types: activeTypes,
        subject,
        body,
      })
      onClose()
    } catch (err: any) {
      alert(err.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto border border-[#D4CFC7]">
        <div className="flex items-start justify-between p-6 border-b border-[#D4CFC7]">
          <div>
            <h2 className="text-lg font-heading font-bold text-charcoal">
              Send Status Update Notification
            </h2>
            <p className="text-sm text-muted mt-1">
              Status changed to <span className="font-medium text-accent capitalize">{STATUS_LABELS[prompt.to_status] || prompt.to_status}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate hover:text-charcoal transition-colors ml-4 mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-2">Send to:</label>
            <div className="space-y-2">
              {(Object.keys(RECIPIENT_LABELS) as RecipientType[]).map((type) => (
                <div key={type} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedRecipients[type]}
                    onChange={(e) => setSelectedRecipients((prev) => ({ ...prev, [type]: e.target.checked }))}
                    className="rounded border-[#D4CFC7] text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-charcoal flex-shrink-0 w-40">{RECIPIENT_LABELS[type]}</span>
                  {selectedRecipients[type] && (
                    <input
                      type="email"
                      value={emailInputs[type]}
                      onChange={(e) => setEmailInputs((prev) => ({ ...prev, [type]: e.target.value }))}
                      placeholder="Email address"
                      className="flex-1 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate mb-1">Subject</label>
            <p className="text-sm text-charcoal bg-[#F5F2EE] rounded-lg px-3 py-2">{subject}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Message</label>
            <div className="text-sm text-charcoal bg-[#F5F2EE] rounded-lg px-3 py-2 whitespace-pre-wrap max-h-40 overflow-y-auto">
              {body}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-[#D4CFC7]">
          <button onClick={onClose} className="px-4 py-2 text-muted hover:text-slate transition-colors">
            Skip
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  )
}
