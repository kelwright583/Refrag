'use client'

import { useState, useEffect, useRef } from 'react'
import { List, Plus, Trash2, Download, Upload, Loader2 } from 'lucide-react'
import { useCaseNotes, useUpsertCaseNote } from '@/hooks/use-case-notes'

interface SectionProps {
  caseId: string
  orgSettings: any
}

type ItemCategory =
  | 'furniture'
  | 'electronics'
  | 'appliances'
  | 'clothing'
  | 'jewellery'
  | 'tools'
  | 'other'

interface InventoryRow {
  id: string
  item: string
  category: ItemCategory
  qty: number
  purchasePrice: number
  age: string
  depreciationPct: number
}

const CATEGORY_OPTIONS: { value: ItemCategory; label: string }[] = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'appliances', label: 'Appliances' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'jewellery', label: 'Jewellery' },
  { value: 'tools', label: 'Tools' },
  { value: 'other', label: 'Other' },
]

function calcAssessedValue(row: InventoryRow): number {
  return row.purchasePrice * (1 - row.depreciationPct / 100) * row.qty
}

function newRow(): InventoryRow {
  return {
    id: crypto.randomUUID(),
    item: '',
    category: 'furniture',
    qty: 1,
    purchasePrice: 0,
    age: '',
    depreciationPct: 0,
  }
}

