/**
 * Case detail page
 */

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase, useUpdateCase, useUpdateCaseStatus, useUpdateCasePriority } from '@/hooks/use-cases'
import { useCaseContacts, useCreateContact, useDeleteContact } from '@/hooks/use-contacts'
import { useRiskItems, useCreateRiskItem, useDeleteRiskItem } from '@/hooks/use-risk-items'
import Link from 'next/link'
import { ArrowLeft, Edit2, Save, X, FileText, FileCheck, MessageSquare, Download, Mic, Play, Trash2, Receipt, Shield, Plus, Car, Building2, Package } from 'lucide-react'
import { MapPreview, AddressAutocomplete } from '@/components/maps'
import { CaseStatus, CasePriority } from '@/lib/types/case'
import { RiskType, RISK_TYPE_LABELS, COVER_TYPE_LABELS, CoverType } from '@/lib/types/risk-item'
import { NotificationPrompt, RecipientType } from '@/lib/types/notification-rule'
import { sendCaseNotification } from '@/lib/api/notification-rules'

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

export default function CaseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string
  const [isEditing, setIsEditing] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({ scheduled_at: '', address: '', notes: '' })

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

  // Initialize form data when case loads
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
      // Check for notification prompt
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

  const handleCreateInvoice = () => {
    router.push(`/app/invoices/new?case_id=${caseId}`)
  }

  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleForm.scheduled_at) return
    setScheduleSaving(true)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          scheduled_at: new Date(scheduleForm.scheduled_at).toISOString(),
          address: scheduleForm.address || undefined,
          notes: scheduleForm.notes || undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setShowScheduleModal(false)
      setScheduleForm({ scheduled_at: '', address: '', notes: '' })
      router.push('/app/appointments')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setScheduleSaving(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
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

  const PRIORITY_COLORS: Record<CasePriority, string> = {
    low: 'bg-green-100 text-green-800',
    normal: 'bg-navy/10 text-navy',
    high: 'bg-red-100 text-red-700',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header — Case number + Priority tag + Edit */}
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
            {/* Priority tag — inline with case number */}
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
        <p className="text-slate mt-1">Case Details</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-charcoal mb-2">Quick Actions</label>
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Schedule Visit
          </button>
          <button
            type="button"
            onClick={handleCreateInvoice}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            Create Invoice
          </button>
          <Link
            href={`/app/cases/${caseId}/assessment`}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-copper text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <FileCheck className="w-4 h-4" />
            Assessment
          </Link>
          <Link
            href={`/app/cases/${caseId}/evidence`}
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-accent text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            <FileText className="w-4 h-4" />
            Evidence
          </Link>
          <Link
            href={`/app/cases/${caseId}/mandate`}
            className="flex items-center justify-center gap-2 px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal text-sm font-medium hover:bg-[#FAFAF8] transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            Mandate
          </Link>
          <Link
            href={`/app/cases/${caseId}/report`}
            className="flex items-center justify-center gap-2 px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal text-sm font-medium hover:bg-[#FAFAF8] transition-colors"
          >
            <Package className="w-4 h-4" />
            Report Pack
          </Link>
          <Link
            href={`/app/cases/${caseId}/comms`}
            className="flex items-center justify-center gap-2 px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal text-sm font-medium hover:bg-[#FAFAF8] transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Comms
          </Link>
          <Link
            href={`/app/cases/${caseId}/export`}
            className="flex items-center justify-center gap-2 px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal text-sm font-medium hover:bg-[#FAFAF8] transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </Link>
          <Link
            href="/app/invoices"
            className="flex items-center justify-center gap-2 px-3 py-2.5 border border-[#D4CFC7] rounded-lg text-charcoal text-sm font-medium hover:bg-[#FAFAF8] transition-colors"
          >
            <Receipt className="w-4 h-4" />
            Invoices
          </Link>
        </div>
      </div>

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[#D4CFC7]">
              <h3 className="text-lg font-heading font-bold text-charcoal">Schedule Visit</h3>
              <button onClick={() => setShowScheduleModal(false)} className="text-slate hover:text-charcoal transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleScheduleVisit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Date & time</label>
                <input
                  type="datetime-local"
                  value={scheduleForm.scheduled_at}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Address</label>
                <AddressAutocomplete
                  value={scheduleForm.address}
                  onChange={(val) => setScheduleForm((f) => ({ ...f, address: val }))}
                  placeholder={caseData.location || 'Visit address'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Notes</label>
                <textarea
                  value={scheduleForm.notes}
                  onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30 resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowScheduleModal(false)} className="px-4 py-2 text-muted hover:text-slate">Cancel</button>
                <button type="submit" disabled={scheduleSaving} className="px-4 py-2 bg-accent text-white rounded-lg font-medium disabled:opacity-60">Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-charcoal mb-2">Status</label>
        {isEditing ? (
          <div>
            <select
              value={formData.status}
              onChange={(e) => {
                const newStatus = e.target.value as CaseStatus
                setFormData({ ...formData, status: newStatus })
                handleStatusChange(newStatus)
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/30"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        ) : (
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
        )}
      </div>

      {/* Case Details Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-6">Case Overview</h2>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Client Name *
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.client_name}
                onChange={(e) =>
                  setFormData({ ...formData, client_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
                required
              />
            ) : (
              <p className="text-charcoal">{caseData.client_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Insurer Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.insurer_name}
                onChange={(e) =>
                  setFormData({ ...formData, insurer_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              />
            ) : (
              <p className="text-charcoal">{caseData.insurer_name || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Broker Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.broker_name}
                onChange={(e) =>
                  setFormData({ ...formData, broker_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              />
            ) : (
              <p className="text-charcoal">{caseData.broker_name || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Claim Reference
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.claim_reference}
                onChange={(e) =>
                  setFormData({ ...formData, claim_reference: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              />
            ) : (
              <p className="text-charcoal">{caseData.claim_reference || 'N/A'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Loss Date
            </label>
            {isEditing ? (
              <input
                type="date"
                value={formData.loss_date}
                onChange={(e) =>
                  setFormData({ ...formData, loss_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              />
            ) : (
              <p className="text-charcoal">{formatDate(caseData.loss_date)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">
              Location
            </label>
            {isEditing ? (
              <AddressAutocomplete
                value={formData.location}
                onChange={(val) => setFormData({ ...formData, location: val })}
                placeholder="Case location"
              />
            ) : (
              <>
                <p className="text-charcoal mb-2">{caseData.location || 'N/A'}</p>
                {caseData.location && (
                  <MapPreview address={caseData.location} height={180} className="rounded-lg" />
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Created
              </label>
              <p className="text-slate">{formatDate(caseData.created_at)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Last Updated
              </label>
              <p className="text-slate">{formatDate(caseData.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Items Section */}
      <CaseRiskItemsSection caseId={caseId} />

      {/* Case Contacts Section */}
      <CaseContactsSection caseId={caseId} />

      {/* Recordings Section */}
      <CaseRecordingsSection caseId={caseId} />

      {/* Notification Prompt Modal */}
      {notifPrompt && caseData && (
        <NotificationPromptModal
          prompt={notifPrompt}
          caseData={caseData}
          caseId={caseId}
          onClose={() => setNotifPrompt(null)}
        />
      )}

      {/* (Navigation links are now in the top action bar) */}
    </div>
  )
}

/**
 * Case Risk Items Section Component
 */
function CaseRiskItemsSection({ caseId }: { caseId: string }) {
  const { data: riskItems, isLoading } = useRiskItems(caseId)
  const createRiskItem = useCreateRiskItem()
  const deleteRiskItem = useDeleteRiskItem(caseId)
  const [showAdd, setShowAdd] = useState(false)
  const [newRiskType, setNewRiskType] = useState<RiskType | ''>('')
  const [newCoverType, setNewCoverType] = useState<CoverType | ''>('')
  const [newDescription, setNewDescription] = useState('')

  const handleAdd = async () => {
    if (!newRiskType) return
    try {
      await createRiskItem.mutateAsync({
        case_id: caseId,
        is_primary: !riskItems || riskItems.length === 0,
        risk_type: newRiskType,
        cover_type: newCoverType || undefined,
        description: newDescription || undefined,
        asset_data: {},
      })
      setShowAdd(false)
      setNewRiskType('')
      setNewCoverType('')
      setNewDescription('')
    } catch (error: any) {
      alert(error.message || 'Failed to add risk item')
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remove this risk item?')) {
      try {
        await deleteRiskItem.mutateAsync(id)
      } catch (error: any) {
        alert(error.message || 'Failed to delete risk item')
      }
    }
  }

  const getRiskIcon = (type: string) => {
    if (type === 'motor_vehicle') return <Car className="w-5 h-5 text-copper" />
    if (type === 'building') return <Building2 className="w-5 h-5 text-copper" />
    return <Package className="w-5 h-5 text-copper" />
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-heading font-bold text-charcoal">Risk Items</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Risk Item
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate">Loading risk items...</p>
      ) : riskItems && riskItems.length > 0 ? (
        <div className="space-y-3">
          {riskItems.map((item) => {
            const riskLabel = RISK_TYPE_LABELS[item.risk_type as RiskType] || item.risk_type
            const coverLabel = item.cover_type ? (COVER_TYPE_LABELS[item.cover_type as CoverType] || item.cover_type) : null

            return (
              <div key={item.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {getRiskIcon(item.risk_type)}
                    <span className="font-medium text-charcoal">{riskLabel}</span>
                    {item.is_primary && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-copper/10 text-copper rounded-full font-medium flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Primary
                      </span>
                    )}
                    {coverLabel && (
                      <span className="ml-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">{coverLabel}</span>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-slate">{item.description}</p>}
                  {item.asset_data && Object.keys(item.asset_data).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      {Object.entries(item.asset_data).map(([key, value]) => (
                        <span key={key} className="text-slate">
                          <span className="capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                          <span className="text-charcoal font-medium">{String(value)}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-red-600 hover:text-red-800 text-sm ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-slate">No risk items yet. Add one to describe what is being assessed.</p>
      )}

      {/* Add Risk Item Inline Form */}
      {showAdd && (
        <div className="mt-4 p-4 border border-[#D4CFC7] rounded-lg bg-[#F5F2EE]">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Risk Type *</label>
              <select
                value={newRiskType}
                onChange={(e) => setNewRiskType(e.target.value as RiskType | '')}
                className="w-full px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              >
                <option value="">Select...</option>
                {(Object.keys(RISK_TYPE_LABELS) as RiskType[]).map((rt) => (
                  <option key={rt} value={rt}>{RISK_TYPE_LABELS[rt]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Cover Type</label>
              <select
                value={newCoverType}
                onChange={(e) => setNewCoverType(e.target.value as CoverType | '')}
                className="w-full px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              >
                <option value="">Select...</option>
                {(Object.keys(COVER_TYPE_LABELS) as CoverType[]).map((ct) => (
                  <option key={ct} value={ct}>{COVER_TYPE_LABELS[ct]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Description</label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-sm text-muted hover:text-slate">Cancel</button>
            <button
              onClick={handleAdd}
              disabled={createRiskItem.isPending || !newRiskType}
              className="px-3 py-1.5 text-sm bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
            >
              {createRiskItem.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Case Contacts Section Component
 */
function CaseContactsSection({ caseId }: { caseId: string }) {
  const [showAddModal, setShowAddModal] = useState(false)
  const { data: contacts, isLoading } = useCaseContacts(caseId)
  const createContact = useCreateContact()
  const deleteContact = useDeleteContact()

  const handleDelete = async (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact.mutateAsync({ contactId, caseId })
      } catch (error: any) {
        alert(error.message || 'Failed to delete contact')
      }
    }
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-bold text-charcoal">Contacts</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          Add Contact
        </button>
      </div>

      {isLoading ? (
        <p className="text-slate">Loading contacts...</p>
      ) : contacts && contacts.length > 0 ? (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="flex items-start justify-between p-4 border border-gray-200 rounded-lg"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-charcoal">{contact.name}</span>
                  <span className="text-xs px-2 py-1 bg-gray-100 text-slate rounded capitalize">
                    {contact.type}
                  </span>
                </div>
                {contact.email && (
                  <p className="text-sm text-slate">{contact.email}</p>
                )}
                {contact.phone && (
                  <p className="text-sm text-slate">{contact.phone}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(contact.id)}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate">No contacts added yet.</p>
      )}

      {showAddModal && (
        <AddContactModal
          caseId={caseId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
          }}
          isLoading={createContact.isPending}
        />
      )}
    </div>
  )
}

/**
 * Case Recordings Section — list and add recordings
 */
interface RecordingRow {
  id: string
  recording_type: string
  storage_path: string
  duration_seconds: number | null
  consent_recorded: boolean
  created_at: string
}

function CaseRecordingsSection({ caseId }: { caseId: string }) {
  const [list, setList] = useState<RecordingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchRecordings = () => {
    setLoading(true)
    fetch(`/api/recordings?case_id=${caseId}`)
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchRecordings()
  }, [caseId])

  const handlePlay = async (id: string) => {
    const res = await fetch(`/api/recordings/${id}/signed-url`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
    else alert(data.error || 'Could not get playback URL')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recording?')) return
    const res = await fetch(`/api/recordings/${id}`, { method: 'DELETE' })
    if (res.ok) fetchRecordings()
    else alert((await res.json()).error)
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-heading font-bold text-charcoal flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Recordings
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Add recording
        </button>
      </div>
      {loading ? (
        <p className="text-slate">Loading recordings...</p>
      ) : list.length === 0 ? (
        <p className="text-slate">No recordings yet. Upload a call or site visit recording.</p>
      ) : (
        <div className="space-y-3">
          {list.map((rec) => (
            <div
              key={rec.id}
              className="flex items-center justify-between py-3 px-4 border border-gray-200 rounded-lg"
            >
              <div>
                <span className="text-sm font-medium text-charcoal capitalize">{rec.recording_type.replace('_', ' ')}</span>
                <span className="text-xs text-slate ml-2">
                  {new Date(rec.created_at).toLocaleString('en-ZA')}
                  {rec.duration_seconds != null && ` · ${rec.duration_seconds}s`}
                  {rec.consent_recorded && ' · Consent recorded'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePlay(rec.id)}
                  className="p-2 text-copper hover:bg-gray-100 rounded-lg transition-colors"
                  title="Play"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(rec.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {showAddModal && (
        <AddRecordingModal
          caseId={caseId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            fetchRecordings()
          }}
        />
      )}
    </div>
  )
}

/**
 * Add Recording Modal — file upload + type, duration, consent
 */
function AddRecordingModal({
  caseId,
  onClose,
  onSuccess,
}: {
  caseId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [recordingType, setRecordingType] = useState('call')
  const [durationSeconds, setDurationSeconds] = useState('')
  const [consentRecorded, setConsentRecorded] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      alert('Please select a file')
      return
    }
    setSaving(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('case_id', caseId)
      form.set('recording_type', recordingType)
      if (durationSeconds) form.set('duration_seconds', durationSeconds)
      form.set('consent_recorded', consentRecorded ? 'true' : 'false')
      const res = await fetch('/api/recordings/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error((await res.json()).error)
      onSuccess()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">Add Recording</h2>
          <button onClick={onClose} className="text-slate hover:text-charcoal transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">File</label>
            <input
              type="file"
              accept="audio/*,video/*,.mp3,.mp4,.m4a,.wav,.webm"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Type</label>
            <select
              value={recordingType}
              onChange={(e) => setRecordingType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            >
              <option value="call">Call</option>
              <option value="site_visit">Site visit</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Duration (seconds)</label>
            <input
              type="number"
              min={0}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(e.target.value)}
              placeholder="Optional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="consent"
              checked={consentRecorded}
              onChange={(e) => setConsentRecorded(e.target.checked)}
              className="rounded border-gray-300 text-copper focus:ring-copper"
            />
            <label htmlFor="consent" className="text-sm text-charcoal">Consent recorded</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-charcoal hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50">
              {saving ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Add Contact Modal Component
 */
function AddContactModal({
  caseId,
  onClose,
  onSuccess,
  isLoading,
}: {
  caseId: string
  onClose: () => void
  onSuccess: () => void
  isLoading?: boolean
}) {
  const [formData, setFormData] = useState({
    type: 'insured' as const,
    name: '',
    email: '',
    phone: '',
  })
  const createContact = useCreateContact()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createContact.mutateAsync({
        case_id: caseId,
        ...formData,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      })
      setFormData({ type: 'insured', name: '', email: '', phone: '' })
      onSuccess()
    } catch (error: any) {
      alert(error.message || 'Failed to create contact')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">Add Contact</h2>
          <button
            onClick={onClose}
            className="text-slate hover:text-charcoal transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value as any })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            >
              <option value="insured">Insured</option>
              <option value="broker">Broker</option>
              <option value="insurer">Insurer</option>
              <option value="panelbeater">Panelbeater</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
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
              disabled={isLoading || !formData.name.trim()}
              className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Notification Prompt Modal — shown after status change when a rule matches
 */
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

  // Replace template placeholders
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
          {/* Recipients */}
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

          {/* Preview */}
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
