'use client'

import { useState, useEffect } from 'react'
import { Scale, Loader2 } from 'lucide-react'
import { useCaseNotes, useUpsertCaseNote } from '@/hooks/use-case-notes'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface QuantumCategory {
  motorRepair: number
  motorWriteOff: number
  building: number
  contents: number
  stock: number
  businessInterruption: number
}

interface RejectedCategory {
  motorRepair: number
  motorRepairReason: string
  motorWriteOff: number
  motorWriteOffReason: string
  building: number
  buildingReason: string
  contents: number
  contentsReason: string
  stock: number
  stockReason: string
  businessInterruption: number
  businessInterruptionReason: string
}

interface Adjustments {
  betterment: number
  excess: number
  averageCoInsurance: number
  depreciation: number
}

interface QuantumData {
  claimedAmount: number
  assessed: QuantumCategory
  rejected: RejectedCategory
  adjustments: Adjustments
  recommendedSettlement: number
  notes: string
}

const defaultData = (): QuantumData => ({
  claimedAmount: 0,
  assessed: {
    motorRepair: 0,
    motorWriteOff: 0,
    building: 0,
    contents: 0,
    stock: 0,
    businessInterruption: 0,
  },
  rejected: {
    motorRepair: 0,
    motorRepairReason: '',
    motorWriteOff: 0,
    motorWriteOffReason: '',
    building: 0,
    buildingReason: '',
    contents: 0,
    contentsReason: '',
    stock: 0,
    stockReason: '',
    businessInterruption: 0,
    businessInterruptionReason: '',
  },
  adjustments: {
    betterment: 0,
    excess: 0,
    averageCoInsurance: 0,
    depreciation: 0,
  },
  recommendedSettlement: 0,
  notes: '',
})

function formatZar(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

interface CurrencyInputProps {
  value: number
  onChange: (v: number) => void
  className?: string
}

function CurrencyInput({ value, onChange, className = '' }: CurrencyInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">R</span>
      <input
        type="number"
        min={0}
        step={0.01}
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full pl-7 pr-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 text-right"
      />
    </div>
  )
}

const ASSESSED_LABELS: { key: keyof QuantumCategory; label: string }[] = [
  { key: 'motorRepair', label: 'Motor Repair' },
  { key: 'motorWriteOff', label: 'Motor Write-off' },
  { key: 'building', label: 'Building' },
  { key: 'contents', label: 'Contents' },
  { key: 'stock', label: 'Stock' },
  { key: 'businessInterruption', label: 'Business Interruption' },
]

const REJECTED_REASON_MAP: Record<keyof QuantumCategory, string> = {
  motorRepair: 'motorRepairReason',
  motorWriteOff: 'motorWriteOffReason',
  building: 'buildingReason',
  contents: 'contentsReason',
  stock: 'stockReason',
  businessInterruption: 'businessInterruptionReason',
}

