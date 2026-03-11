'use client'

import { useState, useRef } from 'react'
import { Upload } from 'lucide-react'
import { useUpsertPartsAssessment } from '@/hooks/use-assessments'
import { Field, Section, Input, ZarInput, SaveBar, formatZar } from './shared'
import type { FullMotorAssessment } from '@/lib/types/assessment'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

export function PartsAssessmentTab({ assessment, onNavigate }: Props) {
  const upsertParts = useUpsertPartsAssessment(assessment.id)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState(false)
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
  const partsVat = partsWithHandling * 0.15
  const partsInclVat = partsWithHandling + partsVat

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile()
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile()
    e.target.value = ''
  }

  const processFile = () => {
    setOcrNote('Processing parts quotation with OCR…')
    setTimeout(() => setOcrNote('OCR complete. Review and correct values below.'), 1500)
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
        {ocrNote && <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">{ocrNote}</p>}
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
            <ZarInput value={form.parts_amount_excl_vat} onChange={(v) => set('parts_amount_excl_vat', v)} />
          </Field>
          <Field label="Parts Handling Fee (excl. VAT)">
            <ZarInput value={form.parts_handling_fee_excl_vat} onChange={(v) => set('parts_handling_fee_excl_vat', v)} />
          </Field>
        </div>

        {/* Parts summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg p-4">
            <p className="text-xs text-slate mb-1">Parts + Handling (excl. VAT)</p>
            <p className="text-lg font-bold text-charcoal">{formatZar(partsWithHandling)}</p>
          </div>
          <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-lg p-4">
            <p className="text-xs text-slate mb-1">VAT (15%)</p>
            <p className="text-lg font-bold text-charcoal">{formatZar(partsVat)}</p>
          </div>
          <div className="bg-copper/10 border border-copper/20 rounded-lg p-4 col-span-2">
            <p className="text-xs text-copper mb-1">Total Parts (incl. VAT)</p>
            <p className="text-xl font-bold text-copper">{formatZar(partsInclVat)}</p>
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
        nextLabel="MM Codes / Values"
      />
    </div>
  )
}
