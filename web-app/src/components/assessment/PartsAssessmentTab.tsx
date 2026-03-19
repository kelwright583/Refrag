'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { useUpsertPartsAssessment } from '@/hooks/use-assessments'
import { Field, Section, Input, CurrencyInput, SaveBar } from './shared'
import { formatCurrency } from '@/lib/utils/formatting'
import type { FullMotorAssessment, AssessmentSettings } from '@/lib/types/assessment'

interface Props {
  assessment: FullMotorAssessment
  settings?: AssessmentSettings | null
  onNavigate: (tab: string) => void
}

export function PartsAssessmentTab({ assessment, settings, onNavigate }: Props) {
  const vatRate = (settings?.vat_rate ?? 15) / 100
  const upsertParts = useUpsertPartsAssessment(assessment.id)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'uploading' | 'extracting' | 'parsing' | 'done' | 'error'>('idle')
  const [ocrNote, setOcrNote] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const p = assessment.parts_assessment

  const [form, setForm] = useState({
    supplier_name: p?.supplier_name ?? '',
    supplier_contact: p?.supplier_contact ?? '',
    supplier_email: p?.supplier_email ?? '',
    notes_on_parts: p?.notes_on_parts ?? '',
    parts_amount_excl_vat: p?.parts_amount_excl_vat ?? 0,
    parts_handling_fee_excl_vat: p?.parts_handling_fee_excl_vat ?? 0,
  })

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    await upsertParts.mutateAsync(form as any)
    setSaved(true)
  }

  const partsWithHandling = form.parts_amount_excl_vat + form.parts_handling_fee_excl_vat
  const partsVat = partsWithHandling * vatRate
  const partsInclVat = partsWithHandling + partsVat

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const processFile = async (file: File) => {
    setOcrStatus('uploading')
    setOcrNote('Uploading parts quotation…')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('document_type', 'parts_quote')

      setOcrStatus('extracting')
      setOcrNote('Extracting text from document…')

      const res = await fetch('/api/ai/ocr-extract', { method: 'POST', body })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'OCR request failed' }))
        throw new Error(err.error || `OCR failed (${res.status})`)
      }

      setOcrStatus('parsing')
      setOcrNote('Parsing parts quotation fields…')

      const data = await res.json()

      if (!data.fields) {
        setOcrStatus('done')
        setOcrNote(data.note || 'No text could be extracted. Try a clearer image or text-based PDF.')
        return
      }

      const f = data.fields
      setForm((prev) => ({
        ...prev,
        supplier_name: f.supplier_name || prev.supplier_name,
        supplier_contact: f.supplier_contact || prev.supplier_contact,
        parts_amount_excl_vat: typeof f.total_amount === 'number' ? f.total_amount : prev.parts_amount_excl_vat,
      }))
      setSaved(false)

      const avgConf = data.confidence
        ? Math.round(Object.values(data.confidence as Record<string, number>).reduce((a, b) => a + b, 0) / Math.max(Object.keys(data.confidence).length, 1) * 100)
        : 0

      setOcrStatus('done')
      setOcrNote(
        `Extraction complete (${avgConf}% avg. confidence). ` +
        `Supplier details and parts amount populated — review and correct below.`
      )
    } catch (err: any) {
      setOcrStatus('error')
      setOcrNote(`OCR failed: ${err.message}`)
    }
  }

  const partsQuoteDocs = assessment.assessment_documents?.filter((d) => d.document_type === 'parts_quote') ?? []

  return (
    <div className="space-y-5">
      {/* OCR import */}
      <Section title="Import Parts Quotation (OCR)">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,image/*" className="hidden" onChange={handleFileInput} />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
            dragging ? 'border-copper bg-copper/5' : 'border-[#D4CFC7] hover:border-copper/50'
          }`}
        >
          <Upload className={`w-7 h-7 ${dragging ? 'text-copper' : 'text-slate/40'}`} />
          <p className="text-sm font-medium text-charcoal">Drop parts quotation here or click to browse</p>
          <p className="text-xs text-slate">PDF or image — OCR extracts amounts; stored for Report Pack</p>
        </div>
        {ocrStatus !== 'idle' && ocrStatus !== 'done' && ocrStatus !== 'error' && (
          <div className="mt-3 flex items-center gap-3 text-sm text-copper bg-copper/5 border border-copper/20 rounded-lg px-4 py-2.5">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-copper border-t-transparent" />
            {ocrNote}
          </div>
        )}
        {ocrNote && (ocrStatus === 'done' || ocrStatus === 'error') && (
          <div className={`mt-2 text-xs rounded px-3 py-1.5 ${
            ocrStatus === 'error'
              ? 'text-red-700 bg-red-50 border border-red-200'
              : 'text-amber-700 bg-amber-50 border border-amber-200'
          }`}>
            {ocrNote}
            {ocrStatus === 'error' && (
              <button onClick={() => fileInputRef.current?.click()} className="ml-2 underline font-medium">Retry</button>
            )}
          </div>
        )}
        {partsQuoteDocs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {partsQuoteDocs.map((doc) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium"
              >
                Parts quotation attached {doc.ocr_status === 'complete' ? '(OCR complete)' : doc.ocr_status}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Supplier */}
      <Section title="Parts Supplier">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Supplier Name">
            <Input value={form.supplier_name} onChange={(e) => set('supplier_name', e.target.value)} placeholder="ABC Parts…" />
          </Field>
          <Field label="Contact Number">
            <Input value={form.supplier_contact} onChange={(e) => set('supplier_contact', e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.supplier_email} onChange={(e) => set('supplier_email', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Parts amounts */}
      <Section title="Parts Amounts">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <Field label="Parts Amount (excl. VAT)">
            <CurrencyInput value={form.parts_amount_excl_vat} onChange={(v) => set('parts_amount_excl_vat', v)} />
          </Field>
          <Field label="Parts Handling Fee (excl. VAT)">
            <CurrencyInput value={form.parts_handling_fee_excl_vat} onChange={(v) => set('parts_handling_fee_excl_vat', v)} />
          </Field>
        </div>

        {/* Parts summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg p-4">
            <p className="text-xs text-slate mb-1">Parts + Handling (excl. VAT)</p>
            <p className="text-lg font-bold text-charcoal">{formatCurrency(partsWithHandling)}</p>
          </div>
          <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg p-4">
            <p className="text-xs text-slate mb-1">VAT ({(vatRate * 100).toFixed(0)}%)</p>
            <p className="text-lg font-bold text-charcoal">{formatCurrency(partsVat)}</p>
          </div>
          <div className="bg-copper/10 border border-copper/20 rounded-lg p-4 col-span-2">
            <p className="text-xs text-copper mb-1">Total Parts (incl. VAT)</p>
            <p className="text-xl font-bold text-copper">{formatCurrency(partsInclVat)}</p>
          </div>
        </div>

        <div className="mt-4">
          <Field label="Notes on Parts">
            <textarea
              value={form.notes_on_parts}
              onChange={(e) => set('notes_on_parts', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors resize-none"
              placeholder="OEM vs aftermarket, availability notes, etc."
            />
          </Field>
        </div>
      </Section>

      <SaveBar
        onSave={handleSave}
        isSaving={upsertParts.isPending}
        saved={saved}
        onNext={() => onNavigate('values')}
        nextLabel="Valuation / Values"
      />
    </div>
  )
}
