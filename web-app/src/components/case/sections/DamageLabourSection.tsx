'use client'

import React, { useState } from 'react'
import { Wrench, Plus, Loader2 } from 'lucide-react'
import {
  useAssessmentsForCase,
  useAssessment,
  useCreateAssessment,
} from '@/hooks/use-assessments'
import { DamagesLabourTab } from '@/components/assessment/DamagesLabourTab'
import type { FullMotorAssessment, AssessmentSequence } from '@/lib/types/assessment'

interface SectionProps {
  caseId: string
  orgSettings: any
}

const SEQUENCE_LABELS: Record<AssessmentSequence, string> = {
  initial: 'Initial',
  supplementary: 'Supplementary',
  re_inspection: 'Re-inspection',
}

function AssessmentBridgeSection({
  caseId,
  children,
}: {
  caseId: string
  children: (assessment: FullMotorAssessment) => React.ReactNode
}) {
  const { data: assessments, isLoading: listLoading } = useAssessmentsForCase(caseId)
  const createAssessment = useCreateAssessment()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const activeId = selectedId ?? (assessments && assessments.length > 0 ? assessments[0].id : null)

  const { data: fullAssessment, isLoading: detailLoading } = useAssessment(activeId ?? '')

  if (listLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading assessments…</span>
      </div>
    )
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-10 text-center space-y-4">
        <Wrench className="w-8 h-8 text-slate/40 mx-auto" />
        <div>
          <p className="text-sm font-medium text-charcoal">No assessment started</p>
          <p className="text-xs text-slate mt-1">Create an initial motor assessment to capture damage &amp; labour data</p>
        </div>
        <button
          onClick={async () => {
            setCreating(true)
            try {
              await createAssessment.mutateAsync({ case_id: caseId, assessment_sequence: 'initial' })
            } finally {
              setCreating(false)
            }
          }}
          disabled={creating || createAssessment.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {(creating || createAssessment.isPending) ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          Start Assessment
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {assessments.length > 1 && (
        <div className="flex items-center gap-2">
          {assessments.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                a.id === activeId
                  ? 'bg-copper text-white border-copper'
                  : 'bg-white text-slate border-[#D4CFC7] hover:border-copper/50'
              }`}
            >
              {SEQUENCE_LABELS[a.assessment_sequence]} #{a.sequence_number}
            </button>
          ))}
        </div>
      )}

      {detailLoading || !fullAssessment ? (
        <div className="flex items-center justify-center py-12 gap-3 text-slate">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading assessment…</span>
        </div>
      ) : (
        children(fullAssessment)
      )}
    </div>
  )
}

export function DamageLabourSection({ caseId }: SectionProps) {
  return (
    <AssessmentBridgeSection caseId={caseId}>
      {(assessment) => (
        <DamagesLabourTab assessment={assessment} onNavigate={() => {}} />
      )}
    </AssessmentBridgeSection>
  )
}
