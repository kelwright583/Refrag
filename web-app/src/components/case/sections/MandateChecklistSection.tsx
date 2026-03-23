'use client'

import React, { useState } from 'react'
import {
  ListChecks,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Video,
  FileText,
  StickyNote,
  X,
  Search,
  CheckCircle2,
  MinusCircle,
  HelpCircle,
  Paperclip,
} from 'lucide-react'
import {
  useMandates,
  useCaseMandates,
  useRequirementChecks,
  useAssignMandate,
  useUpdateRequirementCheck,
} from '@/hooks/use-mandates'
import { useEvidence } from '@/hooks/use-evidence'
import { RequirementStatus, RequirementCategory, EvidenceType, CaseRequirementCheck } from '@/lib/types/mandate'
import { EvidenceWithTags } from '@/lib/types/evidence'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type RequirementCheck = CaseRequirementCheck

const STATUS_CONFIG: Record<RequirementStatus, { label: string; icon: React.ComponentType<any>; className: string }> = {
  missing: {
    label: 'Missing',
    icon: HelpCircle,
    className: 'text-red-500',
  },
  provided: {
    label: 'Provided',
    icon: CheckCircle2,
    className: 'text-emerald-500',
  },
  not_applicable: {
    label: 'N/A',
    icon: MinusCircle,
    className: 'text-slate',
  },
}

const STATUS_CYCLE: Record<RequirementStatus, RequirementStatus> = {
  missing: 'provided',
  provided: 'not_applicable',
  not_applicable: 'missing',
}

const EVIDENCE_TYPE_ICONS: Record<EvidenceType, React.ComponentType<any>> = {
  photo: ImageIcon,
  video: Video,
  document: FileText,
  text_note: StickyNote,
  none: FileText,
}

const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  identity_documents: 'Identity Documents',
  scene_damage_photos: 'Scene / Damage Photos',
  third_party_documents: 'Third-Party Documents',
  internal_checks: 'Internal Checks',
  specialist_requirements: 'Specialist Requirements',
  custom: 'Custom',
}

