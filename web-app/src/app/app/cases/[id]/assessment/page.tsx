'use client'

import { useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, ClipboardList, Car, BarChart3, Wrench, Package, Calculator, FileText, ChevronRight, Image, CircleDot } from 'lucide-react'
import { useAssessmentsForCase, useCreateAssessment, useAssessment } from '@/hooks/use-assessments'
import { useCase } from '@/hooks/use-cases'
import { InstructionTab } from '@/components/assessment/InstructionTab'
import { VehicleDetailsTab } from '@/components/assessment/VehicleDetailsTab'
import { TyresTab } from '@/components/assessment/TyresTab'
import { DamagesLabourTab } from '@/components/assessment/DamagesLabourTab'
import { PartsAssessmentTab } from '@/components/assessment/PartsAssessmentTab'
import { MMCodesValuesTab } from '@/components/assessment/MMCodesValuesTab'
import { PhotosEvidenceTab } from '@/components/assessment/PhotosEvidenceTab'
import { OutcomeFinancialsTab } from '@/components/assessment/OutcomeFinancialsTab'
import { FindingsTab } from '@/components/assessment/FindingsTab'
import type { MotorAssessment } from '@/lib/types/assessment'
import { formatDate } from '@/lib/utils/formatting'

const TABS = [
  { key: 'instruction', label: 'Instruction', icon: ClipboardList },
  { key: 'vehicle', label: 'Vehicle', icon: Car },
  { key: 'tyres', label: 'Tyres', icon: CircleDot },
  { key: 'damages', label: 'Damages / Labour', icon: Wrench },
  { key: 'parts', label: 'Parts', icon: Package },
  { key: 'values', label: 'MM Codes / Values', icon: BarChart3 },
  { key: 'photos', label: 'Photos & Evidence', icon: Image },
  { key: 'outcome', label: 'Outcome & Financials', icon: Calculator },
  { key: 'findings', label: 'Findings', icon: FileText },
] as const

type TabKey = typeof TABS[number]['key']

