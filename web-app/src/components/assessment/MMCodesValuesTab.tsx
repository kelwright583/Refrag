'use client'

import { useState, useRef } from 'react'
import { Upload, FileText } from 'lucide-react'
import { useUpsertVehicleValues } from '@/hooks/use-assessments'
import { Field, Section, CurrencyInput, Select, SaveBar } from './shared'
import { formatCurrency } from '@/lib/utils/formatting'
import type { FullMotorAssessment } from '@/lib/types/assessment'
import { computeMaxRepairValue, computeVehicleTotalValue } from '@/lib/assessment/calculator'

interface Props {
  assessment: FullMotorAssessment
  onNavigate: (tab: string) => void
}

export function MMCodesValuesTab({ assessment, onNavigate }: Props) {
  const upsertValues = useUpsertVehicleValues(assessment.id)
  const [saved, setSaved] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [ocrStatus, setOcrStatus] = useState<'idle' | 'uploading' | 'extracting' | 'parsing' | 'done' | 'error'>('idle')
  const [ocrNote, setOcrNote] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const v = assessment.vehicle_values
  const mmValuationDocs = assessment.assessment_documents?.filter((d) => d.document_type === 'mm_valuation') ?? []

  const [form, setForm] = useState({
    source: v?.source ?? 'mm_guide',
    valuation_date: v?.valuation_date ?? '',
    new_price_value: v?.new_price_value ?? 0,
    retail_value: v?.retail_value ?? 0,
    trade_value: v?.trade_value ?? 0,
    market_value: v?.market_value ?? 0,
    extras_value: v?.extras_value ?? 0,
    less_old_damages: v?.less_old_damages ?? 0,
    max_repair_percentage: v?.max_repair_percentage ?? 75,
    salvage_value: v?.salvage_value ?? 0,
    max_repair_value_override: v?.max_repair_value_override ?? false,
    max_repair_value_manual: v?.max_repair_value ?? 0,
  })

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const vehicleTotalValue = computeVehicleTotalValue(form.retail_value, form.extras_value, form.less_old_damages)
  const maxRepairValue = form.max_repair_value_override
    ? form.max_repair_value_manual
    : computeMaxRepairValue(form.retail_value, form.max_repair_percentage)

  const handleSave = async () => {
    await upsertValues.mutateAsync({
      ...form,
      source: form.source as any,
      vehicle_total_value: vehicleTotalValue,
      max_repair_value: maxRepairValue,
    })
    setSaved(true)
  }

  const processFile = async (file: File) => {
    setOcrStatus('uploading')
    setOcrNote('Uploading valuation printout…')
    try {
      const body = new FormData()
      body.append('file', file)
      body.append('document_type', 'mm_valuation')

      setOcrStatus('extracting')
      setOcrNote('Extracting text from document…')

      const res = await fetch('/api/ai/ocr-extract', { method: 'POST', body })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'OCR request failed' }))
        throw new Error(err.error || `OCR failed (${res.status})`)
      }

      setOcrStatus('parsing')
      setOcrNote('Parsing valuation fields…')

      const data = await res.json()

      if (!data.fields) {
        setOcrStatus('done')
        setOcrNote(data.note || 'No text could be extracted. Try a clearer image or text-based PDF.')
        return
      }

      const f = data.fields
      setForm((prev) => ({
        ...prev,
        new_price_value: typeof f.new_price === 'number' ? f.new_price : prev.new_price_value,
        retail_value: typeof f.retail_value === 'number' ? f.retail_value : prev.retail_value,
        trade_value: typeof f.trade_value === 'number' ? f.trade_value : prev.trade_value,
        market_value: typeof f.market_value === 'number' ? f.market_value : prev.market_value,
        valuation_date: f.valuation_date || prev.valuation_date,
      }))
      setSaved(false)

      const avgConf = data.confidence
        ? Math.round(Object.values(data.confidence as Record<string, number>).reduce((a, b) => a + b, 0) / Math.max(Object.keys(data.confidence).length, 1) * 100)
        : 0

      setOcrStatus('done')
      setOcrNote(
        `Extraction complete (${avgConf}% avg. confidence). ` +
        (f.mm_code ? `Identifier: ${f.mm_code}. ` : '') +
        `Vehicle values populated — review and correct below.`
      )
    } catch (err: any) {
      setOcrStatus('error')
      setOcrNote(`OCR failed: ${err.message}`)
    }
  }

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

  return (
    <div className="space-y-5">
      {/* OCR Drop Zone */}
      <Section title="Import Valuation Printout (OCR)">
        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt,image/*" className="hidden" onChange={handleFileInput} />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer ${
            dragging ? 'border-copper bg-copper/5' : 'border-[#D4CFC7] hover:border-copper/50'
          }`}
        >
          <Upload className={`w-8 h-8 ${dragging ? 'text-copper' : 'text-slate/40'}`} />
          <div className="text-center">
            <p className="text-sm font-medium text-charcoal">Drop valuation printout here or click to browse</p>
            <p className="text-xs text-slate mt-1">PDF or image — OCR extracts retail, trade &amp; market values; stored for Report Pack</p>
          </div>
        </div>
        {ocrStatus !== 'idle' && ocrStatus !== 'done' && ocrStatus !== 'error' && (
          <div className="mt-3 flex items-center gap-3 text-sm text-copper bg-copper/5 border border-copper/20 rounded-lg px-4 py-2.5">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-copper border-t-transparent" />
            {ocrNote}
          </div>
        )}
        {ocrNote && (ocrStatus === 'done' || ocrStatus === 'error') && (
          <div className={`mt-3 flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
            ocrStatus === 'error'
              ? 'text-red-700 bg-red-50 border border-red-200'
              : 'text-amber-700 bg-amber-50 border border-amber-200'
          }`}>
            <FileText className="w-4 h-4 flex-shrink-0" />
            {ocrNote}
            {ocrStatus === 'error' && (
              <button onClick={() => fileInputRef.current?.click()} className="ml-2 underline font-medium">Retry</button>
            )}
          </div>
        )}
        {mmValuationDocs.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {mmValuationDocs.map((doc) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium"
              >
                Valuation attached {doc.ocr_status === 'complete' ? '(OCR complete)' : doc.ocr_status}
              </span>
            ))}
          </div>
        )}
      </Section>

      {/* Values */}
      <Section title="Vehicle Values">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <Field label="Valuation Source">
            <Select value={form.source} onChange={(e) => set('source', e.target.value)}>
              <option value="mm_guide">MM Guide (TransUnion)</option>
              <option value="evalue8">eValue8</option>
              <option value="transunion">TransUnion (Other)</option>
              <option value="glass_guide">Glass Guide</option>
              <option value="kbb">KBB / Kelley Blue Book</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Valuation Date">
            <input
              type="date"
              value={form.valuation_date}
              onChange={(e) => set('valuation_date', e.target.value)}
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper transition-colors"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="New Price (OTR)">
            <CurrencyInput value={form.new_price_value} onChange={(v) => set('new_price_value', v)} />
          </Field>
          <Field label="Retail Value" required>
            <CurrencyInput value={form.retail_value} onChange={(v) => set('retail_value', v)} />
          </Field>
          <Field label="Trade Value">
            <CurrencyInput value={form.trade_value} onChange={(v) => set('trade_value', v)} />
          </Field>
          <Field label="Market Value">
            <CurrencyInput value={form.market_value} onChange={(v) => set('market_value', v)} />
          </Field>
          <Field label="Extras Value">
            <CurrencyInput value={form.extras_value} onChange={(v) => set('extras_value', v)} />
          </Field>
          <Field label="Less Old Damages">
            <CurrencyInput value={form.less_old_damages} onChange={(v) => set('less_old_damages', v)} />
          </Field>
          <Field label="Salvage Value">
            <CurrencyInput value={form.salvage_value} onChange={(v) => set('salvage_value', v)} />
          </Field>
        </div>
      </Section>

      {/* Derived Values Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl p-5">
          <p className="text-xs text-slate uppercase tracking-wide mb-1">Vehicle Total Value</p>
          <p className="text-2xl font-bold text-charcoal">{formatCurrency(vehicleTotalValue)}</p>
          <p className="text-xs text-slate mt-1">Retail + Extras − Old Damages</p>
        </div>
        <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-slate uppercase tracking-wide">Max Repair Threshold</p>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.max_repair_value_override}
                onChange={(e) => set('max_repair_value_override', e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#D4CFC7] text-copper focus:ring-copper"
              />
              <span className="text-xs text-slate">Override</span>
            </label>
          </div>
          {form.max_repair_value_override ? (
            <CurrencyInput value={form.max_repair_value_manual} onChange={(v) => set('max_repair_value_manual', v)} />
          ) : (
            <>
              <p className="text-2xl font-bold text-charcoal">{formatCurrency(maxRepairValue)}</p>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.max_repair_percentage}
                  onChange={(e) => set('max_repair_percentage', parseFloat(e.target.value) || 75)}
                  className="w-16 px-2 py-1 border border-[#D4CFC7] rounded text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-copper/30"
                />
                <span className="text-xs text-slate">% of retail</span>
              </div>
            </>
          )}
        </div>
        <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl p-5">
          <p className="text-xs text-slate uppercase tracking-wide mb-1">Write-off If Repair Exceeds</p>
          <p className="text-2xl font-bold text-copper">{formatCurrency(maxRepairValue)}</p>
          <p className="text-xs text-slate mt-1">Based on current threshold</p>
        </div>
      </div>

      <SaveBar
        onSave={handleSave}
        isSaving={upsertValues.isPending}
        saved={saved}
        onNext={() => onNavigate('photos')}
        nextLabel="Photos & Evidence"
      />
    </div>
  )
}