function formatZar(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

type EditingCell = { rowId: string; field: keyof InventoryRow } | null

export function ContentsInventorySection({ caseId }: SectionProps) {
  const { data: inventoryNotes, isLoading: inventoryLoading } = useCaseNotes(caseId, 'contents_inventory')
  const { data: contentsListNotes, isLoading: listLoading } = useCaseNotes(caseId, 'contents_list_data')
  const upsert = useUpsertCaseNote(caseId)

  const [rows, setRows] = useState<InventoryRow[]>([])
  const [editingCell, setEditingCell] = useState<EditingCell>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const cellInputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null)

  useEffect(() => {
    if (inventoryNotes && inventoryNotes.length > 0) {
      const raw = inventoryNotes[0].content
      if (Array.isArray(raw)) {
        setRows(raw as InventoryRow[])
      }
    }
  }, [inventoryNotes])

  useEffect(() => {
    if (editingCell && cellInputRef.current) {
      cellInputRef.current.focus()
    }
  }, [editingCell])

  const updateRow = (id: string, field: keyof InventoryRow, value: string | number) => {
    setRows((rs) => rs.map((r) => r.id === id ? ({ ...r, [field]: value } as InventoryRow) : r))
  }

  const handleSave = async () => {
    await upsert.mutateAsync({ noteType: 'contents_inventory', content: rows })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const handleDelete = (id: string) => {
    setRows((rs) => rs.filter((r) => r.id !== id))
    setConfirmDeleteId(null)
  }

  const handleImportFromContentsList = () => {
    if (!contentsListNotes || contentsListNotes.length === 0) return
    const raw = contentsListNotes[0].content
    if (!Array.isArray(raw)) return
    const imported: InventoryRow[] = (raw as any[]).map((item: any) => ({
      id: crypto.randomUUID(),
      item: item.description || item.item || '',
      category: (item.category as ItemCategory) || 'other',
      qty: item.qty ?? item.quantity ?? 1,
      purchasePrice: item.purchasePrice ?? item.value ?? 0,
      age: item.age ?? '',
      depreciationPct: item.depreciationPct ?? 0,
    }))
    setRows((rs) => [...rs, ...imported])
  }

  const handleExportCsv = () => {
    const headers = ['Item', 'Category', 'Qty', 'Purchase Price (R)', 'Age', 'Depreciation %', 'Assessed Value (R)']
    const csvRows = rows.map((r) => [
      `"${r.item.replace(/"/g, '""')}"`,
      r.category,
      r.qty,
      r.purchasePrice.toFixed(2),
      `"${r.age}"`,
      r.depreciationPct,
      calcAssessedValue(r).toFixed(2),
    ])
    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contents_inventory_${caseId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const totalPurchase = rows.reduce((s, r) => s + r.purchasePrice * r.qty, 0)
  const totalAssessed = rows.reduce((s, r) => s + calcAssessedValue(r), 0)

  const isLoading = inventoryLoading || listLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading contents inventory…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-charcoal">
          <List className="w-4 h-4" />
          <span className="text-sm font-semibold">Contents Inventory</span>
        </div>
        <div className="flex items-center gap-2">
          {contentsListNotes && contentsListNotes.length > 0 && (
            <button
              onClick={handleImportFromContentsList}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-xs text-slate hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Import from Contents List
            </button>
          )}
          {rows.length > 0 && (
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#D4CFC7] rounded-lg text-xs text-slate hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D4CFC7]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#FAFAF8] border-b border-[#D4CFC7]">
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate uppercase tracking-wide min-w-[160px]">Item</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate uppercase tracking-wide min-w-[120px]">Category</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate uppercase tracking-wide w-16">Qty</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate uppercase tracking-wide min-w-[110px]">Purchase Price</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate uppercase tracking-wide w-24">Age</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate uppercase tracking-wide w-20">Dep. %</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate uppercase tracking-wide min-w-[120px]">Assessed Value</th>
              <th className="px-3 py-2.5 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}>
                {/* Item */}
                <td className="px-3 py-2" onClick={() => setEditingCell({ rowId: row.id, field: 'item' })}>
                  {editingCell?.rowId === row.id && editingCell.field === 'item' ? (
                    <input
                      ref={(el) => { cellInputRef.current = el }}
                      value={row.item}
                      onChange={(e) => updateRow(row.id, 'item', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      className="w-full px-2 py-1 border border-copper/40 rounded text-sm text-charcoal focus:outline-none"
                    />
                  ) : (
                    <span className="cursor-text text-charcoal hover:text-copper transition-colors">
                      {row.item || <span className="text-slate/40 text-xs">Click to edit</span>}
                    </span>
                  )}
                </td>

                {/* Category */}
                <td className="px-3 py-2" onClick={() => setEditingCell({ rowId: row.id, field: 'category' })}>
                  {editingCell?.rowId === row.id && editingCell.field === 'category' ? (
                    <select
                      ref={(el) => { cellInputRef.current = el }}
                      value={row.category}
                      onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      className="w-full px-2 py-1 border border-copper/40 rounded text-sm text-charcoal focus:outline-none bg-white"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="cursor-text text-charcoal hover:text-copper transition-colors capitalize">
                      {row.category}
                    </span>
                  )}
                </td>

                {/* Qty */}
                <td className="px-3 py-2 text-right" onClick={() => setEditingCell({ rowId: row.id, field: 'qty' })}>
                  {editingCell?.rowId === row.id && editingCell.field === 'qty' ? (
                    <input
                      ref={(el) => { cellInputRef.current = el }}
                      type="number"
                      min={1}
                      value={row.qty}
                      onChange={(e) => updateRow(row.id, 'qty', parseInt(e.target.value) || 1)}
                      onBlur={() => setEditingCell(null)}
                      className="w-16 px-2 py-1 border border-copper/40 rounded text-sm text-right text-charcoal focus:outline-none"
                    />
                  ) : (
                    <span className="cursor-text text-charcoal hover:text-copper transition-colors">{row.qty}</span>
                  )}
                </td>

                {/* Purchase Price */}
                <td className="px-3 py-2 text-right" onClick={() => setEditingCell({ rowId: row.id, field: 'purchasePrice' })}>
                  {editingCell?.rowId === row.id && editingCell.field === 'purchasePrice' ? (
                    <input
                      ref={(el) => { cellInputRef.current = el }}
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.purchasePrice}
                      onChange={(e) => updateRow(row.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                      onBlur={() => setEditingCell(null)}
                      className="w-28 px-2 py-1 border border-copper/40 rounded text-sm text-right text-charcoal focus:outline-none"
                    />
                  ) : (
                    <span className="cursor-text text-charcoal hover:text-copper transition-colors">
                      {formatZar(row.purchasePrice)}
                    </span>
                  )}
                </td>

                {/* Age */}
                <td className="px-3 py-2" onClick={() => setEditingCell({ rowId: row.id, field: 'age' })}>
                  {editingCell?.rowId === row.id && editingCell.field === 'age' ? (
                    <input
                      ref={(el) => { cellInputRef.current = el }}
                      value={row.age}
                      onChange={(e) => updateRow(row.id, 'age', e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      placeholder="e.g. 3 yrs"
                      className="w-20 px-2 py-1 border border-copper/40 rounded text-sm text-charcoal focus:outline-none"
                    />
                  ) : (
                    <span className="cursor-text text-charcoal hover:text-copper transition-colors">
                      {row.age || <span className="text-slate/40 text-xs">—</span>}
                    </span>
                  )}
                </td>

                {/* Depreciation % */}
                <td className="px-3 py-2 text-right" onClick={() => setEditingCell({ rowId: row.id, field: 'depreciationPct' })}>
                  {editingCell?.rowId === row.id && editingCell.field === 'depreciationPct' ? (
                    <input
                      ref={(el) => { cellInputRef.current = el }}
                      type="number"
                      min={0}
                      max={100}
                      value={row.depreciationPct}
                      onChange={(e) => updateRow(row.id, 'depreciationPct', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                      onBlur={() => setEditingCell(null)}
                      className="w-16 px-2 py-1 border border-copper/40 rounded text-sm text-right text-charcoal focus:outline-none"
                    />
                  ) : (
                    <span className="cursor-text text-charcoal hover:text-copper transition-colors">
                      {row.depreciationPct}%
                    </span>
                  )}
                </td>

                {/* Assessed Value — read only */}
                <td className="px-3 py-2 text-right font-semibold text-charcoal">
                  {formatZar(calcAssessedValue(row))}
                </td>

                {/* Delete */}
                <td className="px-3 py-2 text-center">
                  {confirmDeleteId === row.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-xs px-1.5 py-0.5 bg-red-500 text-white rounded font-medium"
                      >
                        Del
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs px-1.5 py-0.5 border border-[#D4CFC7] text-slate rounded"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(row.id)}
                      className="text-slate/30 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Totals row */}
            {rows.length > 0 && (
              <tr className="border-t-2 border-[#D4CFC7] bg-copper/5 font-bold">
                <td className="px-3 py-2.5 text-sm text-charcoal" colSpan={3}>
                  Totals ({rows.length} item{rows.length !== 1 ? 's' : ''})
                </td>
                <td className="px-3 py-2.5 text-right text-sm text-charcoal">{formatZar(totalPurchase)}</td>
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5" />
                <td className="px-3 py-2.5 text-right text-sm text-copper">{formatZar(totalAssessed)}</td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-4 text-xs text-slate">
          No items yet — click &ldquo;Add Row&rdquo; to start
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="flex items-center gap-1.5 text-sm text-copper hover:opacity-80 font-medium transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate">
            {saved && <span className="text-emerald-600">✓ Saved</span>}
          </span>
          <button
            onClick={handleSave}
            disabled={upsert.isPending}
            className="px-5 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {upsert.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
