'use client'

import { useState } from 'react'
import { Eye, Download, Loader2, AlertCircle, FileEdit, ExternalLink } from 'lucide-react'
import { useReports, useReport } from '@/hooks/use-reports'
import { useCase } from '@/hooks/use-cases'
import dynamic from 'next/dynamic'
import type { SectionState } from '@/components/report/SectionEditor'

const ReportPreview = dynamic(() => import('@/components/report/ReportPreview'), {
  loading: () => (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-6 h-6 animate-spin text-copper" />
    </div>
  ),
  ssr: false,
})

interface SectionProps {
  caseId: string
  orgSettings: any
}

export function ReportPreviewSection({ caseId, orgSettings }: SectionProps) {
  const { data: caseData, isLoading: caseLoading } = useCase(caseId)
  const { data: reports, isLoading: reportsLoading } = useReports(caseId)
  const report = reports?.[0] ?? null

  const { data: reportWithSections, isLoading: sectionsLoading } = useReport(report?.id ?? '')

  const [generating, setGenerating] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const orgBranding = {
    name: orgSettings?.name ?? 'Organisation',
    logoUrl: orgSettings?.logo_url ?? orgSettings?.logoUrl ?? null,
    primaryColor: orgSettings?.primary_color ?? orgSettings?.primaryColor ?? '#B87333',
  }

  const isLoading = caseLoading || reportsLoading || sectionsLoading

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    )
  }

  if (!report || !caseData) {
    return (
      <div className="rounded-xl border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-10 text-center">
        <FileEdit className="w-10 h-10 text-slate/30 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-charcoal mb-1">No report yet</h3>
        <p className="text-xs text-slate">Build your report first in the Report Builder tab.</p>
      </div>
    )
  }

  // Map DB sections to SectionState for ReportPreview
  const sections: SectionState[] = (reportWithSections?.sections ?? []).map(s => ({
    key: s.section_key,
    heading: s.heading,
    bodyMd: s.body_md,
    isComplete: s.body_md.trim().length > 0,
    aiDraft: null,
    aiDraftPending: false,
  }))

  const handleGeneratePdf = async () => {
    setGenerating(true)
    setPdfError(null)
    setPdfUrl(null)
    try {
      const res = await fetch(`/api/reports/${report.id}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'PDF generation failed' }))
        throw new Error(err.error ?? 'PDF generation failed')
      }
      const data = await res.json()
      setPdfUrl(data.url)
    } catch (err: any) {
      setPdfError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex items-center justify-between p-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-slate" />
          <span className="text-sm font-medium text-charcoal">{report.title}</span>
          <span className="text-xs text-slate/60">v{report.version}</span>
        </div>
        <div className="flex items-center gap-2">
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-green-300 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Download PDF
            </a>
          )}
          <button
            onClick={handleGeneratePdf}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
          >
            {generating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {generating ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {/* PDF error */}
      {pdfError && (
        <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{pdfError}</p>
        </div>
      )}

      {/* PDF success banner */}
      {pdfUrl && (
        <div className="flex items-center gap-2 p-3 border border-green-200 bg-green-50 rounded-lg">
          <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700">
            PDF generated successfully.{' '}
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline hover:no-underline">
              Click here to download
            </a>{' '}
            (link valid for 1 hour).
          </p>
        </div>
      )}

      {/* Report preview */}
      {sections.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <p className="text-sm text-slate">No sections to preview. Add content in the Report Builder tab.</p>
        </div>
      ) : (
        <div className="max-w-lg mx-auto">
          <ReportPreview
            sections={sections}
            orgBranding={orgBranding}
            caseDetails={{
              caseNumber: caseData.case_number,
              claimReference: caseData.claim_reference ?? undefined,
              clientName: caseData.client_name,
              lossDate: caseData.loss_date ?? undefined,
            }}
            reportTitle={report.title}
          />
        </div>
      )}
    </div>
  )
}
