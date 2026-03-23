'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { FileDown, Upload, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { useUploadEvidence } from '@/hooks/use-evidence'
import { Field, Input, Select, CurrencyInput } from '@/components/assessment/shared'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface ValuationData {
  retailValue: number
  tradeValue: number
  marketValue: number
  source: string
  valuationDate: string
}

const EMPTY_FORM: ValuationData = {
  retailValue: 0,
  tradeValue: 0,
  marketValue: 0,
  source: 'Lightstone',
  valuationDate: '',
}

const SOURCE_OPTIONS = ['Lightstone', 'TransUnion', "Glass's", 'Other']

export function ValuationDropSection({ caseId, orgSettings }: SectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadEvidence()

  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [form, setForm] = useState<ValuationData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currencySymbol = orgSettings?.currency_symbol || 'R'

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      await uploadMutation.mutateAsync({
        caseId,
        file,
        mediaType: 'document',
        options: { tags: ['VALUATION'] },
      })
      setUploadedName(file.name)
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function onDragLeave() {
    setIsDragOver(false)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      const body = JSON.stringify(form)
      // Store as a case note via the notes API
      await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: 'valuation_data',
          body,
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // best-effort; values are shown from local state
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FileDown className="w-4 h-4 text-slate" />
        <span className="text-sm font-medium text-charcoal">Valuation Printout</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragOver
            ? 'border-copper bg-copper/5'
            : uploadedName
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-[#D4CFC7] bg-[#FAFAF8] hover:border-copper/50'
        } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-copper animate-spin" />
            <p className="text-sm text-slate">Uploading...</p>
          </div>
        ) : uploadedName ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-500" />
            <p className="text-sm font-medium text-charcoal">{uploadedName}</p>
            <p className="text-xs text-slate">Document uploaded — values must be entered manually below</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-slate" />
            <p className="text-sm font-medium text-charcoal">Drop valuation printout here (PDF or image)</p>
            <p className="text-xs text-slate">or click to browse</p>
          </div>
        )}
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {uploadError}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={onFileChange} />

      {/* Manual entry fields */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wide">Valuation Values</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Retail Value">
            <CurrencyInput
              value={form.retailValue}
              onChange={(v) => setForm({ ...form, retailValue: v })}
              currencySymbol={currencySymbol}
            />
          </Field>
          <Field label="Trade Value">
            <CurrencyInput
              value={form.tradeValue}
              onChange={(v) => setForm({ ...form, tradeValue: v })}
              currencySymbol={currencySymbol}
            />
          </Field>
          <Field label="Market Value">
            <CurrencyInput
              value={form.marketValue}
              onChange={(v) => setForm({ ...form, marketValue: v })}
              currencySymbol={currencySymbol}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Source">
            <Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              {SOURCE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date of Valuation">
            <Input
              type="date"
              value={form.valuationDate}
              onChange={(e) => setForm({ ...form, valuationDate: e.target.value })}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#D4CFC7]">
          {saved && <span className="text-sm text-emerald-600">&#x2713; Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Values'}
          </button>
        </div>
      </div>
    </div>
  )
}
