'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { FileDown, Upload, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import { useUploadEvidence } from '@/hooks/use-evidence'
import { Field, Input, CurrencyInput } from '@/components/assessment/shared'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface RepairerQuoteData {
  repairerName: string
  quoteNumber: string
  quoteDate: string
  quotedAmount: number
  validityPeriod: string
  partsTotal: number
  labourTotal: number
  paintTotal: number
  miscTotal: number
}

const EMPTY_FORM: RepairerQuoteData = {
  repairerName: '',
  quoteNumber: '',
  quoteDate: '',
  quotedAmount: 0,
  validityPeriod: '',
  partsTotal: 0,
  labourTotal: 0,
  paintTotal: 0,
  miscTotal: 0,
}

export function RepairerQuoteDropSection({ caseId, orgSettings }: SectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadEvidence()

  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [form, setForm] = useState<RepairerQuoteData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currencySymbol = orgSettings?.currency_symbol || 'R'
  const autoTotal = form.partsTotal + form.labourTotal + form.paintTotal + form.miscTotal

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      await uploadMutation.mutateAsync({
        caseId,
        file,
        mediaType: 'document',
        options: { tags: ['REPAIRER_QUOTE'] },
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
  function onDragLeave() { setIsDragOver(false) }
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
      await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: 'repairer_quote_data',
          body: JSON.stringify({ ...form, autoTotal }),
        }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // best-effort
    } finally {
      setSaving(false)
    }
  }

  function setField<K extends keyof RepairerQuoteData>(key: K, value: RepairerQuoteData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FileDown className="w-4 h-4 text-slate" />
        <span className="text-sm font-medium text-charcoal">Repairer Quote</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          isDragOver ? 'border-copper bg-copper/5'
          : uploadedName ? 'border-emerald-400 bg-emerald-50'
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
            <p className="text-xs text-slate">Uploaded — enter values manually below</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-slate" />
            <p className="text-sm font-medium text-charcoal">Drop repairer quote here (PDF or image)</p>
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

      {/* Manual entry */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wide">Quote Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Repairer Name">
            <Input
              value={form.repairerName}
              onChange={(e) => setField('repairerName', e.target.value)}
              placeholder="e.g. ABC Panel Beaters"
            />
          </Field>
          <Field label="Quote Number">
            <Input
              value={form.quoteNumber}
              onChange={(e) => setField('quoteNumber', e.target.value)}
              placeholder="e.g. Q-12345"
            />
          </Field>
          <Field label="Quote Date">
            <Input
              type="date"
              value={form.quoteDate}
              onChange={(e) => setField('quoteDate', e.target.value)}
            />
          </Field>
          <Field label="Validity Period">
            <Input
              value={form.validityPeriod}
              onChange={(e) => setField('validityPeriod', e.target.value)}
              placeholder="e.g. 30 days"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Parts Total">
            <CurrencyInput
              value={form.partsTotal}
              onChange={(v) => setField('partsTotal', v)}
              currencySymbol={currencySymbol}
            />
          </Field>
          <Field label="Labour Total">
            <CurrencyInput
              value={form.labourTotal}
              onChange={(v) => setField('labourTotal', v)}
              currencySymbol={currencySymbol}
            />
          </Field>
          <Field label="Paint Total">
            <CurrencyInput
              value={form.paintTotal}
              onChange={(v) => setField('paintTotal', v)}
              currencySymbol={currencySymbol}
            />
          </Field>
          <Field label="Miscellaneous">
            <CurrencyInput
              value={form.miscTotal}
              onChange={(v) => setField('miscTotal', v)}
              currencySymbol={currencySymbol}
            />
          </Field>
        </div>

        {/* Auto total */}
        <div className="flex items-center justify-between py-3 px-4 bg-[#FAFAF8] rounded-lg border border-[#D4CFC7]">
          <span className="text-sm font-medium text-charcoal">Calculated Total</span>
          <span className="text-base font-semibold text-copper">
            {currencySymbol} {autoTotal.toFixed(2)}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#D4CFC7]">
          {saved && <span className="text-sm text-emerald-600">&#x2713; Saved</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </div>
    </div>
  )
}
