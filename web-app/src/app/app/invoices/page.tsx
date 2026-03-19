/**
 * Invoices list - create, view, generate PDF, status management
 */
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, FileText, Download, Eye } from 'lucide-react'

interface InvoiceRow {
  id: string
  invoice_number: string
  amount: number
  grand_total: number
  currency: string
  status: string
  storage_path: string | null
  date: string | null
  due_date: string | null
  reference: string | null
  case_id: string
  case?: { id: string; case_number: string; client_name: string }
  client?: { id: string; name: string }
}

function formatDate(d: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatCurrency(n: number): string {
  return `R${Number(n).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function InvoicesPage() {
  const [list, setList] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const fetchList = () => {
    setLoading(true)
    fetch('/api/invoices')
      .then((r) => r.json())
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch((err) => {
        console.error('Failed to load invoices:', err)
        setList([])
        setFetchError('Failed to load invoices. Please try again.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) fetchList()
    else alert((await res.json()).error)
  }

  const handleGeneratePdf = async (id: string) => {
    const res = await fetch(`/api/invoices/${id}/generate`, { method: 'POST' })
    if (res.ok) fetchList()
    else alert((await res.json()).error)
  }

  const handleDownload = async (id: string) => {
    const res = await fetch(`/api/invoices/${id}/download`)
    const data = await res.json()
    if (data.url) window.open(data.url, '_blank')
    else alert(data.error || 'Generate PDF first')
  }

  const filteredList = filter === 'all' ? list : list.filter((i) => i.status === filter)

  const statusCounts = {
    all: list.length,
    draft: list.filter((i) => i.status === 'draft').length,
    issued: list.filter((i) => i.status === 'issued').length,
    paid: list.filter((i) => i.status === 'paid').length,
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    issued: 'bg-blue-50 text-blue-700',
    paid: 'bg-green-50 text-green-700',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">Invoices</h1>
          <p className="text-slate mt-1">Manage your assessment invoices</p>
        </div>
        <Link
          href="/app/invoices/new"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95"
        >
          <Plus className="w-4 h-4" />
          New Invoice
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#D4CFC7]">
        {(['all', 'draft', 'issued', 'paid'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filter === s
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-slate'
            }`}
          >
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 text-xs text-muted">({statusCounts[s]})</span>
          </button>
        ))}
      </div>

      {fetchError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-[#D4CFC7] rounded-lg">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-slate font-medium">No invoices{filter !== 'all' ? ` with status "${filter}"` : ''}</p>
          <p className="text-sm text-muted mt-1">Create a new invoice to get started.</p>
          <Link
            href="/app/invoices/new"
            className="inline-block mt-4 px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium"
          >
            Create Invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredList.map((inv) => {
            const total = inv.grand_total || inv.amount || 0
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between py-4 px-5 bg-white border border-[#D4CFC7] rounded-lg hover:border-[#C9C4BC] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-charcoal">{inv.invoice_number}</p>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${statusColor[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted mt-0.5">
                    {inv.client?.name || inv.case?.client_name}
                    {inv.case?.case_number && <span> &middot; {inv.case.case_number}</span>}
                    {inv.reference && <span> &middot; Ref: {inv.reference}</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span>Date: {formatDate(inv.date)}</span>
                    <span>Due: {formatDate(inv.due_date)}</span>
                  </div>
                </div>

                <div className="text-right mr-4">
                  <p className="text-lg font-bold text-charcoal">{formatCurrency(total)}</p>
                  <p className="text-xs text-muted">{inv.currency}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/app/invoices/${inv.id}`}
                    className="flex items-center gap-1 text-sm text-accent hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <select
                    value={inv.status}
                    onChange={(e) => handleStatusChange(inv.id, e.target.value)}
                    className="text-xs border border-[#D4CFC7] rounded-lg px-2 py-1"
                  >
                    <option value="draft">Draft</option>
                    <option value="issued">Issued</option>
                    <option value="paid">Paid</option>
                  </select>
                  {!inv.storage_path ? (
                    <button
                      type="button"
                      onClick={() => handleGeneratePdf(inv.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 border border-[#D4CFC7] rounded-lg hover:bg-[#F5F2EE]"
                    >
                      <FileText className="w-3 h-3" />
                      PDF
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownload(inv.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-accent hover:bg-accent/5 rounded-lg"
                    >
                      <Download className="w-3 h-3" />
                      PDF
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
