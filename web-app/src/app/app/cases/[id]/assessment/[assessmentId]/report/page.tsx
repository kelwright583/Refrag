'use client'

import { useParams, useRouter } from 'next/navigation'
import { useAssessment, useAssessmentSettings } from '@/hooks/use-assessments'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer, Download } from 'lucide-react'
import { AssessmentReport } from '@/components/assessment/AssessmentReport'
import type { OrgStationery } from '@/components/assessment/AssessmentReport'

async function fetchStationery(): Promise<OrgStationery | null> {
  const res = await fetch('/api/settings/stationery')
  if (!res.ok) return null
  return res.json()
}

export default function AssessmentReportPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string
  const assessmentId = params.assessmentId as string

  const { data: assessment, isLoading } = useAssessment(assessmentId)
  const { data: settings } = useAssessmentSettings()
  const { data: stationery } = useQuery({
    queryKey: ['org-stationery'],
    queryFn: fetchStationery,
    staleTime: 1000 * 60 * 10,
  })

  const handlePrint = () => window.print()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-charcoal text-lg">Assessment not found.</p>
        <button onClick={() => router.back()} className="text-copper hover:opacity-80 text-sm">← Go back</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F3EF]">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-[#D4CFC7] px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => router.push(`/app/cases/${caseId}/assessment`)}
          className="flex items-center gap-2 text-slate hover:text-charcoal transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessment
        </button>
        <div className="flex-1" />
        <span className="text-xs text-slate hidden sm:block">
          {assessment.status === 'submitted' ? '✓ Submitted' : assessment.status === 'ready' ? '✓ Ready' : 'Draft'}
        </span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal hover:bg-[#FAFAF8] transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print / Save PDF
        </button>
      </div>

      {/* Report */}
      <div className="py-8 px-4 sm:px-8 print:p-0 print:bg-white">
        <AssessmentReport assessment={assessment} settings={settings ?? null} stationery={stationery} />
      </div>
    </div>
  )
}
