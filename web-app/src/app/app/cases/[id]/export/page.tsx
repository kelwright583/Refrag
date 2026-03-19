'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase } from '@/hooks/use-cases'
import { useAssessmentsForCase } from '@/hooks/use-assessments'
import {
  useExports,
  useGenerateAssessmentPDF,
  useExportDownloadUrl,
} from '@/hooks/use-exports'
import {
  ArrowLeft,
  Download,
  FileDown,
  Loader2,
  FileText,
  CheckCircle,
  ClipboardList,
  Image,
  FileArchive,
} from 'lucide-react'
import type { MotorAssessment } from '@/lib/types/assessment'
import { formatDate, formatDateTime } from '@/lib/utils/formatting'

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  ready: 'bg-blue-100 text-blue-800',
  submitted: 'bg-green-100 text-green-800',
}

const OUTCOME_LABEL: Record<string, string> = {
  repairable: 'Repairable',
  write_off: 'Write-Off',
  theft_total: 'Theft Total',
  partial_theft: 'Partial Theft',
  rejected: 'Rejected',
  further_investigation: 'Further Investigation',
}

function titleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function CaseExportPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string

  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [includePhotos, setIncludePhotos] = useState(true)
  const [includeDocs, setIncludeDocs] = useState(true)
  const [includeReport, setIncludeReport] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: caseData } = useCase(caseId)
  const { data: assessments, isLoading: assessmentsLoading } = useAssessmentsForCase(caseId)
  const { data: exports, isLoading: exportsLoading } = useExports(caseId)
  const generatePDF = useGenerateAssessmentPDF()

  const handleGenerate = async () => {
    if (!selectedAssessmentId) return
    try {
      setIsGenerating(true)
      const result = await generatePDF.mutateAsync({
        assessment_id: selectedAssessmentId,
        include_photos: includePhotos,
        include_documents: includeDocs,
      })
      if (result.download_url) {
        window.open(result.download_url, '_blank')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to generate PDF')
    } finally {
      setIsGenerating(false)
    }
  }

  const selectedAssessment = assessments?.find((a) => a.id === selectedAssessmentId) ?? null

  if (assessmentsLoading || exportsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
          <p className="text-slate mt-4">Loading...</p>
        </div>
      </div>
    )
  }

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
            <h1 className="text-3xl font-heading font-bold text-charcoal">Export</h1>
            <p className="text-slate mt-1">
              Generate assessment report PDFs for{' '}
              {caseData ? `${caseData.case_number} — ${caseData.client_name}` : 'this case'}
            </p>
          </div>
        </div>
      </div>

      {/* Assessment Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          Select Assessment
        </h2>

        {assessments && assessments.length > 0 ? (
          <div className="space-y-3">
            {assessments.map((a: MotorAssessment) => (
              <label
                key={a.id}
                className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedAssessmentId === a.id
                    ? 'border-copper bg-copper/5 ring-1 ring-copper'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="assessment"
                  value={a.id}
                  checked={selectedAssessmentId === a.id}
                  onChange={() => setSelectedAssessmentId(a.id)}
                  className="accent-copper w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-charcoal">
                      {titleCase(a.assessment_type)} Assessment
                    </span>
                    {a.sequence_number > 1 && (
                      <span className="text-xs text-slate">
                        ({a.assessment_sequence === 'supplementary' ? 'Supplementary' : 'Re-inspection'} #{a.sequence_number})
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-700'}`}>
                      {titleCase(a.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-slate">
                    <span>Assessed: {formatDate(a.date_assessed)}</span>
                    {a.outcome && (
                      <span className="font-medium">
                        Outcome: {OUTCOME_LABEL[a.outcome] || titleCase(a.outcome)}
                      </span>
                    )}
                    {a.claim_number && <span>Claim: {a.claim_number}</span>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="w-12 h-12 text-slate mx-auto mb-3" />
            <p className="text-slate">No assessments found for this case.</p>
            <p className="text-sm text-slate mt-1">Create an assessment first before exporting.</p>
          </div>
        )}
      </div>

      {/* Export Options */}
      {selectedAssessmentId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-heading font-bold text-charcoal mb-4">
            Export Options
          </h2>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReport}
                onChange={(e) => setIncludeReport(e.target.checked)}
                className="accent-copper w-4 h-4"
              />
              <FileText className="w-4 h-4 text-slate" />
              <div>
                <span className="font-medium text-charcoal">Assessment Report PDF</span>
                <p className="text-xs text-slate">Full assessment report with all sections, financials, and outcome</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includePhotos}
                onChange={(e) => setIncludePhotos(e.target.checked)}
                className="accent-copper w-4 h-4"
              />
              <Image className="w-4 h-4 text-slate" />
              <div>
                <span className="font-medium text-charcoal">Photo Evidence</span>
                <p className="text-xs text-slate">Linked photo evidence appended as separate pages</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDocs}
                onChange={(e) => setIncludeDocs(e.target.checked)}
                className="accent-copper w-4 h-4"
              />
              <FileArchive className="w-4 h-4 text-slate" />
              <div>
                <span className="font-medium text-charcoal">Original Documents</span>
                <p className="text-xs text-slate">Valuation certificate, repair estimate, parts quote</p>
              </div>
            </label>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !includeReport}
              className="flex items-center gap-2 px-6 py-3 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating PDF…
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5" />
                  Generate Export
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Export History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Export History</h2>

        {exports && exports.length > 0 ? (
          <div className="space-y-4">
            {exports.map((exportItem) => (
              <ExportItem key={exportItem.id} exportItem={exportItem} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate mx-auto mb-4" />
            <p className="text-slate">No exports yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ExportItem({ exportItem }: { exportItem: any }) {
  const { data: downloadUrl } = useExportDownloadUrl(
    exportItem.id,
    !!exportItem.storage_path
  )

  const handleDownload = () => {
    if (downloadUrl) window.open(downloadUrl, '_blank')
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-heading font-bold text-charcoal">
              {exportItem.export_type === 'assessment_report' ? 'Assessment Report' : 'Assessor Pack'}
            </h3>
            {exportItem.storage_path && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>

          <div className="space-y-1 text-sm text-slate">
            <p>
              <strong>Created:</strong>{' '}
              {formatDateTime(exportItem.created_at)}
            </p>
            {exportItem.meta?.assessment_type && (
              <p>
                <strong>Type:</strong> {exportItem.meta.assessment_type}
              </p>
            )}
            {exportItem.meta?.include_photos !== undefined && (
              <p>
                <strong>Photos:</strong> {exportItem.meta.include_photos ? 'Yes' : 'No'} ·{' '}
                <strong>Documents:</strong> {exportItem.meta.include_documents ? 'Yes' : 'No'}
              </p>
            )}
            {exportItem.meta?.generated_at && (
              <p>
                <strong>Generated:</strong>{' '}
                {formatDateTime(exportItem.meta.generated_at)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {exportItem.storage_path ? (
            <button
              onClick={handleDownload}
              disabled={!downloadUrl}
              className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          ) : (
            <span className="text-xs text-slate italic">Processing…</span>
          )}
        </div>
      </div>
    </div>
  )
}
