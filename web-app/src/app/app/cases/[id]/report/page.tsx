/**
 * Case Report Pack page — bundles Assessment Report + supporting documents
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useReportPacksForCase,
  useReportPack,
  useCreateReportPack,
  useUpdateReportPackItem,
} from '@/hooks/use-report-packs'
import { useAssessmentsForCase } from '@/hooks/use-assessments'
import { useCase } from '@/hooks/use-cases'
import { useToast } from '@/components/Toast'
import {
  EMAIL_TEMPLATES,
  resolveTemplatePlaceholders,
} from '@/lib/comms/email-templates'
import { markdownToHtml } from '@/lib/utils/markdown'
import {
  ArrowLeft,
  Plus,
  FileText,
  Download,
  Mail,
  Package,
  Image,
  FileCheck,
  BarChart3,
  Wrench,
  AlertTriangle,
  Camera,
  Loader2,
  Send,
  X,
  Receipt,
} from 'lucide-react'
import type { ReportPackWithItems, ReportPackItem } from '@/lib/types/report-pack'
import { formatDate } from '@/lib/utils/formatting'

const ITEM_TYPE_LABELS: Record<string, string> = {
  assessment_report: 'Assessment Report',
  mm_codes: 'Identifier Codes / Valuation Lookup',
  parts_quote: 'Parts Quotation',
  labour_quote: 'Repairer / Labour Quote',
  photos: 'Photos & Evidence',
  invoice: 'Invoice',
}

const ITEM_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  assessment_report: FileCheck,
  mm_codes: BarChart3,
  parts_quote: Package,
  labour_quote: Wrench,
  photos: Image,
  invoice: Receipt,
}

export default function CaseReportPackPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string

  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [invoices, setInvoices] = useState<any[] | null>(null)

  const { data: caseData } = useCase(caseId)
  const { data: packs, isLoading: packsLoading } = useReportPacksForCase(caseId)
  const { data: pack, isLoading: packLoading } = useReportPack(selectedPackId ?? '')
  const { data: assessments } = useAssessmentsForCase(caseId)
  const createPack = useCreateReportPack()

  useEffect(() => {
    if (caseId) {
      fetch(`/api/invoices?case_id=${caseId}`)
        .then((r) => r.json())
        .then((data) => setInvoices(Array.isArray(data) ? data : []))
        .catch(() => setInvoices([]))
    }
  }, [caseId])

  const autoTitle = (() => {
    if (!caseData) return 'Report Pack'
    const ref = caseData.claim_reference || caseData.case_number
    return ref ? `${ref} — Report Pack` : `${caseData.case_number} Report Pack`
  })()

  const handleCreatePack = async (assessmentId: string, title: string) => {
    try {
      const newPack = await createPack.mutateAsync({
        case_id: caseId,
        assessment_id: assessmentId,
        title: title || autoTitle,
      })
      setSelectedPackId(newPack.id)
      setShowCreateModal(false)
    } catch (error: any) {
      alert(error.message || 'Failed to create report pack')
    }
  }

  if (packsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
            <h1 className="text-3xl font-heading font-bold text-charcoal">Report Pack</h1>
            <p className="text-slate mt-1">
              Bundle the Assessment Report with supporting documents for download or email
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={createPack.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            {createPack.isPending ? 'Creating...' : 'Create Report Pack'}
          </button>
        </div>
      </div>

      {/* Invoice warning banner */}
      {invoices !== null && invoices.length === 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              You haven&apos;t created an invoice for this case yet
            </p>
            <p className="text-sm text-amber-700 mt-1">
              Create an invoice before sending the report pack to the insurer.
            </p>
          </div>
          <button
            onClick={() => router.push(`/app/invoices/new?case_id=${caseId}`)}
            className="flex-shrink-0 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
          >
            Create Invoice
          </button>
        </div>
      )}

      {/* Pack selector */}
      {packs && packs.length > 0 && (
        <div className="mb-6 bg-white border border-[#D4CFC7] rounded-lg p-4">
          <label className="text-sm font-medium text-charcoal block mb-2">Select pack:</label>
          <select
            value={selectedPackId ?? ''}
            onChange={(e) => setSelectedPackId(e.target.value || null)}
            className="w-full max-w-md px-4 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
          >
            <option value="">— Select —</option>
            {packs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || `Pack ${formatDate(p.created_at)}`} ({p.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Pack content */}
      {selectedPackId && pack && (
        <ReportPackEditor
          pack={pack}
          caseId={caseId}
          caseData={caseData}
          hasInvoice={!!invoices?.length}
          onPackChange={() => {}}
        />
      )}

      {/* Empty state */}
      {packs && packs.length === 0 && !showCreateModal && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-12 text-center">
          <FileText className="w-16 h-16 text-slate/40 mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-charcoal mb-2">No report packs yet</h2>
          <p className="text-slate mb-6">
            Create a report pack to bundle the Assessment Report with MM codes, parts quote, labour quote and photos.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={createPack.isPending || !assessments?.length}
            className="px-6 py-3 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createPack.isPending ? 'Creating...' : 'Create Report Pack'}
          </button>
          {!assessments?.length && (
            <p className="text-sm text-amber-600 mt-4">Complete an assessment first.</p>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreatePackModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreatePack}
          isLoading={createPack.isPending}
          suggestedTitle={autoTitle}
          assessments={assessments ?? []}
        />
      )}
    </div>
  )
}

function ReportPackEditor({
  pack,
  caseId,
  caseData,
  hasInvoice,
  onPackChange,
}: {
  pack: ReportPackWithItems
  caseId: string
  caseData: any
  hasInvoice: boolean
  onPackChange: () => void
}) {
  const updateItem = useUpdateReportPackItem(pack.id)
  const { addToast } = useToast()
  const [downloading, setDownloading] = useState(false)
  const [generatingPhotoPdf, setGeneratingPhotoPdf] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)

  const handleToggleInclude = async (item: ReportPackItem) => {
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        input: { included: !item.included },
      })
    } catch (error: any) {
      addToast(error.message || 'Failed to update', 'error')
    }
  }

  const handleDownloadZip = async () => {
    setDownloading(true)
    try {
      const response = await fetch(`/api/report-packs/${pack.id}/download`)
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Download failed' }))
        throw new Error(err.error || 'Download failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
        'Report_Pack.zip'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      addToast('Report pack downloaded', 'success')
    } catch (error: any) {
      addToast(error.message || 'Failed to download ZIP', 'error')
    } finally {
      setDownloading(false)
    }
  }

  const handleGeneratePhotoPdf = async () => {
    setGeneratingPhotoPdf(true)
    try {
      const response = await fetch(`/api/report-packs/${pack.id}/photo-pdf`, {
        method: 'POST',
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Generation failed' }))
        throw new Error(err.error || 'Photo PDF generation failed')
      }
      addToast('Photo Evidence PDF generated and added to pack', 'success')
    } catch (error: any) {
      addToast(error.message || 'Failed to generate Photo PDF', 'error')
    } finally {
      setGeneratingPhotoPdf(false)
    }
  }

  const includedCount = pack.items.filter((i) => i.included).length

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-1">
          {pack.title || 'Report Pack'}
        </h2>
        <p className="text-sm text-slate mb-4">
          {includedCount} of {pack.items.length} documents included. Uncheck to exclude from download/email.
        </p>

        <div className="space-y-2">
          {pack.items.map((item) => {
            const Icon = ITEM_TYPE_ICONS[item.item_type] ?? FileText
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between py-3 px-4 rounded-lg border transition-colors ${
                  item.included ? 'bg-[#FAFAF8] border-[#D4CFC7]' : 'bg-gray-50 border-gray-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-copper" />
                  <span className="font-medium text-charcoal">
                    {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.included}
                    onChange={() => handleToggleInclude(item)}
                    disabled={updateItem.isPending}
                    className="w-4 h-4 rounded border-[#D4CFC7] text-copper focus:ring-copper"
                  />
                  <span className="text-sm text-slate">Include</span>
                </label>
              </div>
            )
          })}

          {/* Invoice row (if exists) */}
          {hasInvoice && (
            <div className="flex items-center justify-between py-3 px-4 rounded-lg border bg-[#FAFAF8] border-[#D4CFC7]">
              <div className="flex items-center gap-3">
                <Receipt className="w-5 h-5 text-copper" />
                <span className="font-medium text-charcoal">Invoice</span>
              </div>
              <span className="text-xs text-green-600 font-medium">Available</span>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-[#D4CFC7] flex flex-wrap gap-3">
          <a
            href={`/app/cases/${caseId}/assessment/${pack.assessment_id}/report`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-copper text-copper rounded-lg hover:bg-copper/5 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Preview Assessment Report
          </a>
          <button
            onClick={handleGeneratePhotoPdf}
            disabled={generatingPhotoPdf}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D4CFC7] text-charcoal rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {generatingPhotoPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            {generatingPhotoPdf ? 'Generating...' : 'Generate Photo PDF'}
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={downloading || includedCount === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {downloading ? 'Generating ZIP...' : 'Download as ZIP'}
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D4CFC7] text-charcoal rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Mail className="w-4 h-4" />
            Email to Insurer
          </button>
        </div>
      </div>

      {showEmailModal && (
        <EmailInsurerModal
          caseId={caseId}
          caseData={caseData}
          pack={pack}
          onClose={() => setShowEmailModal(false)}
          onSent={() => {
            setShowEmailModal(false)
            addToast('Report pack email sent to insurer', 'success')
          }}
        />
      )}
    </div>
  )
}

function EmailInsurerModal({
  caseId,
  caseData,
  pack,
  onClose,
  onSent,
}: {
  caseId: string
  caseData: any
  pack: ReportPackWithItems
  onClose: () => void
  onSent: () => void
}) {
  const template = EMAIL_TEMPLATES.find((t) => t.id === 'report_pack_delivery')!
  const { addToast } = useToast()

  const placeholders: Record<string, string> = {
    CaseNumber: caseData?.case_number || '',
    ClientName: caseData?.client_name || '',
    InsurerName: caseData?.insurer_name || '',
    BrokerName: caseData?.broker_name || '',
    ClaimReference: caseData?.claim_reference || '',
    LossDate: caseData?.loss_date
      ? formatDate(caseData.loss_date)
      : '',
    Location: caseData?.location || '',
  }

  const [to, setTo] = useState(caseData?.insurer_email || '')
  const [subject, setSubject] = useState(
    resolveTemplatePlaceholders(template.subject, placeholders)
  )
  const [bodyMd, setBodyMd] = useState(
    resolveTemplatePlaceholders(template.body, placeholders)
  )
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!to.trim()) {
      addToast('Recipient email is required', 'warning')
      return
    }
    setSending(true)
    try {
      const response = await fetch('/api/comms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.trim(),
          subject,
          template_id: 'report_pack_delivery',
          case_id: caseId,
          assessment_id: pack.assessment_id,
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

      onSent()
    } catch (error: any) {
      addToast(error.message || 'Failed to send', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#D4CFC7]">
          <h2 className="text-xl font-heading font-bold text-charcoal">Email Report Pack to Insurer</h2>
          <button onClick={onClose} className="text-slate hover:text-charcoal transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">To *</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-4 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              placeholder="insurer@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email Body</label>
            <textarea
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              rows={14}
              className="w-full px-4 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#D4CFC7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#D4CFC7] rounded-lg text-charcoal hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !to.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreatePackModal({
  onClose,
  onCreate,
  isLoading,
  suggestedTitle,
  assessments,
}: {
  onClose: () => void
  onCreate: (assessmentId: string, title: string) => void
  isLoading: boolean
  suggestedTitle: string
  assessments: { id: string; claim_number: string | null; sequence_number: number }[]
}) {
  const [assessmentId, setAssessmentId] = useState(assessments[0]?.id ?? '')
  const [title, setTitle] = useState(suggestedTitle)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (assessmentId && title.trim()) {
      onCreate(assessmentId, title.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-[#D4CFC7]">
          <h2 className="text-xl font-heading font-bold text-charcoal">Create Report Pack</h2>
          <button onClick={onClose} className="text-slate hover:text-charcoal transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Assessment *</label>
            <select
              value={assessmentId}
              onChange={(e) => setAssessmentId(e.target.value)}
              className="w-full px-4 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              required
            >
              <option value="">— Select assessment —</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>
                  Assessment #{a.sequence_number} {a.claim_number ? `(${a.claim_number})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Pack Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              placeholder="e.g. CLM-001 — Report Pack"
              required
            />
            <p className="text-xs text-slate mt-1.5">Auto-populated from case — edit if needed.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#D4CFC7]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#D4CFC7] rounded-lg text-charcoal hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !assessmentId || !title.trim()}
              className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isLoading ? 'Creating...' : 'Create Pack'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
