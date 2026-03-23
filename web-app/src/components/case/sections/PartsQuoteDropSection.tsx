'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { FileDown, Upload, AlertCircle, Loader2, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { useUploadEvidence } from '@/hooks/use-evidence'
import { Field, Input, CurrencyInput } from '@/components/assessment/shared'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface PartRow {
  id: string
  description: string
  partNumber: string
  price: number
}

interface PartsQuoteData {
  supplierName: string
  quoteNumber: string
  quoteDate: string
  parts: PartRow[]
}

function newPartRow(): PartRow {
  return { id: crypto.randomUUID(), description: '', partNumber: '', price: 0 }
}

export function PartsQuoteDropSection({ caseId, orgSettings }: SectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadEvidence()

  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [form, setForm] = useState<PartsQuoteData>({
    supplierName: '',
    quoteNumber: '',
    quoteDate: '',
    parts: [newPartRow()],
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currencySymbol = orgSettings?.currency_symbol || 'R'
  const runningTotal = form.parts.reduce((sum, row) => sum + row.price, 0)

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      await uploadMutation.mutateAsync({
        caseId,
        file,
        mediaType: 'document',
        options: { tags: ['PARTS_QUOTE'] },
      })
      setUploadedName(file.name)
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragOver(true) }
  function onDragLeave() { setIsDragOver(false) }
  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault(); setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  function addRow() {
    setForm((prev) => ({ ...prev, parts: [...prev.parts, newPartRow()] }))
  }

  function removeRow(id: string) {
    setForm((prev) => ({ ...prev, parts: prev.parts.filter((r) => r.id !== id) }))
  }

  function updateRow(id: string, field: keyof PartRow, value: string | number) {
    setForm((prev) => ({
      ...prev,
      parts: prev.parts.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: 'parts_quote_data',
          body: JSON.stringify({ ...form, runningTotal }),
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

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FileDown className="w-4 h-4 text-slate" />
        <span className="text-sm font-medium text-charcoal">Parts Quote</span>
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
            <p className="text-sm font-medium text-charcoal">Drop parts quote here (PDF or image)</p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Supplier Name">
            <Input
              value={form.supplierName}
              onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
              placeholder="e.g. AutoZone"
            />
          </Field>
          <Field label="Quote Number">
            <Input
              value={form.quoteNumber}
              onChange={(e) => setForm({ ...form, quoteNumber: e.target.value })}
              placeholder="e.g. PQ-001"
            />
          </Field>
          <Field label="Quote Date">
            <Input
              type="date"
              value={form.quoteDate}
              onChange={(e) => setForm({ ...form, quoteDate: e.target.value })}
            />
          </Field>
        </div>

        {/* Parts table */}
        <div>
          <p className="text-xs font-medium text-slate mb-2 uppercase tracking-wide">Parts List</p>
          <div className="border border-[#D4CFC7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#FAFAF8]">
                <tr>
                  <th className="text-left text-xs font-medium text-slate px-3 py-2">Description</th>
                  <th className="text-left text-xs font-medium text-slate px-3 py-2">Part No.</th>
                  <th className="text-left text-xs font-medium text-slate px-3 py-2 w-36">Price</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {form.parts.map((row, i) => (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        placeholder="Part description"
                        className="w-full px-2 py-1 text-sm border border-[#D4CFC7] rounded focus:outline-none focus:ring-1 focus:ring-copper/30 focus:border-copper"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.partNumber}
                        onChange={(e) => updateRow(row.id, 'partNumber', e.target.value)}
                        placeholder="Part #"
                        className="w-full px-2 py-1 text-sm border border-[#D4CFC7] rounded focus:outline-none focus:ring-1 focus:ring-copper/30 focus:border-copper"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <CurrencyInput
                        value={row.price}
                        onChange={(v) => updateRow(row.id, 'price', v)}
                        currencySymbol={currencySymbol}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={form.parts.length === 1}
                        className="text-slate hover:text-red-500 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={addRow}
            className="mt-2 flex items-center gap-1.5 text-sm text-copper hover:opacity-80 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add row
          </button>
        </div>

        {/* Running total */}
        <div className="flex items-center justify-between py-3 px-4 bg-[#FAFAF8] rounded-lg border border-[#D4CFC7]">
          <span className="text-sm font-medium text-charcoal">Running Total</span>
          <span className="text-base font-semibold text-copper">
            {currencySymbol} {runningTotal.toFixed(2)}
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
