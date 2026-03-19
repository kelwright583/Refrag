'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { VERTICAL_CONFIGS, type VerticalId, type ReportSectionTemplate } from '@/lib/verticals/config'
import SectionEditor, { type SectionState } from './SectionEditor'
import ReportPreview from './ReportPreview'
import { Save, FileCheck, Loader2 } from 'lucide-react'

interface OrgBranding {
  name: string
  logoUrl?: string | null
  primaryColor?: string | null
}

interface CaseData {
  id: string
  case_number?: string
  claim_reference?: string
  client_name?: string
  loss_date?: string
  vertical?: string
  [key: string]: unknown
}

interface ReportBuilderProps {
  caseData: CaseData
  reportId: string
  orgBranding: OrgBranding
  /** Pre-existing sections loaded from DB */
  initialSections?: Array<{
    id: string
    section_key: string
    heading: string
    body_md: string
    order_index: number
  }>
  onSave?: (sections: SectionState[], selectedOutcome: string | null) => Promise<void>
}

export default function ReportBuilder({
  caseData,
  reportId,
  orgBranding,
  initialSections,
  onSave,
}: ReportBuilderProps) {
  const vertical = (caseData.vertical || 'general') as VerticalId
  const config = VERTICAL_CONFIGS[vertical] ?? VERTICAL_CONFIGS.general

  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [sections, setSections] = useState<SectionState[]>(() =>
    config.reportSections.map((tmpl, idx) => {
      const existing = initialSections?.find((s) => s.section_key === tmpl.key)
      return {
        key: tmpl.key,
        heading: existing?.heading ?? tmpl.heading,
        bodyMd: existing?.body_md ?? '',
        isComplete: existing ? existing.body_md.trim().length > 0 : false,
        aiDraft: null,
        aiDraftPending: false,
      }
    }),
  )

  // Rebuild sections when vertical changes
  useEffect(() => {
    setSections(
      config.reportSections.map((tmpl) => {
        const existing = initialSections?.find((s) => s.section_key === tmpl.key)
        return {
          key: tmpl.key,
          heading: existing?.heading ?? tmpl.heading,
          bodyMd: existing?.body_md ?? '',
          isComplete: existing ? existing.body_md.trim().length > 0 : false,
          aiDraft: null,
          aiDraftPending: false,
        }
      }),
    )
  }, [vertical]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSectionUpdate = useCallback((key: string, updates: Partial<SectionState>) => {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...updates } : s)),
    )
  }, [])

  const completedCount = useMemo(
    () => sections.filter((s) => s.isComplete).length,
    [sections],
  )

  const requiredTemplates = useMemo(
    () => config.reportSections.filter((t) => t.isRequired),
    [config],
  )

  const requiredComplete = useMemo(
    () =>
      requiredTemplates.every((t) => {
        const s = sections.find((sec) => sec.key === t.key)
        return s?.isComplete
      }),
    [requiredTemplates, sections],
  )

  const contextData = useMemo(() => {
    const safe = { ...caseData }
    delete safe.client_name
    delete safe.insured_name
    delete safe.contact_email
    delete safe.contact_phone
    return safe
  }, [caseData])

  const handleSave = useCallback(async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(sections, selectedOutcome)
    } finally {
      setSaving(false)
    }
  }, [onSave, sections, selectedOutcome])

  const progressPct = sections.length > 0 ? (completedCount / sections.length) * 100 : 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px] gap-6">
      {/* Left column — editor */}
      <div className="space-y-5">
        {/* Outcome selector */}
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-charcoal mb-3">
            {config.terminology.outcome}
          </h2>
          <div className="flex flex-wrap gap-2">
            {config.defaultOutcomes.map((outcome) => (
              <button
                key={outcome}
                onClick={() =>
                  setSelectedOutcome(selectedOutcome === outcome ? null : outcome)
                }
                className={`px-4 py-2 text-sm rounded-full border font-medium transition-all ${
                  selectedOutcome === outcome
                    ? 'bg-copper text-white border-copper shadow-sm'
                    : 'bg-white text-charcoal border-[#D4CFC7] hover:border-copper/50 hover:text-copper'
                }`}
              >
                {outcome
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-charcoal">
              {completedCount} of {sections.length} sections complete
            </span>
            {requiredComplete ? (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <FileCheck className="w-3.5 h-3.5" />
                All required sections done
              </span>
            ) : (
              <span className="text-xs text-amber-600 font-medium">
                {requiredTemplates.length - requiredTemplates.filter((t) => sections.find((s) => s.key === t.key)?.isComplete).length} required
                remaining
              </span>
            )}
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: requiredComplete ? '#22c55e' : '#B87333',
              }}
            />
          </div>
        </div>

        {/* Section editors */}
        <div className="space-y-3">
          {config.reportSections.map((tmpl, idx) => {
            const state = sections.find((s) => s.key === tmpl.key)
            if (!state) return null
            return (
              <SectionEditor
                key={tmpl.key}
                template={tmpl}
                state={state}
                index={idx}
                caseId={caseData.id}
                vertical={vertical}
                contextData={contextData}
                onUpdate={handleSectionUpdate}
              />
            )
          })}
        </div>

        {/* Save button */}
        {onSave && (
          <div className="flex justify-end pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Report'}
            </button>
          </div>
        )}
      </div>

      {/* Right column — live preview */}
      <div className="hidden lg:block">
        <ReportPreview
          sections={sections}
          orgBranding={orgBranding}
          caseDetails={{
            caseNumber: caseData.case_number,
            claimReference: caseData.claim_reference,
            clientName: caseData.client_name,
            lossDate: caseData.loss_date,
          }}
          reportTitle={
            caseData.claim_reference
              ? `${caseData.claim_reference} — Assessment Report`
              : 'Assessment Report'
          }
        />
      </div>
    </div>
  )
}
