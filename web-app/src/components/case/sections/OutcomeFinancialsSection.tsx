'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useCase } from '@/hooks/use-cases'
import { VERTICAL_CONFIGS } from '@/lib/verticals/config'
import type { VerticalId } from '@/lib/verticals/config'

interface SectionProps {
  caseId: string
  orgSettings: any
}

const STORAGE_KEY_PREFIX = 'time_disbursements_data_'

function fmt(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function TimeDisbSummary({ caseId }: { caseId: string }) {
  const [data, setData] = useState<{ fees: number; disb: number } | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${caseId}`)
      if (raw) {
        const parsed = JSON.parse(raw)
        const time: Array<{ hours: number; rate: number }> = parsed.time || []
        const disbursements: Array<{ amount: number }> = parsed.disbursements || []
        const fees = time.reduce((s, e) => s + e.hours * e.rate, 0)
        const disb = disbursements.reduce((s, e) => s + e.amount, 0)
        setData({ fees, disb })
      }
    } catch {}
  }, [caseId])

  if (!data) return null

  const subtotal = data.fees + data.disb
  const vat = subtotal * 0.15
  const total = subtotal + vat

  return (
    <div className="mt-3 p-4 border border-[#D4CFC7] rounded-lg bg-[#FAFAF8]">
      <h4 className="text-xs font-semibold text-slate/60 uppercase tracking-wide mb-3">Fee Note Summary</h4>
      <div className="space-y-1.5 font-mono text-sm">
        <div className="flex justify-between text-charcoal">
          <span>Professional Fees:</span><span>{fmt(data.fees)}</span>
        </div>
        <div className="flex justify-between text-charcoal">
          <span>Disbursements:</span><span>{fmt(data.disb)}</span>
        </div>
        <div className="border-t border-[#D4CFC7] my-1" />
        <div className="flex justify-between text-charcoal">
          <span>Subtotal:</span><span>{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate/70">
          <span>VAT (15%):</span><span>{fmt(vat)}</span>
        </div>
        <div className="border-t border-[#D4CFC7] my-1" />
        <div className="flex justify-between font-bold text-charcoal">
          <span>TOTAL:</span><span>{fmt(total)}</span>
        </div>
      </div>
    </div>
  )
}

const CASE_OUTCOME_STORAGE = 'case_outcome_data_'

export function OutcomeFinancialsSection({ caseId }: SectionProps) {
  const { data: caseData, isLoading } = useCase(caseId)

  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load saved outcome from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`${CASE_OUTCOME_STORAGE}${caseId}`)
      if (raw) setSelectedOutcome(JSON.parse(raw))
    } catch {}
  }, [caseId])

  const vertical = ((caseData as any)?.vertical ?? 'general') as VerticalId
  const config = VERTICAL_CONFIGS[vertical] ?? VERTICAL_CONFIGS.general

  const handleSaveOutcome = async () => {
    if (!selectedOutcome) return
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      // Outcome is stored in a case note since the Case type does not have an outcome field
      await fetch(`/api/cases/${caseId}/comms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'case_outcome', note: selectedOutcome }),
      }).catch(() => {/* non-fatal */})
      // Always persist locally
      try { localStorage.setItem(`${CASE_OUTCOME_STORAGE}${caseId}`, JSON.stringify(selectedOutcome)) } catch {}
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Outcome selector */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-copper" />
          <h3 className="text-sm font-semibold text-charcoal">{config.terminology.outcome}</h3>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {config.defaultOutcomes.map(outcome => (
            <button
              key={outcome}
              onClick={() => setSelectedOutcome(selectedOutcome === outcome ? null : outcome)}
              className={`px-4 py-2 text-sm rounded-full border font-medium transition-all ${
                selectedOutcome === outcome
                  ? 'bg-copper text-white border-copper shadow-sm'
                  : 'bg-white text-charcoal border-[#D4CFC7] hover:border-copper/50 hover:text-copper'
              }`}
            >
              {outcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 mb-3 border border-red-200 bg-red-50 rounded-lg">
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveOutcome}
            disabled={!selectedOutcome || saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-copper text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 font-medium"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save Outcome'}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Outcome saved
            </span>
          )}
        </div>
      </div>

      {/* Financial summary based on vertical */}
      {config.financialModule === 'time_disbursement' && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-charcoal mb-1">Fee Note Summary</h3>
          <p className="text-xs text-slate/60 mb-1">From Time &amp; Disbursements</p>
          <TimeDisbSummary caseId={caseId} />
        </div>
      )}

      {/* Case summary info */}
      {caseData && (
        <div className="bg-white border border-[#D4CFC7] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-charcoal mb-3">Case Summary</h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-slate/60">Case Number</dt>
              <dd className="font-medium text-charcoal">{caseData.case_number}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate/60">Status</dt>
              <dd className="font-medium text-charcoal capitalize">{caseData.status.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate/60">Client</dt>
              <dd className="font-medium text-charcoal">{caseData.client_name}</dd>
            </div>
            {caseData.claim_reference && (
              <div>
                <dt className="text-xs text-slate/60">Claim Ref</dt>
                <dd className="font-medium text-charcoal">{caseData.claim_reference}</dd>
              </div>
            )}
            {selectedOutcome && (
              <div className="col-span-2">
                <dt className="text-xs text-slate/60">Outcome</dt>
                <dd className="font-medium text-copper capitalize">
                  {selectedOutcome.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
