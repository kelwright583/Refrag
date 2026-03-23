'use client'

import { useRef, useState, DragEvent, ChangeEvent } from 'react'
import { FileDown, Upload, AlertCircle, Loader2, CheckCircle, Plus, Trash2 } from 'lucide-react'
import { useUploadEvidence } from '@/hooks/use-evidence'
import { CurrencyInput } from '@/components/assessment/shared'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface ContentRow {
  id: string
  description: string
  quantity: number
  replacementValue: number
  ageCondition: string
  depreciation: number
}

function newContentRow(): ContentRow {
  return {
    id: crypto.randomUUID(),
    description: '',
    quantity: 1,
    replacementValue: 0,
    ageCondition: '',
    depreciation: 0,
  }
}

function calcNetValue(row: ContentRow): number {
  return row.replacementValue * (1 - row.depreciation / 100) * row.quantity
}

export function ContentsListDropSection({ caseId, orgSettings }: SectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadEvidence()

  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [rows, setRows] = useState<ContentRow[]>([newContentRow()])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currencySymbol = orgSettings?.currency_symbol || 'R'
  const runningTotal = rows.reduce((sum, r) => sum + calcNetValue(r), 0)

  async function handleFile(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      await uploadMutation.mutateAsync({
        caseId,
        file,
        mediaType: 'document',
        options: { tags: ['CONTENTS_LIST'] },
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

  function addRow() { setRows((prev) => [...prev, newContentRow()]) }
  function removeRow(id: string) { setRows((prev) => prev.filter((r) => r.id !== id)) }
  function updateRow(id: string, field: keyof ContentRow, value: string | number) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await fetch(`/api/cases/${caseId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_type: 'contents_list_data',
          body: JSON.stringify({ rows, runningTotal }),
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
        <span className="text-sm font-medium text-charcoal">Contents List</span>
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
            <p className="text-xs text-slate">Uploaded — enter items manually below</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-6 h-6 text-slate" />
            <p className="text-sm font-medium text-charcoal">Drop contents list here (PDF or image)</p>
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

      {/* Contents table */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-charcoal uppercase tracking-wide">Contents Inventory</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-[#FAFAF8]">
              <tr>
                <th className="text-left text-xs font-medium text-slate px-3 py-2">Item Description</th>
                <th className="text-left text-xs font-medium text-slate px-3 py-2 w-16">Qty</th>
                <th className="text-left text-xs font-medium text-slate px-3 py-2 w-36">Replacement Value</th>
                <th className="text-left text-xs font-medium text-slate px-3 py-2 w-32">Age / Condition</th>
                <th className="text-left text-xs font-medium text-slate px-3 py-2 w-20">Dep %</th>
                <th className="text-left text-xs font-medium text-slate px-3 py-2 w-32">Net Value</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const net = calcNetValue(row)
                return (
                  <tr key={row.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        placeholder="Item name"
                        className="w-full px-2 py-1 text-sm border border-[#D4CFC7] rounded focus:outline-none focus:ring-1 focus:ring-copper/30 focus:border-copper"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 text-sm border border-[#D4CFC7] rounded focus:outline-none focus:ring-1 focus:ring-copper/30 focus:border-copper text-center"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <CurrencyInput
                        value={row.replacementValue}
                        onChange={(v) => updateRow(row.id, 'replacementValue', v)}
                        currencySymbol={currencySymbol}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={row.ageCondition}
                        onChange={(e) => updateRow(row.id, 'ageCondition', e.target.value)}
                        placeholder="2 years / Good"
                        className="w-full px-2 py-1 text-sm border border-[#D4CFC7] rounded focus:outline-none focus:ring-1 focus:ring-copper/30 focus:border-copper"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={row.depreciation}
                        onChange={(e) => updateRow(row.id, 'depreciation', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-[#D4CFC7] rounded focus:outline-none focus:ring-1 focus:ring-copper/30 focus:border-copper text-center"
                      />
                    </td>
                    <td className="px-3 py-1.5 text-sm font-medium text-charcoal">
                      {currencySymbol} {net.toFixed(2)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="text-slate hover:text-red-500 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-sm text-copper hover:opacity-80 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add row
        </button>

        {/* Running total */}
        <div className="flex items-center justify-between py-3 px-4 bg-[#FAFAF8] rounded-lg border border-[#D4CFC7]">
          <span className="text-sm font-medium text-charcoal">Total Net Value</span>
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
            {saving ? 'Saving...' : 'Save List'}
          </button>
        </div>
      </div>
    </div>
  )
}
