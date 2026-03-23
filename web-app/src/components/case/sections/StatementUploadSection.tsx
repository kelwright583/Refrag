'use client'

import { useRef, useState } from 'react'
import {
  Upload,
  Plus,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react'
import { useUploadEvidence } from '@/hooks/use-evidence'
import { Field, Input, Select, Textarea } from '@/components/assessment/shared'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type StatementType = 'Sworn' | 'Unsworn' | 'Written' | 'Verbal Summary'

interface StatementRecord {
  id?: string
  personName: string
  dateObtained: string
  statementType: StatementType
  verbalSummary: string
  evidenceFileName?: string
  evidenceId?: string
  createdAt?: string
}

const EMPTY_FORM: StatementRecord = {
  personName: '',
  dateObtained: '',
  statementType: 'Written',
  verbalSummary: '',
}

const STATEMENT_TYPES: StatementType[] = ['Sworn', 'Unsworn', 'Written', 'Verbal Summary']

function useStatementRecords(caseId: string) {
  return useQuery({
    queryKey: ['case-notes', caseId, 'statement_record'],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${caseId}/notes?type=statement_record`)
      if (!res.ok) return []
      const data = await res.json()
      return (data || []).map((note: any) => {
        try {
          return { ...JSON.parse(note.body), id: note.id, createdAt: note.created_at }
        } catch {
          return null
        }
      }).filter(Boolean) as StatementRecord[]
    },
    enabled: !!caseId,
  })
}

export function StatementUploadSection({ caseId }: SectionProps) {
  const { data: statements, isLoading } = useStatementRecords(caseId)
  const queryClient = useQueryClient()
  const uploadMutation = useUploadEvidence()
  const docInputRef = useRef<HTMLInputElement>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<StatementRecord>(EMPTY_FORM)
  const [docUploading, setDocUploading] = useState(false)
  const [docError, setDocError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleDocUpload(file: File) {
    setDocUploading(true)
    setDocError(null)
    try {
      const result = await uploadMutation.mutateAsync({
        caseId,
        file,
        mediaType: 'document',
        options: { tags: ['STATEMENT'] },
      })
      setForm((prev) => ({
        ...prev,
        evidenceFileName: file.name,
        evidenceId: result.id,
      }))
    } catch (err: any) {
      setDocError(err.message || 'Upload failed')
    } finally {
      setDocUploading(false)
    }
  }

  async function handleSave() {
    if (!form.personName.trim()) return
    setSaving(true)
    try {
      await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: 'statement_record',
          body: JSON.stringify(form),
        }),
      })
      await queryClient.invalidateQueries({ queryKey: ['case-notes', caseId, 'statement_record'] })
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch {
      // best-effort
    } finally {
      setSaving(false)
    }
  }

  function cancelForm() {
    setForm(EMPTY_FORM)
    setShowForm(false)
    setDocError(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-slate" />
          <span className="text-sm font-medium text-charcoal">Statements</span>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Statement
          </button>
        )}
      </div>

      {/* Existing statements */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-[#D4CFC7] animate-pulse" />
          ))}
        </div>
      ) : (statements || []).length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed border-[#D4CFC7] bg-[#FAFAF8] p-8 text-center">
          <Upload className="w-6 h-6 mx-auto mb-2 text-slate" />
          <p className="text-sm text-slate">No statements recorded yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm text-copper hover:opacity-80 transition-opacity underline"
          >
            Add first statement
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {(statements || []).map((stmt) => (
            <div key={stmt.id} className="border border-[#D4CFC7] rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === stmt.id ? null : stmt.id ?? null)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#FAFAF8] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">{stmt.personName}</p>
                    <p className="text-xs text-slate">
                      {stmt.statementType} · {stmt.dateObtained || 'Date not set'}
                    </p>
                  </div>
                </div>
                {expandedId === stmt.id ? (
                  <ChevronUp className="w-4 h-4 text-slate" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate" />
                )}
              </button>
              {expandedId === stmt.id && (
                <div className="px-4 pb-4 pt-2 bg-[#FAFAF8] border-t border-[#D4CFC7] space-y-2">
                  {stmt.evidenceFileName && (
                    <p className="text-xs text-slate">
                      Document: <span className="text-charcoal">{stmt.evidenceFileName}</span>
                    </p>
                  )}
                  {stmt.verbalSummary && (
                    <div>
                      <p className="text-xs font-medium text-slate mb-1">Summary:</p>
                      <p className="text-sm text-charcoal whitespace-pre-wrap">{stmt.verbalSummary}</p>
                    </div>
                  )}
                  {stmt.createdAt && (
                    <p className="text-xs text-slate">
                      Recorded: {new Date(stmt.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New statement form */}
      {showForm && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wide">New Statement</h3>
            <button onClick={cancelForm} className="text-slate hover:text-charcoal">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Person Name" required>
              <Input
                value={form.personName}
                onChange={(e) => setForm({ ...form, personName: e.target.value })}
                placeholder="Full name"
              />
            </Field>
            <Field label="Date Obtained">
              <Input
                type="date"
                value={form.dateObtained}
                onChange={(e) => setForm({ ...form, dateObtained: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Statement Type">
            <Select
              value={form.statementType}
              onChange={(e) => setForm({ ...form, statementType: e.target.value as StatementType })}
            >
              {STATEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </Select>
          </Field>

          {/* Document upload */}
          <div>
            <p className="text-xs font-medium text-slate mb-2">Upload Document (optional)</p>
            {form.evidenceFileName ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-charcoal flex-1">{form.evidenceFileName}</span>
                <button
                  onClick={() => setForm({ ...form, evidenceFileName: undefined, evidenceId: undefined })}
                  className="text-slate hover:text-charcoal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => docInputRef.current?.click()}
                disabled={docUploading}
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-[#D4CFC7] rounded-lg text-sm text-slate hover:border-copper hover:text-copper transition-colors disabled:opacity-50"
              >
                {docUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {docUploading ? 'Uploading...' : 'Upload document'}
              </button>
            )}
            {docError && (
              <div className="flex items-center gap-2 mt-1 text-xs text-red-500">
                <AlertCircle className="w-3 h-3" /> {docError}
              </div>
            )}
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.doc,.docx,image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleDocUpload(file)
                e.target.value = ''
              }}
            />
          </div>

          {/* Verbal summary */}
          <Field label="Verbal Summary / Notes">
            <Textarea
              value={form.verbalSummary}
              onChange={(e) => setForm({ ...form, verbalSummary: e.target.value })}
              placeholder="Record verbal summary or notes..."
              rows={4}
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D4CFC7]">
            <button
              onClick={cancelForm}
              className="px-4 py-2 text-sm text-slate border border-[#D4CFC7] rounded-lg hover:border-copper transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.personName.trim()}
              className="px-5 py-2 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Statement'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
