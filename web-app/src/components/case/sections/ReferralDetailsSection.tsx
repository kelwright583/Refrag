'use client'

import React, { useState } from 'react'
import { FileSearch, AlertCircle, RefreshCw, Pencil, X, Check } from 'lucide-react'
import { useCase } from '@/hooks/use-cases'
import { Field, Input, Select, Textarea } from '@/components/assessment/shared'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

interface ReferralData {
  referral_source: string
  referral_date: string
  mandate_scope: string
  specific_questions: string
  confidentiality: string
  siu_reference: string
}

const emptyReferralData: ReferralData = {
  referral_source: '',
  referral_date: '',
  mandate_scope: '',
  specific_questions: '',
  confidentiality: 'standard',
  siu_reference: '',
}

const REFERRAL_SOURCES = ['Insurer', 'SIU', 'Attorney', 'Broker', 'Other'] as const
const CONFIDENTIALITY_OPTIONS = [
  { value: 'standard', label: 'Standard' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'strictly_confidential', label: 'Strictly Confidential' },
] as const

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[#D4CFC7] last:border-0">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-charcoal font-medium text-right max-w-[65%]">{value || '—'}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-[#D4CFC7]">
          <div className="h-3 w-28 bg-[#D4CFC7] rounded" />
          <div className="h-4 w-36 bg-[#D4CFC7] rounded" />
        </div>
      ))}
    </div>
  )
}

// Referral data is stored in sessionStorage keyed by caseId since the Case
// type has no description column. In a future migration this would move to
// a dedicated DB column or a case_notes row with note_type='referral_details'.
function storageKey(caseId: string) {
  return `referral_data_${caseId}`
}

function loadReferralData(caseId: string): ReferralData {
  if (typeof window === 'undefined') return emptyReferralData
  try {
    const raw = sessionStorage.getItem(storageKey(caseId))
    if (!raw) return emptyReferralData
    return { ...emptyReferralData, ...(JSON.parse(raw) as Partial<ReferralData>) }
  } catch {
    return emptyReferralData
  }
}

function saveReferralData(caseId: string, data: ReferralData) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(storageKey(caseId), JSON.stringify(data))
}

export function ReferralDetailsSection({ caseId }: SectionProps) {
  const { data: caseData, isLoading, isError, refetch } = useCase(caseId)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ReferralData>(emptyReferralData)
  const [saved, setSaved] = useState<ReferralData | null>(null)

  // Load persisted data on first render (after caseData available)
  const displayData = saved ?? (caseData ? loadReferralData(caseId) : emptyReferralData)

  function startEdit() {
    setForm(displayData)
    setEditing(true)
  }

  function handleSave() {
    saveReferralData(caseId, form)
    setSaved(form)
    setEditing(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <FileSearch className="w-4 h-4" />
          <span className="text-sm">Referral details</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <FileSearch className="w-4 h-4" />
          <span className="text-sm">Referral details</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load case data.</p>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-sm text-copper hover:underline">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  const confidentialityLabel =
    CONFIDENTIALITY_OPTIONS.find((o) => o.value === displayData.confidentiality)?.label ?? displayData.confidentiality

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate">
          <FileSearch className="w-4 h-4" />
          <span className="text-sm">Referral details</span>
        </div>
        {!editing && (
          <button onClick={startEdit} className="inline-flex items-center gap-1 text-xs text-copper hover:underline">
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Referral Source">
              <Select value={form.referral_source} onChange={(e) => setForm((f) => ({ ...f, referral_source: e.target.value }))}>
                <option value="">— Select —</option>
                {REFERRAL_SOURCES.map((s) => (
                  <option key={s} value={s.toLowerCase()}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Referral Date">
              <Input type="date" value={form.referral_date} onChange={(e) => setForm((f) => ({ ...f, referral_date: e.target.value }))} />
            </Field>
            <Field label="SIU Reference Number">
              <Input value={form.siu_reference} onChange={(e) => setForm((f) => ({ ...f, siu_reference: e.target.value }))} placeholder="e.g. SIU-2024-0042" />
            </Field>
            <Field label="Confidentiality">
              <Select value={form.confidentiality} onChange={(e) => setForm((f) => ({ ...f, confidentiality: e.target.value }))}>
                {CONFIDENTIALITY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Mandate Scope">
                <Textarea rows={2} value={form.mandate_scope} onChange={(e) => setForm((f) => ({ ...f, mandate_scope: e.target.value }))} placeholder="Brief description of scope of mandate" />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Specific Questions to Address">
                <Textarea rows={3} value={form.specific_questions} onChange={(e) => setForm((f) => ({ ...f, specific_questions: e.target.value }))} placeholder="List specific questions or instructions from the insurer / SIU" />
              </Field>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-[#D4CFC7]">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#D4CFC7] text-charcoal rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] px-4 py-1">
          <DetailRow label="Referral Source" value={displayData.referral_source || null} />
          <DetailRow label="Referral Date" value={displayData.referral_date || null} />
          <DetailRow label="SIU Reference" value={displayData.siu_reference || null} />
          <DetailRow label="Confidentiality" value={displayData.confidentiality ? confidentialityLabel : null} />
          <DetailRow label="Mandate Scope" value={displayData.mandate_scope || null} />
          <DetailRow label="Specific Questions" value={displayData.specific_questions || null} />
        </div>
      )}
    </div>
  )
}
