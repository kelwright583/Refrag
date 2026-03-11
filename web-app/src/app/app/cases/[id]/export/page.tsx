/**
 * Case export page
 */

'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useCase } from '@/hooks/use-cases'
import { useReports } from '@/hooks/use-reports'
import {
  useExports,
  useCreateExport,
  useGenerateExportPDF,
  useExportDownloadUrl,
} from '@/hooks/use-exports'
import { ArrowLeft, Download, FileDown, Loader2, FileText, CheckCircle } from 'lucide-react'

export default function CaseExportPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [generatingExportId, setGeneratingExportId] = useState<string | null>(null)

  const { data: caseData } = useCase(caseId)
  const { data: reports } = useReports(caseId)
  const { data: exports, isLoading: exportsLoading } = useExports(caseId)
  const createExport = useCreateExport()
  const generatePDF = useGenerateExportPDF()

  const handleCreateExport = async () => {
    try {
      const newExport = await createExport.mutateAsync({
        caseId,
        input: {
          case_id: caseId,
          report_id: selectedReportId || undefined,
          export_type: 'assessor_pack',
        },
      })
      setGeneratingExportId(newExport.id)
      
      // Generate PDF immediately
      await generatePDF.mutateAsync(newExport.id)
      setGeneratingExportId(null)
    } catch (error: any) {
      alert(error.message || 'Failed to create export')
      setGeneratingExportId(null)
    }
  }

  const handleGeneratePDF = async (exportId: string) => {
    try {
      setGeneratingExportId(exportId)
      await generatePDF.mutateAsync(exportId)
      setGeneratingExportId(null)
    } catch (error: any) {
      alert(error.message || 'Failed to generate PDF')
      setGeneratingExportId(null)
    }
  }

  if (exportsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-copper"></div>
          <p className="text-slate mt-4">Loading exports...</p>
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
            <p className="text-slate mt-1">Generate Assessor Pack PDF</p>
          </div>
        </div>
      </div>

      {/* Create Export Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4">
          Create New Export
        </h2>

        <div className="space-y-4">
          {reports && reports.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Select Report (Optional)
              </label>
              <select
                value={selectedReportId || ''}
                onChange={(e) => setSelectedReportId(e.target.value || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper"
              >
                <option value="">-- No report (include case info only) --</option>
                {reports.map((report) => (
                  <option key={report.id} value={report.id}>
                    Version {report.version} - {report.title} ({report.status})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate mt-1">
                If a report is selected, it will be included in the PDF. Otherwise, only case
                information and evidence list will be included.
              </p>
            </div>
          )}

          <button
            onClick={handleCreateExport}
            disabled={createExport.isPending || generatingExportId !== null}
            className="flex items-center gap-2 px-6 py-3 bg-copper text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {createExport.isPending || generatingExportId !== null ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <FileDown className="w-5 h-5" />
                Generate Assessor Pack PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* Export History */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-heading font-bold text-charcoal mb-4">Export History</h2>

        {exports && exports.length > 0 ? (
          <div className="space-y-4">
            {exports.map((exportItem) => (
              <ExportItem
                key={exportItem.id}
                exportItem={exportItem}
                isGenerating={generatingExportId === exportItem.id}
                onGenerate={() => handleGeneratePDF(exportItem.id)}
              />
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

/**
 * Export Item Component
 */
function ExportItem({
  exportItem,
  isGenerating,
  onGenerate,
}: {
  exportItem: any
  isGenerating: boolean
  onGenerate: () => void
}) {
  const { data: downloadUrl } = useExportDownloadUrl(
    exportItem.id,
    !!exportItem.storage_path
  )

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA')
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-heading font-bold text-charcoal">
              Assessor Pack Export
            </h3>
            {exportItem.storage_path && (
              <CheckCircle className="w-5 h-5 text-green-600" />
            )}
          </div>

          <div className="space-y-1 text-sm text-slate">
            <p>
              <strong>Created:</strong> {formatDate(exportItem.created_at)}
            </p>
            {exportItem.report && (
              <p>
                <strong>Report:</strong> {exportItem.report.title} (Version{' '}
                {exportItem.report.version})
              </p>
            )}
            {exportItem.meta?.evidence_count !== undefined && (
              <p>
                <strong>Evidence Items:</strong> {exportItem.meta.evidence_count}
              </p>
            )}
            {exportItem.meta?.generated_at && (
              <p>
                <strong>Generated:</strong> {formatDate(exportItem.meta.generated_at)}
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
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  Generate PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
