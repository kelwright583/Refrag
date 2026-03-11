'use client'

import { useState } from 'react'
import { FileText, CheckCircle, Send } from 'lucide-react'
import { useUpdateAssessment } from '@/hooks/use-assessments'
import { Section } from './shared'
import type { FullMotorAssessment } from '@/lib/types/assessment'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

// Quick checklist for completeness
const CHECKLIST_ITEMS = [
  { key: 'instruction', label: 'Instruction details complete', check: (a: FullMotorAssessment) => !!a.insurer_name && !!a.claim_number },
  { key: 'vehicle', label: 'Vehicle identity captured', check: (a: FullMotorAssessment) => !!a.vehicle_details?.make && !!a.vehicle_details?.reg_number },
  { key: 'values', label: 'Vehicle values recorded', check: (a: FullMotorAssessment) => !!a.vehicle_values?.retail_value },
  { key: 'damages', label: 'Repair line items entered', check: (a: FullMotorAssessment) => a.repair_line_items.length > 0 },
  { key: 'parts', label: 'Parts amounts entered', check: (a: FullMotorAssessment) => !!a.parts_assessment },
  { key: 'outcome', label: 'Assessment outcome selected', check: (a: FullMotorAssessment) => !!a.outcome },
]

export function FindingsTab({ assessment, onNavigate }: Props) {
  const updateAssessment = useUpdateAssessment(assessment.id)
  const [submitting, setSubmitting] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const completedItems = CHECKLIST_ITEMS.filter((i) => i.check(assessment))
  const allComplete = completedItems.length === CHECKLIST_ITEMS.length
  const isSubmitted = assessment.status === 'submitted'
  const isReady = assessment.status === 'ready'

  const handleMarkReady = async () => {
    await updateAssessment.mutateAsync({ status: 'ready' })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await updateAssessment.mutateAsync({ status: 'submitted' })
    } finally {
      setSubmitting(false)
      setConfirmSubmit(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Completeness Checklist */}
      <Section title="Completeness Check">
        <div className="space-y-2">
          {CHECKLIST_ITEMS.map((item) => {
            const done = item.check(assessment)
            return (
              <div key={item.key} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                  {done && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm ${done ? 'text-charcoal' : 'text-slate'}`}>{item.label}</span>
                {!done && (
                  <button
                    onClick={() => {
                      const tabMap: Record<string, string> = { instruction: 'instruction', vehicle: 'vehicle', values: 'values', damages: 'damages', parts: 'parts', outcome: 'outcome' }
                      onNavigate(tabMap[item.key] ?? 'instruction')
                    }}
                    className="text-xs text-copper hover:opacity-80"
                  >
                    Complete →
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-[#D4CFC7] flex items-center gap-2">
          <div className={`h-2 rounded-full flex-1 bg-gray-100`}>
            <div className="h-2 rounded-full bg-copper transition-all" style={{ width: `${(completedItems.length / CHECKLIST_ITEMS.length) * 100}%` }} />
          </div>
          <span className="text-xs text-slate font-medium">{completedItems.length}/{CHECKLIST_ITEMS.length} complete</span>
        </div>
      </Section>

      {/* Report Preview Link */}
      <Section title="Report Preview">
        <p className="text-sm text-slate mb-4">
          Review the full generated report before marking it as ready or submitting to the insurer.
        </p>
        <a
          href={`/app/cases/${assessment.case_id}/assessment/${assessment.id}/report`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#D4CFC7] rounded-lg text-sm font-medium text-charcoal hover:bg-[#FAFAF8] transition-colors"
        >
          <FileText className="w-4 h-4 text-copper" />
          Open Report Preview
        </a>
      </Section>

      {/* Status Actions */}
      {!isSubmitted && (
        <Section title="Finalise Assessment">
          <div className="space-y-3">
            {!isReady && (
              <div className="flex items-start gap-4 p-4 border border-[#D4CFC7] rounded-xl">
                <CheckCircle className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-charcoal">Mark as Ready</p>
                  <p className="text-xs text-slate mt-0.5">Locks the assessment for review. A version snapshot will be created.</p>
                </div>
                <button
                  onClick={handleMarkReady}
                  disabled={!allComplete || updateAssessment.isPending}
                  title={!allComplete ? 'Complete all checklist items first' : ''}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Mark Ready
                </button>
              </div>
            )}

            <div className="flex items-start gap-4 p-4 border border-[#D4CFC7] rounded-xl">
              <Send className="w-5 h-5 text-copper mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-charcoal">Submit Assessment</p>
                <p className="text-xs text-slate mt-0.5">Submits to insurer. The assessment will be locked and cannot be edited.</p>
              </div>
              {!confirmSubmit ? (
                <button
                  onClick={() => setConfirmSubmit(true)}
                  disabled={(!allComplete && !isReady) || submitting}
                  className="px-4 py-2 bg-copper text-white text-sm rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting ? 'Submitting…' : 'Confirm Submit'}
                  </button>
                  <button onClick={() => setConfirmSubmit(false)} className="px-3 py-2 border border-[#D4CFC7] text-slate text-sm rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {isSubmitted && (
        <div className="flex items-center gap-3 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Assessment Submitted</p>
            <p className="text-sm text-emerald-600">This assessment has been submitted and is locked.</p>
          </div>
        </div>
      )}
    </div>
  )
}
