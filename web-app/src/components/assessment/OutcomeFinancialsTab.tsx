'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useUpdateAssessment, useUpsertClaimFinancials } from '@/hooks/use-assessments'
import { Field, Section, Select, CurrencyInput } from './shared'
import { formatCurrency } from '@/lib/utils/formatting'
import type { FullMotorAssessment, AssessmentOutcome, AssessmentSettings } from '@/lib/types/assessment'

interface Props {
  assessment: FullMotorAssessment
  settings?: AssessmentSettings | null
  onNavigate: (tab: string) => void
}

const OUTCOMES: { value: AssessmentOutcome; label: string; description: string }[] = [
  { value: 'repairable', label: 'Repairable', description: 'Vehicle can be economically repaired' },
  { value: 'write_off', label: 'Write-off (Uneconomical)', description: 'Repair cost exceeds maximum threshold' },
  { value: 'theft_total', label: 'Theft Total', description: 'Vehicle not recovered / totally stolen' },
  { value: 'partial_theft', label: 'Partial Theft', description: 'Items stolen but vehicle recoverable' },
  { value: 'rejected', label: 'Rejected', description: 'Claim rejected — see findings' },
  { value: 'further_investigation', label: 'Further Investigation Required', description: 'Additional checks needed before recommendation' },
]

