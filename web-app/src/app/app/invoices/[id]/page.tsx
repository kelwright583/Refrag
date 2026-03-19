/**
 * Invoice detail & edit page - view, amend line items, generate PDF, change status
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, FileText, Download, Pencil, Calculator } from 'lucide-react'

interface LineItem {
  id?: string
  key: string
  description: string
  detail_lines: string[]
  quantity: number
  excl_price: number
  disc_pct: number
  vat_pct: number
}

interface Invoice {
  id: string
  invoice_number: string
  status: string
  reference: string | null
  date: string | null
  due_date: string | null
  sales_rep: string | null
  overall_discount_pct: number
  vat_pct: number
  total_excl: number
  total_vat: number
  total_discount: number
  sub_total: number
  grand_total: number
  notes: string | null
  payment_terms_days: number
  storage_path: string | null
  amount: number
  currency: string
  case_id: string | null
  client_id: string
  case?: {
    id: string
    case_number: string
    client_name: string
    claim_reference: string | null
    vehicle_registration: string | null
    vehicle_manufacturer: string | null
    vehicle_model: string | null
    assessment_type: string | null
  }
  client?: {
    id: string
    name: string
    vat_number: string | null
    postal_address: string | null
    physical_address: string | null
  }
  line_items: any[]
}

interface RateOption {
  id: string
  rate_name: string
  rate_type: string
  amount: number
  is_inclusive: boolean
  vat_pct: number
}

function newLineItem(): LineItem {
  return {
    key: Math.random().toString(36).slice(2, 10),
    description: '',
    detail_lines: [],
    quantity: 1,
    excl_price: 0,
    disc_pct: 0,
    vat_pct: 15,
  }
}

function calcLine(item: LineItem) {
  const exclTotal = item.quantity * item.excl_price * (1 - item.disc_pct / 100)
  const vatTotal = exclTotal * (item.vat_pct / 100)
  const inclTotal = exclTotal + vatTotal
  return { exclTotal, vatTotal, inclTotal }
}

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [rates, setRates] = useState<RateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [generating, setGenerating] = useState(false)

  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [reference, setReference] = useState('')
  const [salesRep, setSalesRep] = useState('')
  const [overallDiscountPct, setOverallDiscountPct] = useState(0)
  const [notes, setNotes] = useState('')

  const loadInvoice = () => {
    setLoading(true)
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setInvoice(data)
        const items = (data.line_items || []).map((li: any) => ({
          id: li.id,
          key: li.id || Math.random().toString(36).slice(2, 10),
          description: li.description || '',
          detail_lines: li.detail_lines || [],
          quantity: Number(li.quantity) || 1,
          excl_price: Number(li.excl_price) || 0,
          disc_pct: Number(li.disc_pct) || 0,
          vat_pct: Number(li.vat_pct) || 15,
        }))
        setLineItems(items.length > 0 ? items : [newLineItem()])
        setReference(data.reference || '')
        setSalesRep(data.sales_rep || '')
        setOverallDiscountPct(Number(data.overall_discount_pct) || 0)
        setNotes(data.notes || '')
      })
      .catch((err) => {
        console.error('Failed to load invoice:', err)
        setInvoice(null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadInvoice()
    fetch('/api/assessment-rates')
      .then((r) => r.json())
      .then((d) => setRates(Array.isArray(d) ? d : []))
      .catch((err) => console.error('Failed to load rates:', err))
  }, [id])

  const totals = useMemo(() => {
    let totalExcl = 0
    let totalVat = 0
    for (const item of lineItems) {
      const { exclTotal, vatTotal } = calcLine(item)
      totalExcl += exclTotal
      totalVat += vatTotal
    }
    const totalDiscount = totalExcl * (overallDiscountPct / 100)
    const subTotal = totalExcl - totalDiscount + totalVat
    return {
      totalExcl: totalExcl.toFixed(2),
      totalVat: totalVat.toFixed(2),
      totalDiscount: totalDiscount.toFixed(2),
      subTotal: subTotal.toFixed(2),
      grandTotal: subTotal.toFixed(2),
    }
  }, [lineItems, overallDiscountPct])

  const handleSaveAmendment = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          sales_rep: salesRep || null,
          overall_discount_pct: overallDiscountPct,
          notes: notes || null,
          vat_pct: 15,
          line_items: lineItems.filter((i) => i.description.trim()).map((i) => ({
            description: i.description,
            detail_lines: i.detail_lines.filter(Boolean),
            quantity: i.quantity,
            excl_price: i.excl_price,
            disc_pct: i.disc_pct,
            vat_pct: i.vat_pct,
          })),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      setEditing(false)
      loadInvoice()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) loadInvoice()
    else alert((await res.json()).error)
  }

  const handleGeneratePdf = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/invoices/${id}/generate`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error || 'Generation failed')
      loadInvoice()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    const res = await fetch(`/api/invoices/${id}/download`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
    else alert(data.error || 'Generate PDF first')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    if (res.ok) router.push('/app/invoices')
    else alert('Failed to delete')
  }

  const addLineItem = () => setLineItems((prev) => [...prev, newLineItem()])
  const removeLineItem = (key: string) => {
    if (lineItems.length <= 1) return
    setLineItems((prev) => prev.filter((i) => i.key !== key))
  }
  const updateLineItem = (key: string, field: keyof LineItem, value: any) => {
    setLineItems((prev) => prev.map((i) => (i.key === key ? { ...i, [field]: value } : i)))
  }
  const applyRate = (rateId: string, lineKey: string) => {
    const rate = rates.find((r) => r.id === rateId)
    if (!rate) return
    let exclPrice = rate.amount
    if (rate.is_inclusive) exclPrice = rate.amount / (1 + rate.vat_pct / 100)
    setLineItems((prev) => prev.map((i) => {
      if (i.key !== lineKey) return i
      return { ...i, description: `Assessment - ${rate.rate_name}`, excl_price: Math.round(exclPrice * 100) / 100, vat_pct: rate.vat_pct }
    }))
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-9 w-64 bg-[#F5F2EE] rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-[#F5F2EE] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-muted">Invoice not found.</p>
        <Link href="/app/invoices" className="text-sm text-accent hover:underline mt-2 inline-block">Back to Invoices</Link>
      </div>
    )
  }

  const statusColor = {
    draft: 'bg-gray-100 text-gray-700',
    issued: 'bg-blue-50 text-blue-700',
    paid: 'bg-green-50 text-green-700',
  }[invoice.status] || 'bg-gray-100 text-gray-700'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/app/invoices" className="text-sm text-muted hover:text-slate mb-4 inline-block">
        Back to Invoices
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">{invoice.invoice_number}</h1>
          <div className="flex items-center gap-3 mt-2">
            <span className={`text-xs font-medium px-2 py-1 rounded ${statusColor}`}>
              {invoice.status.toUpperCase()}
            </span>
            {invoice.case && (
              <Link href={`/app/cases/${invoice.case.id}`} className="text-sm text-accent hover:underline">
                {invoice.case.case_number}
              </Link>
            )}
            <span className="text-sm text-muted">{invoice.client?.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!editing && invoice.status === 'draft' && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE]"
            >
              <Pencil className="w-4 h-4" />
              Amend
            </button>
          )}
          <select
            value={invoice.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="text-sm border border-[#D4CFC7] rounded-lg px-3 py-2"
          >
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="paid">Paid</option>
          </select>
          {!invoice.storage_path ? (
            <button
              onClick={handleGeneratePdf}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 text-sm bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
            >
              <FileText className="w-4 h-4" />
              {generating ? 'Generating...' : 'Generate PDF'}
            </button>
          ) : (
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-accent border border-accent/20 rounded-lg hover:bg-accent/5"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          )}
          {invoice.status === 'draft' && (
            <button
              onClick={handleDelete}
              className="text-sm text-red-500 hover:underline px-2"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Invoice Summary (view mode) */}
      {!editing && (
        <div className="space-y-4">
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted block">Date</span>
                <span className="text-slate font-medium">{invoice.date || '-'}</span>
              </div>
              <div>
                <span className="text-muted block">Due Date</span>
                <span className="text-slate font-medium">{invoice.due_date || '-'}</span>
              </div>
              <div>
                <span className="text-muted block">Reference</span>
                <span className="text-slate font-medium">{invoice.reference || '-'}</span>
              </div>
              <div>
                <span className="text-muted block">Sales Rep</span>
                <span className="text-slate font-medium">{invoice.sales_rep || '-'}</span>
              </div>
            </div>
          </section>

          {/* Case Details */}
          {invoice.case && (
            <section className="bg-[#F5F2EE] border border-[#D4CFC7] rounded-lg p-4">
              <h3 className="text-sm font-heading font-semibold text-charcoal mb-2">Case Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-slate">
                {invoice.case.claim_reference && <div><span className="text-muted">Claim:</span> {invoice.case.claim_reference}</div>}
                {invoice.case.vehicle_registration && <div><span className="text-muted">Reg:</span> {invoice.case.vehicle_registration}</div>}
                {invoice.case.vehicle_manufacturer && <div><span className="text-muted">Make:</span> {invoice.case.vehicle_manufacturer}</div>}
                {invoice.case.vehicle_model && <div><span className="text-muted">Model:</span> {invoice.case.vehicle_model}</div>}
              </div>
            </section>
          )}

          {/* Line Items (view) */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F2EE]">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted">Description</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Excl. Price</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Disc %</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">VAT %</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Excl. Total</th>
                  <th className="text-right px-4 py-3 font-medium text-muted">Incl. Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E4DE]">
                {(invoice.line_items || []).map((li: any, idx: number) => (
                  <tr key={li.id || idx}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-charcoal">{li.description}</div>
                      {(li.detail_lines || []).filter(Boolean).map((dl: string, i: number) => (
                        <div key={i} className="text-xs text-muted italic">{dl}</div>
                      ))}
                    </td>
                    <td className="text-right px-4 py-3 text-slate">{Number(li.quantity).toFixed(2)}</td>
                    <td className="text-right px-4 py-3 text-slate">R{Number(li.excl_price).toFixed(2)}</td>
                    <td className="text-right px-4 py-3 text-slate">{Number(li.disc_pct).toFixed(2)}%</td>
                    <td className="text-right px-4 py-3 text-slate">{Number(li.vat_pct).toFixed(2)}%</td>
                    <td className="text-right px-4 py-3 text-slate">R{Number(li.excl_total).toFixed(2)}</td>
                    <td className="text-right px-4 py-3 font-medium text-charcoal">R{Number(li.incl_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Totals (view) */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <div className="max-w-sm ml-auto space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Total Discount:</span>
                <span className="font-medium text-slate">R{Number(invoice.total_discount || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total Exclusive:</span>
                <span className="font-medium text-slate">R{Number(invoice.total_excl || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Total VAT:</span>
                <span className="font-medium text-slate">R{Number(invoice.total_vat || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-[#D4CFC7] pt-2">
                <span className="text-muted">Sub Total:</span>
                <span className="font-medium text-slate">R{Number(invoice.sub_total || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-[#D4CFC7] pt-2">
                <span className="font-medium text-charcoal">Grand Total:</span>
                <span className="text-lg font-bold text-accent">R{Number(invoice.grand_total || invoice.amount || 0).toFixed(2)}</span>
              </div>
            </div>
          </section>

          {invoice.notes && (
            <section className="bg-[#F5F2EE] border border-[#D4CFC7] rounded-lg p-4">
              <h3 className="text-sm font-heading font-semibold text-charcoal mb-1">Notes</h3>
              <p className="text-sm text-slate whitespace-pre-wrap">{invoice.notes}</p>
            </section>
          )}
        </div>
      )}

      {/* Edit Mode */}
      {editing && (
        <div className="space-y-6">
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <h2 className="text-lg font-heading font-semibold text-charcoal mb-4">Amend Invoice</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Sales Rep</label>
                <input
                  type="text"
                  value={salesRep}
                  onChange={(e) => setSalesRep(e.target.value)}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Overall Discount %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={overallDiscountPct}
                  onChange={(e) => setOverallDiscountPct(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                />
              </div>
            </div>
          </section>

          {/* Line Items (edit) */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold text-charcoal">Line Items</h2>
              <button
                onClick={addLineItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent hover:bg-accent/5 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Add Line
              </button>
            </div>

            <div className="space-y-3">
              {lineItems.map((item) => {
                const { exclTotal, inclTotal } = calcLine(item)
                return (
                  <div key={item.key} className="border border-[#E8E4DE] rounded-lg p-3">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start">
                      <div className="col-span-4 space-y-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateLineItem(item.key, 'description', e.target.value)}
                          placeholder="Description"
                          className="w-full px-2 py-1.5 text-sm border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
                        />
                        {rates.length > 0 && (
                          <select
                            onChange={(e) => { if (e.target.value) applyRate(e.target.value, item.key); e.target.value = '' }}
                            className="w-full px-2 py-1 text-xs border border-[#E8E4DE] rounded text-muted"
                            defaultValue=""
                          >
                            <option value="" disabled>Apply saved rate...</option>
                            {rates.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.rate_name} - R{r.amount.toFixed(2)} ({r.is_inclusive ? 'incl' : 'excl'})
                              </option>
                            ))}
                          </select>
                        )}
                        <textarea
                          value={item.detail_lines.join('\n')}
                          onChange={(e) => updateLineItem(item.key, 'detail_lines', e.target.value.split('\n'))}
                          placeholder="Detail lines (one per line)"
                          rows={2}
                          className="w-full px-2 py-1.5 text-xs border border-[#E8E4DE] rounded focus:outline-none focus:ring-1 focus:ring-accent text-slate placeholder:text-muted resize-none"
                        />
                      </div>
                      <div className="col-span-1">
                        <input type="number" step="0.01" min="0" value={item.quantity}
                          onChange={(e) => updateLineItem(item.key, 'quantity', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate" />
                      </div>
                      <div className="col-span-2">
                        <input type="number" step="0.01" min="0" value={item.excl_price || ''}
                          onChange={(e) => updateLineItem(item.key, 'excl_price', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate" />
                      </div>
                      <div className="col-span-1">
                        <input type="number" step="0.01" min="0" max="100" value={item.disc_pct}
                          onChange={(e) => updateLineItem(item.key, 'disc_pct', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate" />
                      </div>
                      <div className="col-span-1">
                        <input type="number" step="0.01" min="0" max="100" value={item.vat_pct}
                          onChange={(e) => updateLineItem(item.key, 'vat_pct', Number(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate" />
                      </div>
                      <div className="col-span-2 text-right">
                        <div className="text-sm font-medium text-charcoal py-1.5">R{inclTotal.toFixed(2)}</div>
                        <div className="text-xs text-muted">Excl: R{exclTotal.toFixed(2)}</div>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeLineItem(item.key)}
                          disabled={lineItems.length <= 1}
                          className="p-1.5 text-muted hover:text-red-500 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Totals (edit) */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-slate" />
              <h2 className="text-lg font-heading font-semibold text-charcoal">Totals</h2>
            </div>
            <div className="max-w-sm ml-auto space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">Total Discount:</span><span className="font-medium text-slate">R{totals.totalDiscount}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total Exclusive:</span><span className="font-medium text-slate">R{totals.totalExcl}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total VAT:</span><span className="font-medium text-slate">R{totals.totalVat}</span></div>
              <div className="flex justify-between border-t border-[#D4CFC7] pt-2"><span className="text-muted">Sub Total:</span><span className="font-medium text-slate">R{totals.subTotal}</span></div>
              <div className="flex justify-between border-t border-[#D4CFC7] pt-2"><span className="font-medium text-charcoal">Grand Total:</span><span className="text-lg font-bold text-accent">R{totals.grandTotal}</span></div>
            </div>
          </section>

          {/* Notes */}
          <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
            <h2 className="text-lg font-heading font-semibold text-charcoal mb-3">Notes</h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate resize-none placeholder:text-muted"
            />
          </section>

          {/* Save / Cancel */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveAmendment}
              disabled={saving}
              className="px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Amendment'}
            </button>
            <button
              onClick={() => { setEditing(false); loadInvoice() }}
              className="px-4 py-2.5 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-[#F5F2EE]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
