'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Loader2, AlertCircle, Download, Mail, Receipt, RefreshCw } from 'lucide-react'
import { useCase } from '@/hooks/use-cases'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

interface InvoiceState {
  billTo: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  lineItems: LineItem[]
  notes: string
}

const VAT_RATE = 0.15
const TIME_DISB_STORAGE_PREFIX = 'time_disbursements_data_'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function generateInvoiceNumber(): string {
  const now = new Date()
  const seq = String(Math.floor(Math.random() * 9999)).padStart(4, '0')
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${seq}`
}

function fmt(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const todayStr = new Date().toISOString().slice(0, 10)

export function InvoiceBuilderSection({ caseId }: SectionProps) {
  const { data: caseData, isLoading: caseLoading } = useCase(caseId)

  const [invoice, setInvoice] = useState<InvoiceState>({
    billTo: '',
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: todayStr,
    dueDate: addDays(todayStr, 30),
    lineItems: [{ id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }],
    notes: '',
  })

  const [saving, setSaving] = useState(false)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  // Pre-populate bill-to from case
  useEffect(() => {
    if (caseData && !invoice.billTo) {
      setInvoice(prev => ({
        ...prev,
        billTo: caseData.client_name ?? caseData.insurer_name ?? '',
      }))
    }
  }, [caseData]) // eslint-disable-line react-hooks/exhaustive-deps

  const setField = useCallback(<K extends keyof InvoiceState>(key: K, val: InvoiceState[K]) => {
    setInvoice(prev => ({ ...prev, [key]: val }))
  }, [])

  // Line item operations
  const addLineItem = () => {
    setInvoice(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }],
    }))
  }

  const removeLineItem = (id: string) => {
    setInvoice(prev => ({ ...prev, lineItems: prev.lineItems.filter(li => li.id !== id) }))
  }

  const updateLineItem = (id: string, updates: Partial<Omit<LineItem, 'id'>>) => {
    setInvoice(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(li => li.id === id ? { ...li, ...updates } : li),
    }))
  }

  // Import from time & disbursements
  const handleImportFromTimeDisbursements = () => {
    setImportError(null)
    try {
      const raw = localStorage.getItem(`${TIME_DISB_STORAGE_PREFIX}${caseId}`)
      if (!raw) { setImportError('No time & disbursement data found. Add entries in the Time & Disbursements tab first.'); return }
      const parsed = JSON.parse(raw)
      const timeEntries: Array<{ activity: string; type: string; hours: number; rate: number }> = parsed.time || []
      const disbEntries: Array<{ description: string; category: string; amount: number }> = parsed.disbursements || []

      const newItems: LineItem[] = [
        ...timeEntries.map(e => ({
          id: crypto.randomUUID(),
          description: `${e.type} — ${e.activity}`,
          quantity: e.hours,
          unitPrice: e.rate,
        })),
        ...disbEntries.map(e => ({
          id: crypto.randomUUID(),
          description: `${e.category}: ${e.description}`,
          quantity: 1,
          unitPrice: e.amount,
        })),
      ]

      if (newItems.length === 0) { setImportError('No time or disbursement entries to import.'); return }

      setInvoice(prev => ({
        ...prev,
        lineItems: newItems,
      }))
    } catch {
      setImportError('Failed to import data.')
    }
  }

  // Totals
  const subtotalExcl = invoice.lineItems.reduce((s, li) => s + (li.quantity * li.unitPrice), 0)
  const vat = subtotalExcl * VAT_RATE
  const total = subtotalExcl + vat

  const handleSave = async () => {
    if (!caseData) return
    setSaving(true)
    setSaveError(null)

    try {
      const lineItemsPayload = invoice.lineItems
        .filter(li => li.description.trim())
        .map(li => ({
          description: li.description,
          quantity: li.quantity,
          excl_price: li.unitPrice,
          disc_pct: 0,
          vat_pct: 15,
        }))

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: caseId,
          reference: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          due_date: invoice.dueDate,
          notes: invoice.notes || null,
          line_items: lineItemsPayload,
          vat_pct: 15,
          payment_terms_days: 30,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Save failed' }))
        throw new Error(err.error ?? 'Failed to save invoice')
      }

      const data = await res.json()
      setSavedInvoiceId(data.id)
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    if (!savedInvoiceId) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/invoices/${savedInvoiceId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }))
        throw new Error(err.error ?? 'Failed to generate invoice PDF')
      }
      const data = await res.json()
      setDownloadUrl(data.url ?? null)
      if (data.url) {
        window.open(data.url, '_blank')
      }
    } catch (err: any) {
      setSaveError(err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (caseLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Invoice header */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-copper" />
          <h3 className="text-sm font-semibold text-charcoal">Invoice Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate mb-1">Bill To</label>
            <input
              type="text"
              value={invoice.billTo}
              onChange={e => setField('billTo', e.target.value)}
              placeholder="Client / insurer name..."
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 placeholder:text-slate/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate mb-1">Invoice Number</label>
            <input
              type="text"
              value={invoice.invoiceNumber}
              onChange={e => setField('invoiceNumber', e.target.value)}
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoice.invoiceDate}
                onChange={e => setField('invoiceDate', e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate mb-1">Due Date</label>
              <input
                type="date"
                value={invoice.dueDate}
                onChange={e => setField('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-charcoal">Line Items</h3>
          <button
            onClick={handleImportFromTimeDisbursements}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#D4CFC7] text-slate rounded-lg hover:bg-slate-50 transition-colors"
            title="Import from Time & Disbursements"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Import from T&amp;D
          </button>
        </div>

        {importError && (
          <div className="flex items-center gap-2 p-2 mb-3 border border-amber-200 bg-amber-50 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <p className="text-xs text-amber-700">{importError}</p>
          </div>
        )}

        {/* Table header */}
        <div className="hidden sm:grid grid-cols-[1fr_80px_100px_100px_28px] gap-2 text-xs font-medium text-slate/60 mb-2 px-1">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Amount</span>
          <span />
        </div>

        <div className="space-y-2">
          {invoice.lineItems.map(li => (
            <div key={li.id} className="grid grid-cols-[1fr_80px_100px_100px_28px] gap-2 items-center">
              <input
                type="text"
                value={li.description}
                onChange={e => updateLineItem(li.id, { description: e.target.value })}
                placeholder="Description..."
                className="px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 placeholder:text-slate/40"
              />
              <input
                type="number"
                step="0.5"
                min="0"
                value={li.quantity}
                onChange={e => updateLineItem(li.id, { quantity: parseFloat(e.target.value) || 0 })}
                className="px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-right text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                value={li.unitPrice}
                onChange={e => updateLineItem(li.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                className="px-2 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-right text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40"
              />
              <div className="px-2 py-1.5 text-sm text-right text-charcoal font-medium bg-slate-50 border border-[#D4CFC7] rounded-lg">
                {fmt(li.quantity * li.unitPrice)}
              </div>
              <button
                onClick={() => removeLineItem(li.id)}
                disabled={invoice.lineItems.length === 1}
                className="p-1 text-slate hover:text-red-500 disabled:opacity-30 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addLineItem}
          className="mt-3 flex items-center gap-1.5 text-sm text-copper hover:text-copper/80 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Line Item
        </button>

        {/* Totals */}
        <div className="mt-5 border-t border-[#D4CFC7] pt-4 space-y-1.5">
          <div className="flex justify-between text-sm text-charcoal">
            <span>Subtotal (excl. VAT):</span>
            <span className="font-medium">{fmt(subtotalExcl)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate/70">
            <span>VAT (15%):</span>
            <span>{fmt(vat)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-charcoal border-t border-[#D4CFC7] pt-2 mt-1">
            <span>Total:</span>
            <span>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
        <label className="block text-sm font-semibold text-charcoal mb-2">Notes</label>
        <textarea
          value={invoice.notes}
          onChange={e => setField('notes', e.target.value)}
          rows={3}
          placeholder="Payment terms, bank details, additional notes..."
          className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal bg-white focus:outline-none focus:ring-2 focus:ring-copper/40 resize-y placeholder:text-slate/40"
        />
      </div>

      {/* Error */}
      {saveError && (
        <div className="flex items-center gap-2 p-3 border border-red-200 bg-red-50 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{saveError}</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || !invoice.billTo.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 font-medium text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
          {saving ? 'Saving...' : savedInvoiceId ? 'Update Invoice' : 'Save Invoice'}
        </button>

        {savedInvoiceId && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-5 py-2.5 border border-[#D4CFC7] text-charcoal rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {downloading ? 'Generating...' : 'Download Invoice PDF'}
          </button>
        )}

        <button
          disabled
          title="Email sending not configured"
          className="flex items-center gap-2 px-5 py-2.5 border border-[#D4CFC7] text-slate/40 rounded-lg cursor-not-allowed text-sm font-medium"
        >
          <Mail className="w-4 h-4" />
          Send Invoice
        </button>
      </div>

      {downloadUrl && (
        <div className="p-3 border border-green-200 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">
            PDF ready.{' '}
            <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline hover:no-underline">
              Click here to download
            </a>
          </p>
        </div>
      )}

      {savedInvoiceId && !saveError && (
        <p className="text-xs text-green-600 font-medium">Invoice saved (ID: {savedInvoiceId.slice(0, 8)}...)</p>
      )}
    </div>
  )
}
