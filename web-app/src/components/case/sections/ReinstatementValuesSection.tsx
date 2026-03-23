'use client'

import { useState, useEffect } from 'react'
import { Calculator, Loader2 } from 'lucide-react'
import { useCaseNotes, useUpsertCaseNote } from '@/hooks/use-case-notes'

interface SectionProps {
  caseId: string
  orgSettings: any
}

interface ReinstatementData {
  buildingReinstatementValue: number
  contentsReplacementValue: number
  sumInsured: number
  excessAmount: number
  bettermentDeduction: number
  averageCoInsuranceApplied: boolean
  notes: string
}

function formatZar(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function CurrencyRow({
  label,
  value,
  onChange,
  readOnly,
  highlight,
}: {
  label: string
  value: number
  onChange?: (v: number) => void
  readOnly?: boolean
  highlight?: boolean
}) {
  return (
    <tr className={highlight ? 'bg-copper/5' : ''}>
      <td className={`px-4 py-2.5 text-sm ${highlight ? 'font-bold text-charcoal' : 'text-slate'}`}>
        {label}
      </td>
      <td className="px-4 py-2.5 text-right">
        {readOnly ? (
          <span className={`text-sm font-semibold ${highlight ? 'text-copper text-base' : 'text-charcoal'}`}>
            {formatZar(value)}
          </span>
        ) : (
          <div className="flex justify-end">
            <div className="relative w-44">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">R</span>
              <input
                type="number"
                min={0}
                step={0.01}
                value={value || ''}
                onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 text-right"
              />
            </div>
          </div>
        )}
      </td>
    </tr>
  )
}

export function ReinstatementValuesSection({ caseId, orgSettings }: SectionProps) {
  const vatRate = orgSettings?.vat_rate ?? 15
  const { data: notes, isLoading } = useCaseNotes(caseId, 'reinstatement_values')
  const upsert = useUpsertCaseNote(caseId)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState<ReinstatementData>({
    buildingReinstatementValue: 0,
    contentsReplacementValue: 0,
    sumInsured: 0,
    excessAmount: 0,
    bettermentDeduction: 0,
    averageCoInsuranceApplied: false,
    notes: '',
  })

  useEffect(() => {
    if (notes && notes.length > 0) {
      const raw = notes[0].content
      if (raw && typeof raw === 'object') {
        setForm((prev) => ({ ...prev, ...(raw as Partial<ReinstatementData>) }))
      }
    }
  }, [notes])

  const setF = (key: keyof ReinstatementData, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Calculations
  const totalAssessed = form.buildingReinstatementValue + form.contentsReplacementValue
  const underInsurancePct = form.sumInsured > 0
    ? Math.min((totalAssessed / form.sumInsured) * 100, 999)
    : 0
  const isUnderInsured = form.sumInsured > 0 && totalAssessed < form.sumInsured
  const averageCoInsuranceAmount = form.averageCoInsuranceApplied && form.sumInsured > 0 && isUnderInsured
    ? totalAssessed * (1 - totalAssessed / form.sumInsured)
    : 0
  const bettermentPct = totalAssessed > 0
    ? (form.bettermentDeduction / totalAssessed) * 100
    : 0
  const vatOnFees = form.buildingReinstatementValue * (vatRate / 100) * 0.1 // ~10% of building for professional fees VAT
  const netSettlement =
    totalAssessed
    - form.excessAmount
    - form.bettermentDeduction
    - averageCoInsuranceAmount
    + vatOnFees

  const handleSave = async () => {
    await upsert.mutateAsync({ noteType: 'reinstatement_values', content: form })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-slate">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading reinstatement values…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-charcoal">
        <Calculator className="w-4 h-4" />
        <span className="text-sm font-semibold">Reinstatement Values</span>
      </div>

      {/* Input Table */}
      <div className="bg-white border border-[#D4CFC7] rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-[#FAFAF8] border-b border-[#D4CFC7]">
          <h4 className="text-xs font-semibold text-slate uppercase tracking-wide">Assessed Values</h4>
        </div>
        <table className="w-full">
          <tbody>
            <CurrencyRow
              label="Building Reinstatement Value"
              value={form.buildingReinstatementValue}
              onChange={(v) => setF('buildingReinstatementValue', v)}
            />
            <CurrencyRow
              label="Contents Replacement Value"
              value={form.contentsReplacementValue}
              onChange={(v) => setF('contentsReplacementValue', v)}
            />
            <CurrencyRow
              label="Sum Insured (from policy)"
              value={form.sumInsured}
              onChange={(v) => setF('sumInsured', v)}
            />
            <tr>
              <td className="px-4 py-2.5 text-sm text-slate">Excess</td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex justify-end">
                  <div className="relative w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">R</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.excessAmount || ''}
                      onChange={(e) => setF('excessAmount', parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 text-right"
                    />
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-sm text-slate">
                <div className="flex items-center gap-3">
                  Betterment Deduction
                  {form.bettermentDeduction > 0 && (
                    <span className="text-xs text-amber-600 font-medium">
                      ({bettermentPct.toFixed(1)}% of assessed)
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-2.5 text-right">
                <div className="flex justify-end">
                  <div className="relative w-44">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate text-sm">R</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.bettermentDeduction || ''}
                      onChange={(e) => setF('bettermentDeduction', parseFloat(e.target.value) || 0)}
                      className="w-full pl-7 pr-3 py-1.5 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 text-right"
                    />
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td className="px-4 py-2.5 text-sm text-slate">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.averageCoInsuranceApplied}
                    onChange={(e) => setF('averageCoInsuranceApplied', e.target.checked)}
                    className="w-4 h-4 rounded border-[#D4CFC7] text-copper focus:ring-copper"
                  />
                  Average / Co-insurance Applied
                </label>
              </td>
              <td className="px-4 py-2.5 text-right text-sm font-medium text-charcoal">
                {form.averageCoInsuranceApplied && averageCoInsuranceAmount > 0
                  ? `- ${formatZar(averageCoInsuranceAmount)}`
                  : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Auto-calculated Summary */}
      <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#D4CFC7]">
          <h4 className="text-xs font-semibold text-slate uppercase tracking-wide">Calculated Summary</h4>
        </div>
        <table className="w-full">
          <tbody>
            <tr className="border-b border-[#D4CFC7]">
              <td className="px-4 py-2.5 text-sm text-slate">Total Assessed Value</td>
              <td className="px-4 py-2.5 text-right text-sm font-semibold text-charcoal">{formatZar(totalAssessed)}</td>
            </tr>
            <tr className="border-b border-[#D4CFC7]">
              <td className="px-4 py-2.5 text-sm text-slate">
                Under-insurance %
                {isUnderInsured && form.sumInsured > 0 && (
                  <span className="ml-2 text-xs text-orange-600 font-medium">Under-insured</span>
                )}
              </td>
              <td className={`px-4 py-2.5 text-right text-sm font-semibold ${
                isUnderInsured ? 'text-orange-600' : 'text-emerald-600'
              }`}>
                {form.sumInsured > 0 ? `${underInsurancePct.toFixed(1)}%` : '—'}
              </td>
            </tr>
            <tr className="border-b border-[#D4CFC7]">
              <td className="px-4 py-2.5 text-sm text-slate">Less: Excess</td>
              <td className="px-4 py-2.5 text-right text-sm font-medium text-charcoal">- {formatZar(form.excessAmount)}</td>
            </tr>
            <tr className="border-b border-[#D4CFC7]">
              <td className="px-4 py-2.5 text-sm text-slate">Less: Betterment</td>
              <td className="px-4 py-2.5 text-right text-sm font-medium text-charcoal">- {formatZar(form.bettermentDeduction)}</td>
            </tr>
            {form.averageCoInsuranceApplied && averageCoInsuranceAmount > 0 && (
              <tr className="border-b border-[#D4CFC7]">
                <td className="px-4 py-2.5 text-sm text-slate">Less: Average/Co-insurance</td>
                <td className="px-4 py-2.5 text-right text-sm font-medium text-charcoal">- {formatZar(averageCoInsuranceAmount)}</td>
              </tr>
            )}
            <tr className="border-b border-[#D4CFC7]">
              <td className="px-4 py-2.5 text-sm text-slate">VAT on Professional Fees ({vatRate}% × 10%)</td>
              <td className="px-4 py-2.5 text-right text-sm font-medium text-charcoal">+ {formatZar(vatOnFees)}</td>
            </tr>
            <tr className="bg-copper/5">
              <td className="px-4 py-3 text-sm font-bold text-charcoal">Net Recommended Settlement</td>
              <td className="px-4 py-3 text-right text-xl font-bold text-copper">{formatZar(netSettlement)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-slate mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setF('notes', e.target.value)}
          rows={3}
          placeholder="Additional notes on reinstatement values…"
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