export function QuantumReconciliationSection({ caseId }: SectionProps) {
  const { data: notes, isLoading } = useCaseNotes(caseId, 'quantum_reconciliation')
  const upsert = useUpsertCaseNote(caseId)
  const [data, setData] = useState<QuantumData>(defaultData())
  const [recommendedOverridden, setRecommendedOverridden] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (notes && notes.length > 0) {
      const raw = notes[0].content
      if (raw && typeof raw === 'object') {
        setData((prev) => ({ ...prev, ...(raw as Partial<QuantumData>) }))
      }
    }
  }, [notes])

  const setAssessed = (key: keyof QuantumCategory, value: number) =>
    setData((d) => ({ ...d, assessed: { ...d.assessed, [key]: value } }))

  const setRejected = (key: string, value: string | number) =>
    setData((d) => ({ ...d, rejected: { ...d.rejected, [key]: value } as RejectedCategory }))

  const setAdj = (key: keyof Adjustments, value: number) =>
    setData((d) => ({ ...d, adjustments: { ...d.adjustments, [key]: value } }))

  // Calculations
  const totalAssessed = Object.values(data.assessed).reduce((s, v) => s + v, 0)
  const totalRejected =
    (data.rejected.motorRepair || 0) +
    (data.rejected.motorWriteOff || 0) +
    (data.rejected.building || 0) +
    (data.rejected.contents || 0) +
    (data.rejected.stock || 0) +
    (data.rejected.businessInterruption || 0)
  const totalAdjustments = Object.values(data.adjustments).reduce((s, v) => s + v, 0)
  const netQuantum = totalAssessed - totalAdjustments

  // Auto-update recommended settlement if not overridden
  useEffect(() => {
    if (!recommendedOverridden) {
      setData((d) => ({ ...d, recommendedSettlement: netQuantum }))
    }
  }, [netQuantum, recommendedOverridden])

  const handleSave = async () => {
    await upsert.mutateAsync({ noteType: 'quantum_reconciliation', content: data })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading quantum reconciliation…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-charcoal">
        <Scale className="w-4 h-4" />
        <span className="text-sm font-semibold">Quantum Reconciliation</span>
      </div>

      <div className="bg-white border border-[#D4CFC7] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {/* Claimed Amount */}
            <tr className="border-b-2 border-[#D4CFC7] bg-[#FAFAF8]">
              <td className="px-4 py-3 font-semibold text-charcoal w-1/2">Claimed Amount</td>
              <td className="px-4 py-3">
                <CurrencyInput
                  value={data.claimedAmount}
                  onChange={(v) => setData((d) => ({ ...d, claimedAmount: v }))}
                  className="max-w-48 ml-auto"
                />
              </td>
            </tr>

            {/* Assessed Amounts header */}
            <tr className="border-b border-[#D4CFC7] bg-copper/5">
              <td colSpan={2} className="px-4 py-2 text-xs font-bold text-copper uppercase tracking-wide">
                Assessed Amounts
              </td>
            </tr>
            {ASSESSED_LABELS.map(({ key, label }) => (
              <tr key={key} className="border-b border-[#D4CFC7]">
                <td className="px-4 py-2.5 pl-8 text-slate">{label}</td>
                <td className="px-4 py-2.5">
                  <CurrencyInput
                    value={data.assessed[key]}
                    onChange={(v) => setAssessed(key, v)}
                    className="max-w-48 ml-auto"
                  />
                </td>
              </tr>
            ))}
            <tr className="border-b-2 border-[#D4CFC7] bg-[#FAFAF8]">
              <td className="px-4 py-2.5 font-semibold text-charcoal">Total Assessed</td>
              <td className="px-4 py-2.5 text-right font-semibold text-charcoal pr-6">{formatZar(totalAssessed)}</td>
            </tr>

            {/* Rejected Amounts header */}
            <tr className="border-b border-[#D4CFC7] bg-red-50">
              <td colSpan={2} className="px-4 py-2 text-xs font-bold text-red-700 uppercase tracking-wide">
                Rejected Amounts
              </td>
            </tr>
            {ASSESSED_LABELS.map(({ key, label }) => {
              const reasonKey = REJECTED_REASON_MAP[key]
              const rejectedRecord = data.rejected as unknown as Record<string, number | string>
              const rejectedAmt = (rejectedRecord[key] as number) || 0
              const rejectedReason = (rejectedRecord[reasonKey] as string) || ''
              return (
                <tr key={key} className="border-b border-[#D4CFC7]">
                  <td className="px-4 py-2.5 pl-8">
                    <div className="text-slate">{label}</div>
                    {rejectedAmt > 0 && (
                      <input
                        type="text"
                        value={rejectedReason}
                        onChange={(e) => setRejected(reasonKey, e.target.value)}
                        placeholder="Reason for rejection…"
                        className="mt-1 w-full px-2 py-1 border border-[#D4CFC7] rounded text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-copper/30"
                      />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <CurrencyInput
                      value={rejectedAmt}
                      onChange={(v) => setRejected(key, v)}
                      className="max-w-48 ml-auto"
                    />
                  </td>
                </tr>
              )
            })}
            <tr className="border-b-2 border-[#D4CFC7] bg-[#FAFAF8]">
              <td className="px-4 py-2.5 font-semibold text-charcoal">Total Rejected</td>
              <td className="px-4 py-2.5 text-right font-semibold text-red-600 pr-6">{formatZar(totalRejected)}</td>
            </tr>

            {/* Adjustments header */}
            <tr className="border-b border-[#D4CFC7] bg-amber-50">
              <td colSpan={2} className="px-4 py-2 text-xs font-bold text-amber-700 uppercase tracking-wide">
                Adjustments (Deductions)
              </td>
            </tr>
            {(
              [
                { key: 'betterment', label: 'Betterment' },
                { key: 'excess', label: 'Excess' },
                { key: 'averageCoInsurance', label: 'Average / Co-insurance' },
                { key: 'depreciation', label: 'Depreciation' },
              ] as { key: keyof Adjustments; label: string }[]
            ).map(({ key, label }) => (
              <tr key={key} className="border-b border-[#D4CFC7]">
                <td className="px-4 py-2.5 pl-8 text-slate">
                  <span className="text-red-500 mr-1">−</span>{label}
                </td>
                <td className="px-4 py-2.5">
                  <CurrencyInput
                    value={data.adjustments[key]}
                    onChange={(v) => setAdj(key, v)}
                    className="max-w-48 ml-auto"
                  />
                </td>
              </tr>
            ))}
            <tr className="border-b-2 border-[#D4CFC7] bg-[#FAFAF8]">
              <td className="px-4 py-2.5 font-semibold text-charcoal">Total Adjustments</td>
              <td className="px-4 py-2.5 text-right font-semibold text-amber-700 pr-6">- {formatZar(totalAdjustments)}</td>
            </tr>

            {/* Net Quantum */}
            <tr className="border-b border-[#D4CFC7] bg-[#FAFAF8]">
              <td className="px-4 py-3 font-bold text-charcoal text-base">NET QUANTUM</td>
              <td className="px-4 py-3 text-right font-bold text-charcoal text-lg pr-6">{formatZar(netQuantum)}</td>
            </tr>

            {/* Recommended Settlement */}
            <tr className="bg-copper/5">
              <td className="px-4 py-3 font-bold text-charcoal text-base">
                RECOMMENDED SETTLEMENT
                {recommendedOverridden && (
                  <button
                    onClick={() => { setRecommendedOverridden(false) }}
                    className="ml-2 text-xs text-slate underline font-normal"
                  >
                    (reset to net quantum)
                  </button>
                )}
              </td>
              <td className="px-4 py-3">
                <CurrencyInput
                  value={data.recommendedSettlement}
                  onChange={(v) => { setData((d) => ({ ...d, recommendedSettlement: v })); setRecommendedOverridden(true) }}
                  className="max-w-48 ml-auto"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate mb-1">Reconciliation Notes</label>
        <textarea
          value={data.notes}
          onChange={(e) => setData((d) => ({ ...d, notes: e.target.value }))}
          rows={4}
          placeholder="Detailed reconciliation notes, methodology, exclusions…"
          className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 resize-none"
        />
      </div>

      {/* Save */}
      <div className="flex items-center justify-between pt-4 border-t border-[#D4CFC7]">
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
  )
}