const SEQUENCE_LABELS: Record<string, string> = {
  initial: 'Initial',
  supplementary: 'Supplementary',
  re_inspection: 'Re-inspection',
}

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const caseId = params.id as string
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('instruction')
  const handleNavigate = useCallback((tab: string) => setActiveTab(tab as TabKey), [])
  const createAssessment = useCreateAssessment()

  const { data: caseData } = useCase(caseId)
  const { data: assessments, isLoading: assessmentsLoading } = useAssessmentsForCase(caseId)

  // Auto-select if only one assessment exists
  const effectiveId = selectedAssessmentId
    ?? (assessments?.length === 1 ? assessments[0].id : null)

  const { data: fullAssessment, isLoading: fullAssessmentLoading } = useAssessment(effectiveId ?? '')

  // Pre-populate from case fields so InstructionTab arrives with data already filled
  const handleCreateInitial = useCallback(async () => {
    const data = await createAssessment.mutateAsync({
      case_id: caseId,
      insurer_name: caseData?.insurer_name ?? undefined,
      claim_number: caseData?.claim_reference ?? undefined,
      date_of_loss: caseData?.loss_date ?? undefined,
      insured_name: caseData?.client_name ?? undefined,
      assessment_location: caseData?.location ?? undefined,
    })
    setSelectedAssessmentId(data.id)
  }, [caseId, caseData, createAssessment])

  const handleCreateSupplementary = useCallback(async (parentId: string) => {
    const data = await createAssessment.mutateAsync({
      case_id: caseId,
      assessment_sequence: 'supplementary',
      parent_assessment_id: parentId,
      // Carry the same case-level defaults for supplementary assessments too
      insurer_name: caseData?.insurer_name ?? undefined,
      claim_number: caseData?.claim_reference ?? undefined,
      date_of_loss: caseData?.loss_date ?? undefined,
      insured_name: caseData?.client_name ?? undefined,
    })
    setSelectedAssessmentId(data.id)
  }, [caseId, caseData, createAssessment])

  if (assessmentsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-copper" />
        </div>
      </div>
    )
  }

  const hasAssessments = (assessments?.length ?? 0) > 0

  // Assessment list / create screen
  if (!effectiveId || (!fullAssessment && !fullAssessmentLoading)) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.push(`/app/cases/${caseId}`)}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Case
        </button>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-heading font-bold text-charcoal">Assessments</h2>
          {hasAssessments && (
            <button
              onClick={handleCreateInitial}
              disabled={createAssessment.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              New Assessment
            </button>
          )}
        </div>

        {!hasAssessments ? (
          <div className="bg-white border border-[#D4CFC7] rounded-xl p-12 text-center">
            <ClipboardList className="w-12 h-12 text-slate/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-charcoal mb-2">No assessments yet</h3>
            <p className="text-slate text-sm mb-6">Create the initial assessment for this case.</p>
            <button
              onClick={handleCreateInitial}
              disabled={createAssessment.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity font-medium disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {createAssessment.isPending ? 'Creating...' : 'Create Assessment'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {assessments!.map((a: MotorAssessment) => (
              <div
                key={a.id}
                className="bg-white border border-[#D4CFC7] rounded-xl p-5 flex items-center justify-between hover:border-copper/50 cursor-pointer transition-colors"
                onClick={() => setSelectedAssessmentId(a.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-copper/10 flex items-center justify-center">
                    <span className="text-copper font-bold text-sm">#{a.sequence_number}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-charcoal">
                        {SEQUENCE_LABELS[a.assessment_sequence]} Assessment
                      </span>
                      <OutcomeChip outcome={a.outcome} />
                      <StatusChip status={a.status} />
                    </div>
                    <p className="text-sm text-slate mt-0.5">
                      {a.claim_number ? `Claim: ${a.claim_number}` : 'No claim number'}
                      {a.date_assessed ? ` · Assessed: ${formatDate(a.date_assessed)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCreateSupplementary(a.id) }}
                    className="text-xs text-slate hover:text-copper border border-[#D4CFC7] px-3 py-1.5 rounded-lg transition-colors"
                  >
                    + Supplementary
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate/40" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Assessment editor
  if (fullAssessmentLoading || !fullAssessment) {
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
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => assessments && assessments.length > 1 ? setSelectedAssessmentId(null) : router.push(`/app/cases/${caseId}`)}
          className="flex items-center gap-2 text-slate hover:text-charcoal mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {assessments && assessments.length > 1 ? 'All Assessments' : 'Back to Case'}
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-heading font-bold text-charcoal">
            {SEQUENCE_LABELS[fullAssessment.assessment_sequence]} Assessment #{fullAssessment.sequence_number}
          </h2>
          <OutcomeChip outcome={fullAssessment.outcome} />
          <StatusChip status={fullAssessment.status} />
          <a
            href={`/app/cases/${caseId}/assessment/${fullAssessment.id}/report`}
            className="ml-auto flex items-center gap-2 px-4 py-2 border border-copper text-copper rounded-lg hover:bg-copper/5 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Preview Report
          </a>
        </div>
        {fullAssessment.claim_number && (
          <p className="text-slate text-sm mt-1">Claim: {fullAssessment.claim_number} · {fullAssessment.insurer_name}</p>
        )}
      </div>

      {/* Tab bar */}
      <div className="border-b border-[#D4CFC7] mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === key
                  ? 'border-copper text-copper'
                  : 'border-transparent text-slate hover:text-charcoal hover:border-[#D4CFC7]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'instruction' && (
          <InstructionTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'vehicle' && (
          <VehicleDetailsTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'tyres' && (
          <TyresTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'damages' && (
          <DamagesLabourTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'parts' && (
          <PartsAssessmentTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'values' && (
          <MMCodesValuesTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'photos' && (
          <PhotosEvidenceTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'outcome' && (
          <OutcomeFinancialsTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
        {activeTab === 'findings' && (
          <FindingsTab assessment={fullAssessment} onNavigate={handleNavigate} />
        )}
      </div>
    </div>
  )
}

function OutcomeChip({ outcome }: { outcome: string | null }) {
  if (!outcome) return null
  const COLORS: Record<string, string> = {
    repairable: 'bg-green-100 text-green-800',
    write_off: 'bg-red-100 text-red-700',
    theft_total: 'bg-red-100 text-red-700',
    partial_theft: 'bg-orange-100 text-orange-700',
    rejected: 'bg-gray-100 text-gray-600',
    further_investigation: 'bg-yellow-100 text-yellow-700',
  }
  const LABELS: Record<string, string> = {
    repairable: 'Repairable',
    write_off: 'Write-off',
    theft_total: 'Theft Total',
    partial_theft: 'Partial Theft',
    rejected: 'Rejected',
    further_investigation: 'Further Investigation',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${COLORS[outcome] ?? 'bg-gray-100 text-gray-600'}`}>
      {LABELS[outcome] ?? outcome}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-500',
    ready: 'bg-blue-100 text-blue-700',
    submitted: 'bg-emerald-100 text-emerald-700',
  }
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}
