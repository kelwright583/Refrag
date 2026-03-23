'use client'

import { useState, useCallback } from 'react'
import { FileEdit, Plus, Loader2, AlertCircle } from 'lucide-react'
import { useCase } from '@/hooks/use-cases'
import { useReports, useCreateReport } from '@/hooks/use-reports'
import type { SectionState } from '@/components/report/SectionEditor'
import dynamic from 'next/dynamic'

const ReportBuilder = dynamic(() => import('@/components/report/ReportBuilder'), {
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

export function ReportBuilderSection({ caseId, orgSettings }: SectionProps) {
  const { data: caseData, isLoading: caseLoading } = useCase(caseId)
  const { data: reports, isLoading: reportsLoading } = useReports(caseId)
  const createReport = useCreateReport()
  const [creating, setCreating] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const report = reports?.[0] ?? null

  const orgBranding = {
    name: orgSettings?.name ?? 'Organisation',
    logoUrl: orgSettings?.logo_url ?? orgSettings?.logoUrl ?? null,
    primaryColor: orgSettings?.primary_color ?? orgSettings?.primaryColor ?? '#B87333',
  }

  const handleCreateReport = async () => {
    if (!caseData) return
    setCreating(true)
    try {
      await createReport.mutateAsync({
        caseId,
        input: {
          case_id: caseId,
          title: caseData.claim_reference
            ? `${caseData.claim_reference} — Assessment Report`
            : `Case ${caseData.case_number ?? caseId.slice(0, 8)} Report`,
        },
      })
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleSave = useCallback(async (sections: SectionState[], selectedOutcome: string | null) => {
    if (!report) return
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const res = await fetch(`/api/reports/${report.id}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sections: sections.map((s, idx) => ({
            section_key: s.key,
            heading: s.heading,
            body_md: s.bodyMd,
            order_index: idx,
          })),
          outcome: selectedOutcome,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error ?? 'Failed to save report')
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setSaveError(err.message)
    }
  }, [report])

  if (caseLoading || reportsLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    )
  }

  if (!caseData) {
    return (
      <div className="flex items-center gap-2 p-4 border border-red-200 bg-red-50 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-500" />
        <p className="text-sm text-red-700">Could not load case data.</p>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-10 text-center">
        <FileEdit className="w-10 h-10 text-slate/30 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-charcoal mb-1">No report started</h3>
        <p className="text-xs text-slate mb-4">Create a new report to start drafting content for this case.</p>
        <button
          onClick={handleCreateReport}
          disabled={creating || createReport.isPending}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium text-sm"
        >
          {(creating || createReport.isPending) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {(creating || createReport.isPending) ? 'Creating...' : 'Create Report'}
        </button>
        {(saveError || createReport.error) && (
          <p className="text-xs text-red-600 mt-2">{saveError ?? (createReport.error as any)?.message}</p>
        )}
      </div>
    )
  }

  // Build initial sections from the report (use-reports useReport hook returns sections via getReport)
  // We'll pass undefined and let ReportBuilder use its defaults with config templates
  const initialSections = undefined

  return (
    <div className="space-y-3">
      {/* Report header info */}
      <div className="flex items-center justify-between p-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
        <div className="flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-copper" />
          <span className="text-sm font-medium text-charcoal">{report.title}</span>
          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">
            v{report.version}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            report.status === 'submitted' ? 'bg-green-100 text-green-700' :
            report.status === 'ready' ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'
          }`}>
            {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
          </span>
        </div>
        {saveSuccess && (
          <span className="text-xs text-green-600 font-medium">Saved successfully</span>
        )}
        {saveError && (
          <span className="text-xs text-red-600">{saveError}</span>
        )}
      </div>

      <ReportBuilder
        caseData={{
          id: caseData.id,
          case_number: caseData.case_number,
          claim_reference: caseData.claim_reference ?? undefined,
          client_name: caseData.client_name,
          loss_date: caseData.loss_date ?? undefined,
          vertical: (caseData as any).vertical ?? 'general',
        }}
        reportId={report.id}
        orgBranding={orgBranding}
        initialSections={initialSections}
        onSave={handleSave}
      />
    </div>
  )
}
