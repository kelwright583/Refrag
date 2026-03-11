/**
 * Assessment Rates - configure per-assessment-type pricing
 * Assessors set their incl/excl rates for desktop, digital, site visit, etc.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface AssessmentRate {
  id?: string
  rate_name: string
  rate_type: string
  amount: number
  is_inclusive: boolean
  vat_pct: number
  is_active: boolean
  notes: string
}

const RATE_TYPES = [
  { value: 'desktop', label: 'Desktop Assessment' },
  { value: 'digital', label: 'Digital Assessment' },
  { value: 'site_visit', label: 'Site Visit Assessment' },
  { value: 're_inspection', label: 'Re-inspection' },
  { value: 'supplementary', label: 'Supplementary Report' },
  { value: 'other', label: 'Other' },
]

const emptyRate: AssessmentRate = {
  rate_name: '',
  rate_type: 'desktop',
  amount: 0,
  is_inclusive: true,
  vat_pct: 15,
  is_active: true,
  notes: '',
}

export default function AssessmentRatesPage() {
  const [rates, setRates] = useState<AssessmentRate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingRate, setEditingRate] = useState<AssessmentRate>({ ...emptyRate })
  const [editIndex, setEditIndex] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/assessment-rates')
      .then((r) => r.json())
      .then((d) => setRates(Array.isArray(d) ? d : []))
      .catch(() => setRates([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!editingRate.rate_name.trim()) return
    setSaving(true)
    try {
      const method = editingRate.id ? 'PATCH' : 'POST'
      const url = editingRate.id ? `/api/assessment-rates/${editingRate.id}` : '/api/assessment-rates'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRate),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed')
      const saved = await res.json()

      if (editIndex !== null) {
        setRates((prev) => prev.map((r, i) => (i === editIndex ? saved : r)))
      } else {
        setRates((prev) => [...prev, saved])
      }
      resetForm()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, index: number) => {
    if (!confirm('Remove this rate?')) return
    const res = await fetch(`/api/assessment-rates/${id}`, { method: 'DELETE' })
    if (res.ok) setRates((prev) => prev.filter((_, i) => i !== index))
    else alert('Failed to delete')
  }

  const startEdit = (rate: AssessmentRate, index: number) => {
    setEditingRate({ ...rate })
    setEditIndex(index)
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingRate({ ...emptyRate })
    setEditIndex(null)
    setShowForm(false)
  }

  const calcDisplay = (rate: AssessmentRate) => {
    if (rate.is_inclusive) {
      const excl = rate.amount / (1 + rate.vat_pct / 100)
      const vat = rate.amount - excl
      return { excl: excl.toFixed(2), vat: vat.toFixed(2), incl: rate.amount.toFixed(2) }
    } else {
      const vat = rate.amount * (rate.vat_pct / 100)
      const incl = rate.amount + vat
      return { excl: rate.amount.toFixed(2), vat: vat.toFixed(2), incl: incl.toFixed(2) }
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link href="/app/settings" className="text-sm text-muted hover:text-slate mb-6 inline-block">
        Back to Settings
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-charcoal">Assessment Rates</h1>
          <p className="text-slate mt-1">Configure your pricing for each assessment type</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95"
          >
            Add Rate
          </button>
        )}
      </div>

      {/* Rate Form */}
      {showForm && (
        <div className="bg-white border border-[#D4CFC7] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-heading font-semibold text-charcoal mb-4">
            {editIndex !== null ? 'Edit Rate' : 'New Assessment Rate'}
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Rate Name</label>
                <input
                  type="text"
                  value={editingRate.rate_name}
                  onChange={(e) => setEditingRate({ ...editingRate, rate_name: e.target.value })}
                  placeholder="e.g. Standard Desktop Assessment"
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Assessment Type</label>
                <select
                  value={editingRate.rate_type}
                  onChange={(e) => setEditingRate({ ...editingRate, rate_type: e.target.value })}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                >
                  {RATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Amount (R)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingRate.amount || ''}
                  onChange={(e) => setEditingRate({ ...editingRate, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">Rate Basis</label>
                <select
                  value={editingRate.is_inclusive ? 'inclusive' : 'exclusive'}
                  onChange={(e) => setEditingRate({ ...editingRate, is_inclusive: e.target.value === 'inclusive' })}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                >
                  <option value="inclusive">Inclusive of VAT</option>
                  <option value="exclusive">Exclusive of VAT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate mb-1">VAT %</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={editingRate.vat_pct}
                  onChange={(e) => setEditingRate({ ...editingRate, vat_pct: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate"
                />
              </div>
            </div>

            {/* Calculated preview */}
            {editingRate.amount > 0 && (
              <div className="bg-[#F5F2EE] rounded-lg p-3 text-sm">
                <p className="font-medium text-charcoal mb-1">Rate Breakdown</p>
                <div className="grid grid-cols-3 gap-2 text-slate">
                  <div>Excl. VAT: <span className="font-medium">R{calcDisplay(editingRate).excl}</span></div>
                  <div>VAT ({editingRate.vat_pct}%): <span className="font-medium">R{calcDisplay(editingRate).vat}</span></div>
                  <div>Incl. VAT: <span className="font-medium">R{calcDisplay(editingRate).incl}</span></div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate mb-1">Notes (optional)</label>
              <input
                type="text"
                value={editingRate.notes}
                onChange={(e) => setEditingRate({ ...editingRate, notes: e.target.value })}
                placeholder="Any additional info about this rate"
                className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg focus:outline-none focus:ring-2 focus:ring-accent text-slate placeholder:text-muted"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving || !editingRate.rate_name.trim() || editingRate.amount <= 0}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:opacity-95 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editIndex !== null ? 'Update Rate' : 'Save Rate'}
              </button>
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-[#D4CFC7] rounded-lg text-sm text-slate hover:bg-[#F5F2EE]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rates List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#F5F2EE] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : rates.length === 0 && !showForm ? (
        <div className="py-16 text-center border border-dashed border-[#D4CFC7] rounded-lg">
          <p className="text-slate font-medium">No assessment rates configured</p>
          <p className="text-sm text-muted mt-1">
            Add your rates for desktop, digital, and site-visit assessments.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block mt-4 px-4 py-2 bg-copper text-white rounded-lg text-sm font-medium"
          >
            Add your first rate
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {rates.map((rate, idx) => {
            const d = calcDisplay(rate)
            const typeLabel = RATE_TYPES.find((t) => t.value === rate.rate_type)?.label || rate.rate_type
            return (
              <div
                key={rate.id || idx}
                className="flex items-center justify-between py-4 px-5 bg-white border border-[#D4CFC7] rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-charcoal">{rate.rate_name}</p>
                    {!rate.is_active && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-muted mt-0.5">{typeLabel}</p>
                  {rate.notes && <p className="text-xs text-muted mt-0.5">{rate.notes}</p>}
                </div>
                <div className="text-right mr-4">
                  <p className="font-medium text-charcoal">R{d.incl}</p>
                  <p className="text-xs text-muted">
                    Excl R{d.excl} + VAT R{d.vat}
                  </p>
                  <p className="text-xs text-muted">
                    {rate.is_inclusive ? 'Incl. VAT rate' : 'Excl. VAT rate'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(rate, idx)}
                    className="text-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  {rate.id && (
                    <button
                      onClick={() => handleDelete(rate.id!, idx)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Remove
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