function EvidencePickerModal({
  caseId,
  onSelect,
  onClose,
}: {
  caseId: string
  onSelect: (item: EvidenceWithTags) => void
  onClose: () => void
}) {
  const { data: evidence, isLoading } = useEvidence(caseId)
  const [search, setSearch] = useState('')

  const filtered = (evidence || []).filter((e) =>
    e.file_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4CFC7]">
          <h3 className="font-semibold text-charcoal">Attach Evidence</h3>
          <button onClick={onClose} className="text-slate hover:text-charcoal">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-3 border-b border-[#D4CFC7]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search evidence..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-copper border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate text-center py-8">No evidence found</p>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#FAFAF8] transition-colors text-left"
              >
                {item.media_type === 'photo' ? (
                  <ImageIcon className="w-4 h-4 text-slate flex-shrink-0" />
                ) : item.media_type === 'video' ? (
                  <Video className="w-4 h-4 text-slate flex-shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-slate flex-shrink-0" />
                )}
                <span className="text-sm text-charcoal truncate">{item.file_name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export function MandateChecklistSection({ caseId }: SectionProps) {
  const { data: caseMandates, isLoading: loadingMandates } = useCaseMandates(caseId)
  const { data: checks, isLoading: loadingChecks, isError } = useRequirementChecks(caseId)
  const { data: allMandates, isLoading: loadingAllMandates } = useMandates()
  const assignMandate = useAssignMandate()
  const updateCheck = useUpdateRequirementCheck()

  const [showAssignModal, setShowAssignModal] = useState(false)
  const [mandateSearch, setMandateSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [attachingCheckId, setAttachingCheckId] = useState<string | null>(null)

  const hasMandates = caseMandates && caseMandates.length > 0
  const requirementChecks: RequirementCheck[] = checks || []

  // Group by category
  const grouped: Record<string, RequirementCheck[]> = {}
  for (const check of requirementChecks) {
    const cat = check.requirement?.category || 'custom'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(check)
  }

  // Progress summary
  const required = requirementChecks.filter((c) => c.requirement?.is_required || c.requirement?.required)
  const completedRequired = required.filter((c) => c.status === 'provided' || c.status === 'not_applicable')

  async function cycleStatus(check: RequirementCheck) {
    const nextStatus = STATUS_CYCLE[check.status]
    await updateCheck.mutateAsync({
      caseId,
      input: {
        requirement_check_id: check.id,
        status: nextStatus,
      },
    })
  }

  async function attachEvidence(check: RequirementCheck, item: EvidenceWithTags) {
    await updateCheck.mutateAsync({
      caseId,
      input: {
        requirement_check_id: check.id,
        evidence_id: item.id,
      },
    })
    setAttachingCheckId(null)
  }

  async function detachEvidence(check: RequirementCheck) {
    await updateCheck.mutateAsync({
      caseId,
      input: {
        requirement_check_id: check.id,
        evidence_id: null,
      },
    })
  }

  async function handleAssignMandate(mandateId: string) {
    await assignMandate.mutateAsync({ mandate_id: mandateId, case_id: caseId })
    setShowAssignModal(false)
    setMandateSearch('')
  }

  const filteredMandates = (allMandates || []).filter((m) =>
    m.name.toLowerCase().includes(mandateSearch.toLowerCase()) ||
    (m.insurer_name || '').toLowerCase().includes(mandateSearch.toLowerCase())
  )

  const isLoading = loadingMandates || loadingChecks

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-[#D4CFC7] animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm text-slate">Failed to load checklist</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks className="w-4 h-4 text-slate" />
          <span className="text-sm font-medium text-charcoal">Mandate Checklist</span>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-[#D4CFC7] rounded-lg text-slate hover:border-copper hover:text-copper transition-colors"
        >
          <Paperclip className="w-3.5 h-3.5" />
          Assign Mandate
        </button>
      </div>

      {!hasMandates || requirementChecks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <ListChecks className="w-8 h-8 mx-auto mb-2 text-slate" />
          <p className="text-sm font-medium text-charcoal mb-1">No mandate assigned</p>
          <p className="text-xs text-slate mb-4">Assign a mandate to view the requirements checklist</p>
          <button
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Assign Mandate
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grouped requirements */}
          {Object.entries(grouped).map(([category, categoryChecks]) => (
            <div key={category} className="bg-white border border-[#D4CFC7] rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#FAFAF8] border-b border-[#D4CFC7]">
                <p className="text-xs font-semibold text-charcoal uppercase tracking-wide">
                  {CATEGORY_LABELS[category as RequirementCategory] || category}
                </p>
              </div>
              <div className="divide-y divide-[#D4CFC7]">
                {categoryChecks.map((check) => {
                  const req = check.requirement
                  if (!req) return null
                  const status = check.status || 'missing'
                  const StatusIcon = STATUS_CONFIG[status].icon
                  const EvidenceTypeIcon = EVIDENCE_TYPE_ICONS[req.evidence_type] || FileText
                  const isExpanded = expandedId === check.id
                  const isRequired = req.is_required || req.required

                  return (
                    <div key={check.id} className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        {/* Status toggle */}
                        <button
                          onClick={() => cycleStatus(check)}
                          title={`Status: ${STATUS_CONFIG[status].label} — click to cycle`}
                          className={`mt-0.5 flex-shrink-0 ${STATUS_CONFIG[status].className} hover:opacity-70 transition-opacity`}
                        >
                          <StatusIcon className="w-5 h-5" />
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`text-sm font-medium ${status === 'not_applicable' ? 'line-through text-slate' : 'text-charcoal'}`}>
                                {req.label}
                              </p>
                              {isRequired ? (
                                <span className="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-600 rounded font-medium">
                                  Required
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-medium">
                                  Optional
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : check.id)}
                              className="text-slate hover:text-charcoal flex-shrink-0"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>

                          {/* Evidence type */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <EvidenceTypeIcon className="w-3.5 h-3.5 text-slate" />
                            <span className="text-xs text-slate capitalize">
                              {req.evidence_type.replace('_', ' ')}
                            </span>
                          </div>

                          {/* Expanded: description, guidance, attach evidence */}
                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {req.description && (
                                <p className="text-xs text-slate">{req.description}</p>
                              )}
                              {req.guidance_note && (
                                <div className="px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
                                  <p className="text-xs text-amber-700">
                                    <span className="font-medium">Guidance: </span>
                                    {req.guidance_note}
                                  </p>
                                </div>
                              )}

                              {/* Linked evidence */}
                              {check.evidence ? (
                                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                  <span className="text-xs text-charcoal flex-1 truncate">
                                    {check.evidence.file_name}
                                  </span>
                                  <button
                                    onClick={() => detachEvidence(check)}
                                    className="text-slate hover:text-red-500 transition-colors"
                                    title="Detach evidence"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAttachingCheckId(check.id)}
                                  className="flex items-center gap-1.5 text-xs text-copper hover:opacity-80 transition-opacity"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  Attach Evidence
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Progress summary */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg">
            <span className="text-sm text-slate">Required items completed</span>
            <div className="flex items-center gap-3">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-copper rounded-full transition-all"
                  style={{
                    width: required.length > 0 ? `${(completedRequired.length / required.length) * 100}%` : '0%',
                  }}
                />
              </div>
              <span className="text-sm font-medium text-charcoal">
                {completedRequired.length} / {required.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Assign mandate modal */}
      {showAssignModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#D4CFC7]">
              <h3 className="font-semibold text-charcoal">Assign Mandate</h3>
              <button onClick={() => setShowAssignModal(false)} className="text-slate hover:text-charcoal">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-[#D4CFC7]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate" />
                <input
                  autoFocus
                  type="text"
                  value={mandateSearch}
                  onChange={(e) => setMandateSearch(e.target.value)}
                  placeholder="Search mandates..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {loadingAllMandates ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-copper border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredMandates.length === 0 ? (
                <p className="text-sm text-slate text-center py-8">No mandates found</p>
              ) : (
                filteredMandates.map((mandate) => (
                  <button
                    key={mandate.id}
                    onClick={() => handleAssignMandate(mandate.id)}
                    disabled={assignMandate.isPending}
                    className="w-full flex items-start gap-3 px-3 py-3 rounded-lg hover:bg-[#FAFAF8] transition-colors text-left disabled:opacity-50"
                  >
                    <ListChecks className="w-4 h-4 text-slate flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-charcoal">{mandate.name}</p>
                      {mandate.insurer_name && (
                        <p className="text-xs text-slate">{mandate.insurer_name}</p>
                      )}
                      {mandate.requirement_count !== undefined && (
                        <p className="text-xs text-slate">{mandate.requirement_count} requirements</p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evidence picker modal */}
      {attachingCheckId && (
        <EvidencePickerModal
          caseId={caseId}
          onSelect={(item) => {
            const check = requirementChecks.find((c) => c.id === attachingCheckId)
            if (check) attachEvidence(check, item)
          }}
          onClose={() => setAttachingCheckId(null)}
        />
      )}
    </div>
  )
}
