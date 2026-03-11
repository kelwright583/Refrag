/**
 * Create new tax invoice - full builder with line items, case linking, rate selection
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, Calculator } from 'lucide-react'

interface CaseOption {
  id: string
  case_number: string
  client_name: string
  client_id: string | null
  claim_reference: string | null
  insurer_name: string | null
  broker_name: string | null
  loss_date: string | null
  vehicle_registration: string | null
  vehicle_manufacturer: string | null
  vehicle_model: string | null
  assessment_type: string | null
}

interface ClientOption {
  id: string
  name: string
  vat_number: string | null
  postal_address: string | null
  physical_address: string | null
}

interface RateOption {
  id: string
  rate_name: string
  rate_type: string
  amount: number
  is_inclusive: boolean
  vat_pct: number
}

interface LineItem {
  key: string
  description: string
  detail_lines: string[]
  quantity: number
  excl_price: number
  disc_pct: number
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

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillCaseId = searchParams.get('case_id')

  const [cases, setCases] = useState<CaseOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [rates, setRates] = useState<RateOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [selectedCaseId, setSelectedCaseId] = useState(prefillCaseId || '')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [reference, setReference] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [salesRep, setSalesRep] = useState('')
  const [overallDiscountPct, setOverallDiscountPct] = useState(0)
  const [paymentTermsDays, setPaymentTermsDays] = useState(30)
  const [notes, setNotes] = useState('')

  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()])

  useEffect(() => {
    Promise.all([
      fetch('/api/cases').then((r) => r.json()),
      fetch('/api/clients').then((r) => r.json()),
      fetch('/api/assessment-rates').then((r) => r.json()),
    ]).then(([c, cl, r]) => {
      setCases(Array.isArray(c) ? c : [])
      setClients(Array.isArray(cl) ? cl : [])
      setRates(Array.isArray(r) ? r : [])
    }).catch(() => {})
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCaseId) return
    const c = cases.find((cs) => cs.id === selectedCaseId)
    if (!c) return

    // Auto-fill client
    if (c.client_id) setSelectedClientId(c.client_id)

    // Reference: claim reference → case number as fallback
    const ref = c.claim_reference || c.case_number
    if (ref) setReference(ref)

    // Pre-fill the first line item's detail_lines with all available case identifiers
    const details: string[] = []
    if (c.claim_reference) details.push(`Claim No: ${c.claim_reference}`)
    if (c.insurer_name) details.push(`Insurer: ${c.insurer_name}`)
    if (c.broker_name) details.push(`Broker: ${c.broker_name}`)
    if (c.client_name) details.push(`Insured: ${c.client_name}`)
    if (c.vehicle_registration) details.push(`Reg: ${c.vehicle_registration}`)
    if (c.vehicle_manufacturer && c.vehicle_model) details.push(`Vehicle: ${c.vehicle_manufacturer} ${c.vehicle_model}`)
    else if (c.vehicle_manufacturer) details.push(`Make: ${c.vehicle_manufacturer}`)
    if (c.loss_date) details.push(`Date of Loss: ${new Date(c.loss_date).toLocaleDateString('en-ZA')}`)
    if (c.assessment_type) details.push(`Assessment Type: ${c.assessment_type.replace(/_/g, ' ')}`)

    if (details.length > 0) {
      setLineItems((prev) => prev.map((item, idx) =>
        idx === 0 ? { ...item, detail_lines: details } : item
      ))
    }
  }, [selectedCaseId, cases])

  const selectedCase = cases.find((c) => c.id === selectedCaseId)
  const selectedClient = clients.find((c) => c.id === selectedClientId)

  const dueDate = useMemo(() => {
    const d = new Date(invoiceDate)
    d.setDate(d.getDate() + paymentTermsDays)
    return d.toISOString().split('T')[0]
  }, [invoiceDate, paymentTermsDays])

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
    if (rate.is_inclusive) {
      exclPrice = rate.amount / (1 + rate.vat_pct / 100)
    }

    setLineItems((prev) => prev.map((i) => {
      if (i.key !== lineKey) return i
      return {
        ...i,
        description: `Assessment - ${rate.rate_name}`,
        excl_price: Math.round(exclPrice * 100) / 100,
        vat_pct: rate.vat_pct,
      }
    }))
  }

  const handleSubmit = async () => {
    if (!selectedClientId) {
      alert('Please select a client')
      return
    }
    if (lineItems.every((i) => !i.description.trim())) {
      alert('Add at least one line item')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id: selectedCaseId || null,
          client_id: selectedClientId,
          reference,
          date: invoiceDate,
          due_date: dueDate,
          sales_rep: salesRep || null,
          overall_discount_pct: overallDiscountPct,
          vat_pct: 15,
          notes: notes || null,
          payment_terms_days: paymentTermsDays,
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
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to create invoice')
      const inv = await res.json()
      router.push(`/app/invoices/${inv.id}`)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-9 w-64 bg-[#F5F2EE] rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-[#F5F2EE] rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/app/invoices" className="text-sm text-muted hover:text-slate mb-4 inline-block">
        Back to Invoices
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-heading font-bold text-charcoal">New Tax Invoice</h1>
        <p className="text-slate mt-1">Create a detailed assessment invoice</p>
      </div>

      <div className="space-y-6">
        {/* Invoice Header */}
        <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
          <h2 className="text-lg font-heading font-semibold text-charcoal mb-4">Invoice Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Link to Case (optional)</label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              >
                <option value="">No case linked</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.case_number} - {c.client_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Client *</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Reference</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Claim or reference number"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Invoice Date</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Payment Terms (days)</label>
              <input
                type="number"
                value={paymentTermsDays}
                onChange={(e) => setPaymentTermsDays(Number(e.target.value) || 30)}
                min={0}
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                readOnly
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg bg-[#F5F2EE] text-slate"
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

        {/* Case / Vehicle Info (shown when case selected) */}
        {selectedCase && (
          <section className="bg-[#F5F2EE] border border-[#D4CFC7] rounded-lg p-4">
            <h3 className="text-sm font-heading font-semibold text-charcoal mb-2">Case Details</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-slate">
              {selectedCase.claim_reference && (
                <div><span className="text-muted">Claim:</span> {selectedCase.claim_reference}</div>
              )}
              {selectedCase.vehicle_registration && (
                <div><span className="text-muted">Reg:</span> {selectedCase.vehicle_registration}</div>
              )}
              {selectedCase.vehicle_manufacturer && (
                <div><span className="text-muted">Make:</span> {selectedCase.vehicle_manufacturer}</div>
              )}
              {selectedCase.vehicle_model && (
                <div><span className="text-muted">Model:</span> {selectedCase.vehicle_model}</div>
              )}
              {selectedCase.assessment_type && (
                <div><span className="text-muted">Type:</span> {selectedCase.assessment_type}</div>
              )}
            </div>
          </section>
        )}

        {/* Client Info (shown when client selected) */}
        {selectedClient && (
          <section className="bg-[#F5F2EE] border border-[#D4CFC7] rounded-lg p-4">
            <h3 className="text-sm font-heading font-semibold text-charcoal mb-2">Billing To</h3>
            <div className="text-sm text-slate">
              <p className="font-medium">{selectedClient.name}</p>
              {selectedClient.vat_number && <p>VAT: {selectedClient.vat_number}</p>}
              {selectedClient.postal_address && <p>{selectedClient.postal_address}</p>}
            </div>
          </section>
        )}

        {/* Line Items */}
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

          {/* Table Header */}
          <div className="hidden sm:grid sm:grid-cols-12 gap-2 mb-2 text-xs font-medium text-muted uppercase tracking-wider">
            <div className="col-span-4">Description</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-2 text-right">Excl. Price</div>
            <div className="col-span-1 text-right">Disc %</div>
            <div className="col-span-1 text-right">VAT %</div>
            <div className="col-span-2 text-right">Incl. Total</div>
            <div className="col-span-1" />
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
                        placeholder="e.g. Assessment - Vehicle Assessment"
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
                        placeholder="Additional detail lines (one per line)&#10;e.g. Claim number: 890806/1&#10;Vehicle registration: LD94TFGP"
                        rows={3}
                        className="w-full px-2 py-1.5 text-xs border border-[#E8E4DE] rounded focus:outline-none focus:ring-1 focus:ring-accent text-slate placeholder:text-muted resize-none"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.key, 'quantity', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.excl_price || ''}
                        onChange={(e) => updateLineItem(item.key, 'excl_price', Number(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={item.disc_pct}
                        onChange={(e) => updateLineItem(item.key, 'disc_pct', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={item.vat_pct}
                        onChange={(e) => updateLineItem(item.key, 'vat_pct', Number(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 text-sm text-right border border-[#D4CFC7] rounded focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                      />
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="text-sm font-medium text-charcoal py-1.5">
                        R{inclTotal.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted">
                        Excl: R{exclTotal.toFixed(2)}
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button
                        onClick={() => removeLineItem(item.key)}
                        disabled={lineItems.length <= 1}
                        className="p-1.5 text-muted hover:text-red-500 disabled:opacity-30"
                        title="Remove line"
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

        {/* Totals */}
        <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-5 h-5 text-slate" />
            <h2 className="text-lg font-heading font-semibold text-charcoal">Totals</h2>
          </div>
          <div className="max-w-sm ml-auto space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Total Discount:</span>
              <span className="font-medium text-slate">R{totals.totalDiscount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total Exclusive:</span>
              <span className="font-medium text-slate">R{totals.totalExcl}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total VAT:</span>
              <span className="font-medium text-slate">R{totals.totalVat}</span>
            </div>
            <div className="flex justify-between border-t border-[#D4CFC7] pt-2">
              <span className="text-muted">Sub Total:</span>
              <span className="font-medium text-slate">R{totals.subTotal}</span>
            </div>
            <div className="flex justify-between border-t border-[#D4CFC7] pt-2">
              <span className="font-medium text-charcoal">Grand Total:</span>
              <span className="text-lg font-bold text-accent">R{totals.grandTotal}</span>
            </div>
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white border border-[#D4CFC7] rounded-lg p-6">
          <h2 className="text-lg font-heading font-semibold text-charcoal mb-3">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes to appear on the invoice..."
            className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate resize-none placeholder:text-muted"
          />
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving || !selectedClientId}
            className="px-6 py-2.5 bg-accent text-white rounded-lg font-medium hover:opacity-95 disabled:opacity-60"
          >
            {saving ? 'Creating...' : 'Create Invoice'}
          </button>
          <Link
            href="/app/invoices"
            className="px-4 py-2.5 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-[#F5F2EE]"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  )
}
