/**
 * Case Report Pack page — bundles Assessment Report + supporting documents
 */

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useReportPacksForCase,
  useReportPack,
  useCreateReportPack,
  useUpdateReportPackItem,
} from '@/hooks/use-report-packs'
import { useAssessmentsForCase } from '@/hooks/use-assessments'
import { useCase } from '@/hooks/use-cases'
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
} from 'lucide-react'
import type { ReportPackWithItems, ReportPackItem } from '@/lib/types/report-pack'

const ITEM_TYPE_LABELS: Record<string, string> = {
  assessment_report: 'Assessment Report',
  mm_codes: 'MM Codes / TransUnion Printout',
  parts_quote: 'Parts Quotation',
  labour_quote: 'Repairer / Labour Quote',
  photos: 'Photos & Evidence',
}

const ITEM_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  assessment_report: FileCheck,
  mm_codes: BarChart3,
  parts_quote: Package,
  labour_quote: Wrench,
  photos: Image,
}

export default function CaseReportPackPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string

  const [selectedPackId, setSelectedPackId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const { data: caseData } = useCase(caseId)
  const { data: packs, isLoading: packsLoading } = useReportPacksForCase(caseId)
  const { data: pack, isLoading: packLoading } = useReportPack(selectedPackId ?? '')
  const { data: assessments } = useAssessmentsForCase(caseId)
  const createPack = useCreateReportPack()

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
                {p.title || `Pack ${new Date(p.created_at).toLocaleDateString('en-ZA')}`} ({p.status})
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
  onPackChange,
}: {
  pack: ReportPackWithItems
  caseId: string
  onPackChange: () => void
}) {
  const updateItem = useUpdateReportPackItem(pack.id)

  const handleToggleInclude = async (item: ReportPackItem) => {
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        input: { included: !item.included },
      })
    } catch (error: any) {
      alert(error.message || 'Failed to update')
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
            onClick={() => alert('ZIP download coming soon — use browser Print to PDF from the report preview for now.')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Download as ZIP
          </button>
          <button
            onClick={() => alert('Email pack coming soon.')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#D4CFC7] text-charcoal rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Mail className="w-4 h-4" />
            Email to Insurer
          </button>
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