export function OutcomeFinancialsTab({ assessment, settings, onNavigate }: Props) {
  const vatRate = (settings?.vat_rate ?? 15) / 100
  const updateAssessment = useUpdateAssessment(assessment.id)
  const upsertFinancials = useUpsertClaimFinancials(assessment.id)

  const [saved, setSaved] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const cf = assessment.claim_financials

  const [outcome, setOutcome] = useState<AssessmentOutcome | ''>(assessment.outcome ?? '')
  const [outcomeNotes, setOutcomeNotes] = useState(assessment.outcome_notes ?? '')
  const [form, setForm] = useState({
    less_excess: cf?.less_excess ?? null as number | null,
    excess_tba: cf?.excess_tba ?? true,
    less_salvage: cf?.less_salvage ?? 0,
  })

  const set = (key: string, value: unknown) => {
    setForm((f) => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await fetch(`/api/assessments/${assessment.id}/financials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recalculate: true,
          less_excess: form.excess_tba ? null : form.less_excess,
          excess_tba: form.excess_tba,
        }),
      })
      // Invalidation handled by polling / user refresh
    } finally {
      setRecalculating(false)
    }
  }

  const handleSave = async () => {
    if (outcome) {
      await updateAssessment.mutateAsync({ outcome, outcome_notes: outcomeNotes })
    }
    setSaved(true)
  }

  const repairTotal = assessment.repair_line_items.reduce((s, i) => {
    const labour = i.labour_hours * i.labour_rate
    return s + (i.qty * (i.parts_cost + labour + i.paint_cost + i.paint_materials_cost + i.strip_assm_cost + i.frame_cost + i.misc_cost))
  }, 0)

  const partsTotal = (assessment.parts_assessment?.parts_amount_excl_vat ?? 0)
    + (assessment.parts_assessment?.parts_handling_fee_excl_vat ?? 0)

  const combinedExclVat = repairTotal + partsTotal
  const vatAmount = combinedExclVat * vatRate
  const inclVat = combinedExclVat + vatAmount
  const excess = !form.excess_tba && form.less_excess ? form.less_excess : 0
  const salvage = form.less_salvage
  const netSettlement = inclVat - excess - salvage

  const maxRepair = assessment.vehicle_values?.max_repair_value ?? null
  const vehicleTotalValue = assessment.vehicle_values?.vehicle_total_value ?? null

  return (
    <div className="space-y-5">
      {/* Outcome Selection */}
      <Section title="Assessment Outcome">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              onClick={() => { setOutcome(o.value); setSaved(false) }}
              className={`p-4 rounded-xl border text-left transition-all ${
                outcome === o.value
                  ? 'border-copper bg-copper/5 shadow-sm'
                  : 'border-[#D4CFC7] hover:border-copper/50 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${outcome === o.value ? 'border-copper bg-copper' : 'border-[#D4CFC7]'}`} />
                <span className={`text-sm font-semibold ${outcome === o.value ? 'text-copper' : 'text-charcoal'}`}>{o.label}</span>
              </div>
              <p className="text-xs text-slate ml-5">{o.description}</p>
            </button>
          ))}
        </div>
        <Field label="Outcome Notes / Recommendation">
          <textarea
            value={outcomeNotes}
            onChange={(e) => { setOutcomeNotes(e.target.value); setSaved(false) }}
            rows={3}
            className="w-full px-3 py-2 border border-[#D4CFC7] rounded-lg text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-copper/30 focus:border-copper resize-none"
            placeholder="Detailed recommendation and reasoning…"
          />
        </Field>
      </Section>

      {/* Financial Summary */}
      <Section title="Financial Summary">
        <div className="flex justify-end mb-3">
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-2 text-xs text-slate hover:text-copper border border-[#D4CFC7] px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${recalculating ? 'animate-spin' : ''}`} />
            Recalculate from Line Items
          </button>
        </div>

        {/* Live calculation table */}
        <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-[#D4CFC7]">
                <td className="px-4 py-2.5 text-slate">Repair Labour &amp; Ops (excl. VAT)</td>
                <td className="px-4 py-2.5 text-right font-medium text-charcoal">{formatCurrency(repairTotal)}</td>
              </tr>
              <tr className="border-b border-[#D4CFC7]">
                <td className="px-4 py-2.5 text-slate">Parts (incl. handling, excl. VAT)</td>
                <td className="px-4 py-2.5 text-right font-medium text-charcoal">{formatCurrency(partsTotal)}</td>
              </tr>
              <tr className="border-b border-[#D4CFC7] bg-white">
                <td className="px-4 py-2.5 font-medium text-charcoal">Total (excl. VAT)</td>
                <td className="px-4 py-2.5 text-right font-semibold text-charcoal">{formatCurrency(combinedExclVat)}</td>
              </tr>
              <tr className="border-b border-[#D4CFC7]">
                <td className="px-4 py-2.5 text-slate">VAT ({(vatRate * 100).toFixed(0)}%)</td>
                <td className="px-4 py-2.5 text-right font-medium text-charcoal">{formatCurrency(vatAmount)}</td>
              </tr>
              <tr className="border-b border-[#D4CFC7] bg-white">
                <td className="px-4 py-2.5 font-medium text-charcoal">Total (incl. VAT)</td>
                <td className="px-4 py-2.5 text-right font-semibold text-charcoal">{formatCurrency(inclVat)}</td>
              </tr>
              <tr className="border-b border-[#D4CFC7]">
                <td className="px-4 py-2.5 text-slate">
                  <div className="flex items-center gap-3">
                    Less: Excess
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.excess_tba}
                        onChange={(e) => set('excess_tba', e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-[#D4CFC7] text-copper"
                      />
                      <span className="text-xs text-slate">TBA</span>
                    </label>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  {form.excess_tba ? (
                    <span className="text-slate text-xs italic">TBA</span>
                  ) : (
                    <div className="flex justify-end">
                      <div className="w-36">
                        <CurrencyInput value={form.less_excess ?? 0} onChange={(v) => set('less_excess', v)} />
                      </div>
                    </div>
                  )}
                </td>
              </tr>
              {(outcome === 'write_off' || outcome === 'theft_total') && (
                <tr className="border-b border-[#D4CFC7]">
                  <td className="px-4 py-2.5 text-slate">Less: Salvage Value</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end">
                      <div className="w-36">
                        <CurrencyInput value={form.less_salvage} onChange={(v) => set('less_salvage', v)} />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              <tr className="bg-copper/5">
                <td className="px-4 py-3 font-bold text-charcoal text-base">Net Settlement</td>
                <td className="px-4 py-3 text-right font-bold text-copper text-xl">{formatCurrency(netSettlement)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Write-off comparison */}
        {outcome === 'write_off' && vehicleTotalValue && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-[#D4CFC7] rounded-lg p-4">
              <p className="text-xs text-slate mb-1">Vehicle Total Value</p>
              <p className="text-lg font-bold text-charcoal">{formatCurrency(vehicleTotalValue)}</p>
            </div>
            <div className="border border-[#D4CFC7] rounded-lg p-4">
              <p className="text-xs text-slate mb-1">Repair Total vs Threshold</p>
              <p className={`text-lg font-bold ${maxRepair && repairTotal > maxRepair ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(repairTotal)} vs {formatCurrency(maxRepair)}
              </p>
            </div>
          </div>
        )}
      </Section>

      {/* Save & advance */}
      <div className="flex items-center justify-between pt-4 border-t border-[#D4CFC7]">
        <span className="text-sm text-slate">{saved && <span className="text-emerald-600">✓ Saved</span>}</span>
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={updateAssessment.isPending}
            className="px-5 py-2 bg-copper text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {updateAssessment.isPending ? 'Saving...' : 'Save Outcome'}
          </button>
          <button onClick={() => onNavigate('findings')} className="px-5 py-2 border border-copper text-copper rounded-lg text-sm font-medium hover:bg-copper/5 transition-colors">
            Findings & Report →
          </button>
        </div>
      </div>
    </div>
  )
}
