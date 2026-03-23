'use client'

import React, { useState } from 'react'
import { FileText, AlertCircle, Pencil, X, Check, RefreshCw } from 'lucide-react'
import { useCase, useUpdateCase } from '@/hooks/use-cases'
import { Field, Input } from '@/components/assessment/shared'
import type { UpdateCaseInput, CasePriority } from '@/lib/types/case'

interface SectionProps {
  caseId: string
  orgSettings: unknown
}

const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

const PRIORITY_COLOURS: Record<CasePriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-[#D4CFC7] last:border-0">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-charcoal font-medium text-right max-w-[60%]">{value || '—'}</span>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-2 border-b border-[#D4CFC7]">
          <div className="h-3 w-24 bg-[#D4CFC7] rounded" />
          <div className="h-4 w-32 bg-[#D4CFC7] rounded" />
        </div>
      ))}
    </div>
  )
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function InstructionDetailsSection({ caseId }: SectionProps) {
  const { data: caseData, isLoading, isError, refetch } = useCase(caseId)
  const updateCase = useUpdateCase()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateCaseInput>({})

  function startEdit() {
    if (!caseData) return
    setForm({
      insurer_name: caseData.insurer_name ?? '',
      claim_reference: caseData.claim_reference ?? '',
      broker_name: caseData.broker_name ?? '',
      loss_date: caseData.loss_date ?? '',
      location: caseData.location ?? '',
    })
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm({})
  }

  async function handleSave() {
    await updateCase.mutateAsync({ caseId, updates: form })
    setEditing(false)
    setForm({})
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <FileText className="w-4 h-4" />
          <span className="text-sm">Instruction details</span>
        </div>
        <LoadingSkeleton />
      </div>
    )
  }

  if (isError || !caseData) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate">
          <FileText className="w-4 h-4" />
          <span className="text-sm">Instruction details</span>
        </div>
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-6 text-center space-y-3">
          <AlertCircle className="w-6 h-6 text-copper mx-auto" />
          <p className="text-sm text-slate">Failed to load instruction details.</p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 text-sm text-copper hover:underline"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate">
          <FileText className="w-4 h-4" />
          <span className="text-sm">Instruction details</span>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-1 text-xs text-copper hover:underline"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Insurer Name">
              <Input
                value={form.insurer_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, insurer_name: e.target.value }))}
                placeholder="e.g. Santam"
              />
            </Field>
            <Field label="Claim Reference">
              <Input
                value={form.claim_reference ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, claim_reference: e.target.value }))}
                placeholder="e.g. CLM-2024-001234"
              />
            </Field>
            <Field label="Broker Name">
              <Input
                value={form.broker_name ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, broker_name: e.target.value }))}
                placeholder="e.g. OUTsurance Broker"
              />
            </Field>
            <Field label="Date of Loss">
              <Input
                type="date"
                value={form.loss_date ? form.loss_date.slice(0, 10) : ''}
                onChange={(e) => setForm((f) => ({ ...f, loss_date: e.target.value }))}
              />
            </Field>
            <Field label="Location" required={false}>
              <Input
                value={form.location ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="e.g. 12 Main Street, Cape Town"
              />
            </Field>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-[#D4CFC7]">
            <button
              onClick={handleSave}
              disabled={updateCase.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <Check className="w-3.5 h-3.5" />
              {updateCase.isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={cancelEdit}
              disabled={updateCase.isPending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-[#D4CFC7] text-charcoal rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
            {updateCase.isError && (
              <span className="text-xs text-red-600 ml-2">Save failed. Please try again.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-[#D4CFC7] bg-[#FAFAF8] px-4 py-1">
          <DetailRow label="Insurer" value={caseData.insurer_name} />
          <DetailRow label="Claim Reference" value={caseData.claim_reference} />
          <DetailRow label="Broker" value={caseData.broker_name} />
          <DetailRow label="Date of Instruction" value={formatDate(caseData.created_at)} />
          <DetailRow label="Date of Loss" value={formatDate(caseData.loss_date)} />
          <DetailRow label="Location" value={caseData.location} />
          <DetailRow
            label="Priority"
            value={
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLOURS[caseData.priority]}`}
              >
                {PRIORITY_LABELS[caseData.priority]}
              </span>
            }
          />
        </div>
      )}
    </div>
  )
}
