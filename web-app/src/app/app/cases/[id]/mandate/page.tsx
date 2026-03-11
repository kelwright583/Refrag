/**
 * Case mandate page
 */

'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import {
  useMandates,
  useCaseMandates,
  useRequirementChecks,
  useAssignMandate,
  useUpdateRequirementCheck,
} from '@/hooks/use-mandates'
import { useEvidence } from '@/hooks/use-evidence'
import { CheckCircle, XCircle, AlertCircle, Plus, X, Link as LinkIcon } from 'lucide-react'
import { RequirementStatus, EvidenceType } from '@/lib/types/mandate'

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  photo: 'Photo',
  video: 'Video',
  document: 'Document',
  text_note: 'Text Note',
  none: 'None',
}

const STATUS_LABELS: Record<RequirementStatus, string> = {
  missing: 'Missing',
  provided: 'Provided',
  not_applicable: 'N/A',
}

export default function CaseMandatePage() {
  const params = useParams()
  const caseId = params.id as string
  const [showMandateSelection, setShowMandateSelection] = useState(false)
  const [showEvidencePicker, setShowEvidencePicker] = useState(false)
  const [selectedRequirementCheckId, setSelectedRequirementCheckId] = useState<string | null>(
    null
  )

  const { data: mandates } = useMandates()
  const { data: caseMandates } = useCaseMandates(caseId)
  const { data: requirementChecks } = useRequirementChecks(caseId)
  const { data: evidence } = useEvidence(caseId)
  const assignMandate = useAssignMandate()
  const updateRequirementCheck = useUpdateRequirementCheck()

  const assignedMandate = caseMandates && caseMandates.length > 0 ? caseMandates[0] : null

  const handleAssignMandate = async (mandateId: string) => {
    try {
      await assignMandate.mutateAsync({
        case_id: caseId,
        mandate_id: mandateId,
      })
      setShowMandateSelection(false)
    } catch (error: any) {
      alert(error.message || 'Failed to assign mandate')
    }
  }

  const handleStatusChange = async (checkId: string, status: RequirementStatus) => {
    try {
      await updateRequirementCheck.mutateAsync({
        caseId,
        input: {
          requirement_check_id: checkId,
          status,
        },
      })
    } catch (error: any) {
      alert(error.message || 'Failed to update status')
    }
  }

  const handleAttachEvidence = (checkId: string) => {
    setSelectedRequirementCheckId(checkId)
    setShowEvidencePicker(true)
  }

  const handleEvidenceSelected = async (evidenceId: string) => {
    if (!selectedRequirementCheckId) return

    try {
      await updateRequirementCheck.mutateAsync({
        caseId,
        input: {
          requirement_check_id: selectedRequirementCheckId,
          evidence_id: evidenceId,
          status: 'provided',
        },
      })
      setShowEvidencePicker(false)
      setSelectedRequirementCheckId(null)
    } catch (error: any) {
      alert(error.message || 'Failed to attach evidence')
    }
  }

  // Group requirements by evidence_type
  const groupedRequirements =
    requirementChecks?.reduce((acc, check) => {
      const evidenceType = check.requirement.evidence_type
      if (!acc[evidenceType]) {
        acc[evidenceType] = []
      }
      acc[evidenceType].push(check)
      return acc
    }, {} as Record<EvidenceType, typeof requirementChecks>) || {}

  const missingRequirements =
    requirementChecks?.filter(
      (check) => check.status === 'missing' && check.requirement.required
    ) || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-heading font-bold text-charcoal mb-6">Mandate Checklist</h1>

      {!assignedMandate ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-charcoal font-medium mb-1">No Mandate Assigned</p>
          <p className="text-slate text-sm mb-4">
            Assign a mandate to this case to view requirements and track completion.
          </p>
          <button
            onClick={() => setShowMandateSelection(true)}
            className="px-4 py-2 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Assign Mandate
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-heading font-bold text-charcoal">
                  {assignedMandate.mandate.name}
                </h2>
                {assignedMandate.mandate.insurer_name && (
                  <p className="text-slate mt-1">{assignedMandate.mandate.insurer_name}</p>
                )}
              </div>
              <button
                onClick={() => setShowMandateSelection(true)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Change Mandate
              </button>
            </div>
          </div>

          {missingRequirements.length > 0 && (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
              <p className="font-medium text-charcoal">
                {missingRequirements.length} Missing Requirement
                {missingRequirements.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-slate mt-1">
                Please provide evidence for all required items.
              </p>
            </div>
          )}

          {Object.keys(groupedRequirements).length === 0 ? (
            <p className="text-slate">No requirements found for this mandate.</p>
          ) : (
            Object.entries(groupedRequirements).map(([evidenceType, checks]) => (
              <div key={evidenceType} className="mb-8">
                <h3 className="text-lg font-heading font-bold text-charcoal mb-4">
                  {EVIDENCE_TYPE_LABELS[evidenceType as EvidenceType]} Requirements
                </h3>
                <div className="space-y-3">
                  {(checks as any[]).map((check: any) => (
                    <div
                      key={check.id}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-charcoal">
                              {check.requirement.label}
                            </h4>
                            {check.requirement.required && (
                              <span className="text-xs text-red-600">*</span>
                            )}
                          </div>
                          {check.requirement.description && (
                            <p className="text-sm text-slate">{check.requirement.description}</p>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                            check.status === 'provided'
                              ? 'bg-green-100 text-green-800'
                              : check.status === 'not_applicable'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {check.status === 'provided' ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : check.status === 'not_applicable' ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          {STATUS_LABELS[check.status as RequirementStatus]}
                        </div>
                      </div>

                      {check.evidence && (
                        <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                          <span className="text-slate">Attached: </span>
                          <span className="text-charcoal font-medium">
                            {check.evidence.file_name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {(['missing', 'provided', 'not_applicable'] as RequirementStatus[]).map(
                            (status) => (
                              <button
                                key={status}
                                onClick={() => handleStatusChange(check.id, status)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${
                                  check.status === status
                                    ? 'bg-copper text-white'
                                    : 'bg-gray-100 text-charcoal hover:bg-gray-200'
                                }`}
                              >
                                {STATUS_LABELS[status]}
                              </button>
                            )
                          )}
                        </div>

                        {check.requirement.evidence_type !== 'none' &&
                          check.requirement.evidence_type !== 'text_note' && (
                            <button
                              onClick={() => handleAttachEvidence(check.id)}
                              className="flex items-center gap-1 px-3 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                            >
                              <LinkIcon className="w-3 h-3" />
                              {check.evidence ? 'Change Evidence' : 'Attach Evidence'}
                            </button>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Mandate Selection Modal */}
      {showMandateSelection && (
        <MandateSelectionModal
          mandates={mandates || []}
          onClose={() => setShowMandateSelection(false)}
          onSelect={handleAssignMandate}
          isLoading={assignMandate.isPending}
        />
      )}

      {/* Evidence Picker Modal */}
      {showEvidencePicker && (
        <EvidencePickerModal
          evidence={evidence || []}
          requiredMediaType={
            selectedRequirementCheckId
              ? requirementChecks?.find((c) => c.id === selectedRequirementCheckId)?.requirement
                  .evidence_type
              : undefined
          }
          onClose={() => {
            setShowEvidencePicker(false)
            setSelectedRequirementCheckId(null)
          }}
          onSelect={handleEvidenceSelected}
        />
      )}
    </div>
  )
}

/**
 * Mandate Selection Modal
 */
function MandateSelectionModal({
  mandates,
  onClose,
  onSelect,
  isLoading,
}: {
  mandates: any[]
  onClose: () => void
  onSelect: (mandateId: string) => void
  isLoading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">Select Mandate</h2>
          <button onClick={onClose} className="text-slate hover:text-charcoal transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {mandates.length === 0 ? (
            <p className="text-slate text-center py-8">No mandates available</p>
          ) : (
            mandates.map((mandate) => (
              <button
                key={mandate.id}
                onClick={() => onSelect(mandate.id)}
                disabled={isLoading}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <p className="font-semibold text-charcoal">{mandate.name}</p>
                {mandate.insurer_name && (
                  <p className="text-sm text-slate mt-1">{mandate.insurer_name}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Evidence Picker Modal
 */
function EvidencePickerModal({
  evidence,
  requiredMediaType,
  onClose,
  onSelect,
}: {
  evidence: any[]
  requiredMediaType?: EvidenceType
  onClose: () => void
  onSelect: (evidenceId: string) => void
}) {
  const filteredEvidence =
    requiredMediaType && requiredMediaType !== 'none' && requiredMediaType !== 'text_note'
      ? evidence.filter((item) => item.media_type === requiredMediaType)
      : evidence

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-heading font-bold text-charcoal">Select Evidence</h2>
          <button onClick={onClose} className="text-slate hover:text-charcoal transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-2">
          {filteredEvidence.length === 0 ? (
            <p className="text-slate text-center py-8">
              {requiredMediaType && requiredMediaType !== 'none' && requiredMediaType !== 'text_note'
                ? `No ${EVIDENCE_TYPE_LABELS[requiredMediaType]} evidence available`
                : 'No evidence available'}
            </p>
          ) : (
            filteredEvidence.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item.id)}
                className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <p className="font-medium text-charcoal">{item.file_name}</p>
                <p className="text-sm text-slate mt-1">
                  {EVIDENCE_TYPE_LABELS[item.media_type as EvidenceType]}
                </p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
