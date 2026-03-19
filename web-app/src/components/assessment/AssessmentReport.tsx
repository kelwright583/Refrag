'use client'

import type { FullMotorAssessment, AssessmentSettings, RepairLineItem, OperationType } from '@/lib/types/assessment'
import {
  computeLineItemTotal,
  computeLineItemBetterment,
  computeRepairTotal,
  computeTotalBetterment,
  computePartsTotal,
  computeClaimTotalExclVat,
  applyVat,
  computeMaxRepairValue,
  computeVehicleTotalValue,
  computeIsUneconomical,
  computeWriteOffSettlement,
} from '@/lib/assessment/calculator'
import { formatCurrency, formatDate as fmtDate } from '@/lib/utils/formatting'

export interface OrgStationery {
  logo_url?: string | null
  primary_colour?: string | null
  accent_colour?: string | null
  text_colour?: string | null
  name?: string
  legal_name?: string | null
  registration_number?: string | null
  vat_number?: string | null
  footer_disclaimer?: string | null
}

interface Props {
  assessment: FullMotorAssessment
  settings: AssessmentSettings | null
  stationery?: OrgStationery | null
  locale?: string
  currencyCode?: string
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ReportSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 break-inside-avoid-page">
      <div className="flex items-baseline gap-3 mb-3 border-b-2 pb-1" style={{ borderColor: 'var(--primary)' }}>
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>{number}</span>
        <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--text-color)' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function InfoGrid({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
      {rows.map(([label, value], i) => (
        <div key={i} className="flex gap-2 text-sm">
          <span className="text-[#6B6B7E] min-w-40 shrink-0">{label}:</span>
          <span className="font-medium" style={{ color: 'var(--text-color)' }}>{value || '—'}</span>
        </div>
      ))}
    </div>
  )
}

function Divider() {
  return <div className="border-t border-[#D4CFC7] my-4" />
}

const OP_TYPE_LABEL: Record<OperationType, string> = {
  panel: 'Panel', mechanical: 'Mech.', electrical: 'Elec.',
  paint: 'Paint', structural: 'Struct.', trim: 'Trim', glass: 'Glass', other: 'Other',
}

const OUTCOME_LABEL: Record<string, string> = {
  repairable: 'REPAIRABLE',
  write_off: 'WRITE-OFF (UNECONOMICAL TO REPAIR)',
  theft_total: 'THEFT TOTAL',
  partial_theft: 'PARTIAL THEFT',
  rejected: 'CLAIM REJECTED',
  further_investigation: 'FURTHER INVESTIGATION REQUIRED',
}

const OUTCOME_COLOR: Record<string, string> = {
  repairable: 'bg-green-600',
  write_off: 'bg-red-700',
  theft_total: 'bg-red-700',
  partial_theft: 'bg-orange-600',
  rejected: 'bg-gray-600',
  further_investigation: 'bg-yellow-600',
}

// ─── Main Report ─────────────────────────────────────────────────────────────

export function AssessmentReport({ assessment, settings, stationery, locale, currencyCode }: Props) {
  const cur = (amount: number | null | undefined) => formatCurrency(amount, locale, currencyCode)
  const fmtDt = (d: string | Date | null | undefined) =>
    fmtDate(d, locale, { year: 'numeric', month: 'long', day: 'numeric' })

  const v = assessment.vehicle_details
  const vals = assessment.vehicle_values
  const ra = assessment.repair_assessment
  const pa = assessment.parts_assessment
  const cf = assessment.claim_financials

  const vatRate = settings?.vat_rate ?? 15
  const maxRepairPct = vals?.max_repair_percentage ?? settings?.max_repair_percentage ?? 75

  // Live financials (re-computed for display regardless of stored cf)
  const repairTotal = computeRepairTotal(assessment.repair_line_items)
  const bettermentTotal = computeTotalBetterment(assessment.repair_line_items)
  const partsTotal = computePartsTotal(
    pa?.parts_amount_excl_vat ?? 0,
    pa?.parts_handling_fee_excl_vat ?? 0,
  )
  const totalExclVat = computeClaimTotalExclVat(repairTotal, partsTotal, bettermentTotal)
  const { vatAmount, totalInclVat } = applyVat(totalExclVat, vatRate)
  const lessExcess = cf?.less_excess ?? null
  const excessTba = cf?.excess_tba ?? true
  const lessSalvage = cf?.less_salvage ?? vals?.salvage_value ?? 0
  const grandTotal = totalInclVat - (lessExcess ?? 0)

  const retailValue = vals?.retail_value ?? 0
  const maxRepairValue = vals?.max_repair_value_override
    ? (vals?.max_repair_value ?? computeMaxRepairValue(retailValue, maxRepairPct))
    : computeMaxRepairValue(retailValue, maxRepairPct)
  const vehicleTotalValue = computeVehicleTotalValue(retailValue, vals?.extras_value ?? 0, vals?.less_old_damages ?? 0)
  const uneconomical = computeIsUneconomical(repairTotal + partsTotal, maxRepairValue)

  const isWriteOff = assessment.outcome === 'write_off' || assessment.outcome === 'theft_total'

  const writeOffSettlement = isWriteOff
    ? computeWriteOffSettlement(vehicleTotalValue, lessSalvage, lessExcess)
    : null

  const reportedDate = assessment.date_assessed
    ? fmtDt(assessment.date_assessed)
    : fmtDt(new Date().toISOString())

  const withoutPrejudice = settings?.without_prejudice_default ?? true

  // Group line items by operation type for summary
  const lineItemsByType = assessment.repair_line_items.reduce((acc, item) => {
    if (!acc[item.operation_type]) acc[item.operation_type] = []
    acc[item.operation_type].push(item)
    return acc
  }, {} as Record<OperationType, RepairLineItem[]>)

  const primaryColour = stationery?.primary_colour || '#8B4513'
  const accentColour = stationery?.accent_colour || '#1A1A2E'
  const textColour = stationery?.text_colour || '#1A1A2E'
  const orgName = stationery?.name || null
  const orgLegalName = stationery?.legal_name || null
  const orgRegNumber = stationery?.registration_number || settings?.company_registration || null
  const orgVatNumber = stationery?.vat_number || settings?.vat_registration || null

  return (
    <div
      id="assessment-report"
      className="bg-white max-w-[860px] mx-auto shadow-lg print:shadow-none print:max-w-none"
      style={{
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        '--primary': primaryColour,
        '--accent': accentColour,
        '--text-color': textColour,
      } as React.CSSProperties}
    >
      {/* ── COVER / HEADER ─────────────────────────────────────────────────── */}
      <header className="px-10 pt-10 pb-6 border-b-4" style={{ borderColor: 'var(--primary)' }}>
        <div className="flex items-start justify-between gap-6">
          {/* Org branding */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              {stationery?.logo_url ? (
                <img src={stationery.logo_url} alt={orgName || 'Logo'} className="h-12 w-auto max-w-[120px] object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: 'var(--primary)' }}>
                  {orgName ? orgName.charAt(0).toUpperCase() : 'R'}
                </div>
              )}
              <div>
                {orgName && (
                  <p className="text-sm font-bold" style={{ color: 'var(--text-color)' }}>{orgName}</p>
                )}
                {!orgName && (
                  <p className="text-xs text-[#6B6B7E] font-medium uppercase tracking-wider">Assessors &amp; Loss Adjusters</p>
                )}
                {orgRegNumber && (
                  <p className="text-xs text-[#6B6B7E]">Reg: {orgRegNumber}</p>
                )}
                {orgVatNumber && (
                  <p className="text-xs text-[#6B6B7E]">VAT: {orgVatNumber}</p>
                )}
              </div>
            </div>
          </div>

          {/* Report title + meta */}
          <div className="text-right">
            <h1 className="text-2xl font-bold uppercase tracking-tight leading-tight" style={{ color: 'var(--text-color)' }}>
              Motor Vehicle Assessment Report
            </h1>
            {withoutPrejudice && (
              <p className="text-[10px] text-[#6B6B7E] font-semibold uppercase tracking-widest mt-0.5">
                Without Prejudice
              </p>
            )}
            <p className="text-xs text-[#6B6B7E] mt-2">Dated: {reportedDate}</p>
            {assessment.sequence_number > 1 && (
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--primary)' }}>
                {assessment.assessment_sequence === 'supplementary' ? 'Supplementary' : 'Re-inspection'} — #{assessment.sequence_number}
              </p>
            )}
          </div>
        </div>

        {/* Outcome banner */}
        {assessment.outcome && (
          <div className={`mt-5 px-5 py-3 rounded-lg text-white text-center font-bold uppercase tracking-wider text-sm ${OUTCOME_COLOR[assessment.outcome] ?? 'bg-gray-600'}`}>
            {OUTCOME_LABEL[assessment.outcome] ?? assessment.outcome}
          </div>
        )}
      </header>

      <div className="px-10 py-8 space-y-0">
        {/* ── 1. INSTRUCTION DETAILS ───────────────────────────────────────── */}
        <ReportSection number="1" title="Instruction Details">
          <InfoGrid rows={[
            ['Insurer', assessment.insurer_name],
            ['Insurer Email', assessment.insurer_email],
            ['Claim Number', assessment.claim_number],
            ['Date of Loss', fmtDt(assessment.date_of_loss)],
            ['Claims Technician', assessment.claims_technician],
            ['Policy Number', assessment.policy_number],
          ]} />
        </ReportSection>

        {/* ── 2. INSURED DETAILS ───────────────────────────────────────────── */}
        <ReportSection number="2" title="Insured Details">
          <InfoGrid rows={[
            ['Insured Name', assessment.insured_name],
            ['Contact Number', assessment.insured_contact],
            ['Policy Number', assessment.policy_number],
          ]} />
        </ReportSection>

        {/* ── 3. ASSESSOR DETAILS ──────────────────────────────────────────── */}
        <ReportSection number="3" title="Assessor Details">
          <InfoGrid rows={[
            ['Assessor', assessment.assessor_name],
            ['Contact', assessment.assessor_contact],
            ['Date Assessed', fmtDt(assessment.date_assessed)],
            ['Assessment Type', titleCase(assessment.assessment_type)],
            ['Assessment Location', assessment.assessment_location],
            ['Vehicle Stripped', assessment.vehicle_stripped ? 'Yes — stripped for inspection' : 'No'],
          ]} />
        </ReportSection>

        {/* ── 4. VEHICLE DETAILS ───────────────────────────────────────────── */}
        <ReportSection number="4" title="Vehicle Description">
          <InfoGrid rows={[
            ['Make', v?.make],
            ['Model', v?.model],
            ['Year Model', v?.year_model?.toString()],
            ['Registration', v?.reg_number],
            ['VIN Number', v?.vin_number],
            ['Engine Number', v?.engine_number],
            ['Mileage', v?.mileage_unknown ? 'Not legible' : (v?.mileage != null ? `${v.mileage.toLocaleString()} km` : null)],
            ['Identifier', v?.identifier_value ?? v?.mm_code],
            ['Transmission', v?.transmission],
            ['Colour', v?.colour],
          ]} />
        </ReportSection>

        {/* ── 5. VEHICLE CONDITION ─────────────────────────────────────────── */}
        <ReportSection number="5" title="Vehicle Condition">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-1.5 mb-3">
            {[
              ['Windscreen', v?.windscreen],
              ['Wheels', v?.wheels],
              ['Spare Wheel', v?.spare_wheel],
              ['Air Conditioning', v?.air_conditioning],
              ['Radio / Infotainment', v?.radio],
              ['Brakes', v?.brakes],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-2 text-sm">
                <span className="text-[#6B6B7E] shrink-0 min-w-36">{label}:</span>
                <span className="text-[#1A1A2E] font-medium capitalize">{value ? titleCase(value as string) : '—'}</span>
              </div>
            ))}
          </div>
          {v?.vehicle_notes && (
            <p className="text-sm text-[#1A1A2E] bg-[#FAFAF8] border border-[#D4CFC7] rounded px-3 py-2 mt-2">
              {v.vehicle_notes}
            </p>
          )}
        </ReportSection>

        {/* ── 6. DAMAGE OVERVIEW ───────────────────────────────────────────── */}
        <ReportSection number="6" title="Damage Overview">
          <InfoGrid rows={[
            ['Primary Damage Direction', v?.damage_direction ? titleCase(v.damage_direction) : null],
          ]} />
          {v?.damage_description && (
            <p className="text-sm text-[#1A1A2E] mt-2 leading-relaxed">{v.damage_description}</p>
          )}
        </ReportSection>

        {/* ── 7. PRE-EXISTING DAMAGES ──────────────────────────────────────── */}
        {assessment.pre_existing_damages.length > 0 && (
          <ReportSection number="7" title="Pre-Existing Damages (Not Part of Current Claim)">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  <th className="text-left px-3 py-2 font-medium">Location / Panel</th>
                  <th className="text-left px-3 py-2 font-medium">Severity</th>
                  <th className="text-left px-3 py-2 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {assessment.pre_existing_damages.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}>
                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-color)' }}>{d.location}</td>
                    <td className="px-3 py-2 capitalize">{d.severity}</td>
                    <td className="px-3 py-2 text-[#6B6B7E]">{d.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>
        )}

        {/* ── 8. TYRE CONDITION ────────────────────────────────────────────── */}
        {assessment.tyre_details.length > 0 && (
          <ReportSection number="8" title="Tyre Condition">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                  <th className="text-left px-3 py-2 font-medium">Position</th>
                  <th className="text-left px-3 py-2 font-medium">Make</th>
                  <th className="text-left px-3 py-2 font-medium">Size</th>
                  <th className="text-left px-3 py-2 font-medium">Tread</th>
                  <th className="text-left px-3 py-2 font-medium">Condition</th>
                  <th className="text-left px-3 py-2 font-medium">Comments</th>
                </tr>
              </thead>
              <tbody>
                {assessment.tyre_details.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}>
                    <td className="px-3 py-2 font-semibold text-[#1A1A2E]">
                      {t.position === 'RF' ? 'Right Front' : t.position === 'LF' ? 'Left Front' : t.position === 'RR' ? 'Right Rear' : 'Left Rear'}
                    </td>
                    <td className="px-3 py-2">{t.make || '—'}</td>
                    <td className="px-3 py-2">{t.size || '—'}</td>
                    <td className="px-3 py-2">{t.tread_mm != null ? `${t.tread_mm} mm` : '—'}</td>
                    <td className="px-3 py-2 capitalize">{t.condition}</td>
                    <td className="px-3 py-2 text-[#6B6B7E]">{t.comments || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportSection>
        )}

        {/* ── 9. VEHICLE VALUES ────────────────────────────────────────────── */}
        <ReportSection number="9" title="Vehicle Valuation">
          <InfoGrid rows={[
            ['Valuation Source', vals?.source ? titleCase(vals.source) : null],
            ['Valuation Date', fmtDt(vals?.valuation_date ?? null)],
          ]} />
          <Divider />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mt-2">
            {[
              ['New Price (OTR)', cur(vals?.new_price_value)],
              ['Retail Value', cur(vals?.retail_value)],
              ['Trade Value', cur(vals?.trade_value)],
              ['Market Value', cur(vals?.market_value)],
              ['Extras Value', cur(vals?.extras_value)],
              ['Less Old Damages', cur(vals?.less_old_damages)],
            ].map(([label, value]) => (
              <div key={label} className="bg-[#FAFAF8] border border-[#D4CFC7] rounded px-3 py-2">
                <p className="text-[10px] text-[#6B6B7E] uppercase tracking-wide mb-0.5">{label}</p>
                <p className="font-semibold text-[#1A1A2E]">{value}</p>
              </div>
            ))}
          </div>
          <Divider />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div className="text-white rounded px-3 py-2" style={{ backgroundColor: 'var(--accent)' }}>
              <p className="text-[10px] text-white/60 uppercase tracking-wide mb-0.5">Vehicle Total Value</p>
              <p className="font-bold text-base">{cur(vehicleTotalValue)}</p>
            </div>
            <div className="text-white rounded px-3 py-2" style={{ backgroundColor: 'var(--primary)' }}>
              <p className="text-[10px] text-white/60 uppercase tracking-wide mb-0.5">Max Repair Threshold ({maxRepairPct}%)</p>
              <p className="font-bold text-base">{cur(maxRepairValue)}</p>
            </div>
            {isWriteOff && (
              <div className="bg-[#FAFAF8] border border-[#D4CFC7] rounded px-3 py-2">
                <p className="text-[10px] text-[#6B6B7E] uppercase tracking-wide mb-0.5">Salvage Value</p>
                <p className="font-semibold text-[#1A1A2E]">{cur(vals?.salvage_value)}</p>
              </div>
            )}
          </div>
        </ReportSection>

        {/* ── 10. REPAIRER DETAILS ─────────────────────────────────────────── */}
        {ra && (
          <ReportSection number="10" title="Repairer Details">
            <InfoGrid rows={[
              ['Repairer / Workshop', ra.repairer_name],
              ['Contact Number', ra.repairer_contact],
              ['Email', ra.repairer_email],
              ['Approved Panel Repairer', ra.approved_repairer ? 'Yes' : 'No'],
              ['Repairer Quoted Amount', ra.quoted_amount != null ? cur(ra.quoted_amount) : null],
            ]} />
          </ReportSection>
        )}

        {/* ── 11. REPAIR ASSESSMENT (LINE ITEMS) ───────────────────────────── */}
        {assessment.repair_line_items.length > 0 && (
          <ReportSection number="11" title="Repair Assessment — Line Items">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-white" style={{ backgroundColor: 'var(--accent)' }}>
                  <th className="text-left px-2 py-2 font-medium rounded-tl">Description</th>
                  <th className="text-center px-2 py-2 font-medium">Type</th>
                  <th className="text-right px-2 py-2 font-medium">Parts</th>
                  <th className="text-right px-2 py-2 font-medium">Labour</th>
                  <th className="text-right px-2 py-2 font-medium">Paint</th>
                  <th className="text-right px-2 py-2 font-medium">Other</th>
                  <th className="text-right px-2 py-2 font-medium">Total</th>
                  <th className="text-center px-2 py-2 font-medium rounded-tr">Appr.</th>
                </tr>
              </thead>
              <tbody>
                {assessment.repair_line_items.map((item, i) => {
                  const total = computeLineItemTotal(item)
                  const labour = item.labour_hours * item.labour_rate
                  const paint = item.paint_cost + item.paint_materials_cost
                  const other = item.strip_assm_cost + item.frame_cost + item.misc_cost
                  return (
                    <tr key={item.id} className={`${!item.is_approved ? 'opacity-40 line-through' : ''} ${i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]'}`}>
                      <td className="px-2 py-2 font-medium text-[#1A1A2E]">
                        {item.description}
                        {item.is_sublet && <span className="ml-1.5 text-[9px] bg-slate-100 text-slate-600 px-1 rounded">SUBLET</span>}
                        {item.betterment_applicable && <span className="ml-1.5 text-[9px] bg-amber-50 text-amber-700 px-1 rounded">{item.betterment_percentage}% BETTER.</span>}
                      </td>
                      <td className="px-2 py-2 text-center text-[#6B6B7E]">{OP_TYPE_LABEL[item.operation_type]}</td>
                      <td className="px-2 py-2 text-right">{item.parts_cost > 0 ? cur(item.parts_cost) : '—'}</td>
                      <td className="px-2 py-2 text-right">{labour > 0 ? cur(labour) : '—'}</td>
                      <td className="px-2 py-2 text-right">{paint > 0 ? cur(paint) : '—'}</td>
                      <td className="px-2 py-2 text-right">{other > 0 ? cur(other) : '—'}</td>
                      <td className="px-2 py-2 text-right font-semibold text-[#1A1A2E]">{cur(total)}</td>
                      <td className="px-2 py-2 text-center">{item.is_approved ? '✓' : '✗'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                {bettermentTotal > 0 && (
                  <tr className="border-t border-[#D4CFC7]">
                    <td colSpan={6} className="px-2 py-2 text-right text-[#6B6B7E] text-xs italic">Less: Betterment Deduction</td>
                    <td className="px-2 py-2 text-right text-orange-700 font-medium">({cur(bettermentTotal)})</td>
                    <td />
                  </tr>
                )}
                <tr className="text-white" style={{ backgroundColor: 'var(--accent)' }}>
                  <td colSpan={6} className="px-2 py-2 text-right font-semibold text-sm">Assessed Repair Total (excl. VAT)</td>
                  <td className="px-2 py-2 text-right font-bold text-sm">{cur(repairTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>

            {/* Uneconomical warning */}
            {uneconomical.isUneconomical && (
              <div className="mt-3 px-4 py-3 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800">
                <strong>Uneconomical to Repair:</strong> The assessed repair total ({cur(repairTotal + partsTotal)}) exceeds
                the maximum repair threshold of {cur(maxRepairValue)} ({maxRepairPct}% of retail value) by{' '}
                <strong>{cur(uneconomical.exceedsByAmount)}</strong> ({uneconomical.exceedsByPercent.toFixed(1)}%).
              </div>
            )}
          </ReportSection>
        )}

        {/* ── 12. PARTS ASSESSMENT ─────────────────────────────────────────── */}
        {pa && (
          <ReportSection number="12" title="Parts Assessment">
            <InfoGrid rows={[
              ['Parts Supplier', pa.supplier_name],
              ['Contact', pa.supplier_contact],
              ['Email', pa.supplier_email],
            ]} />
            {pa.notes_on_parts && (
              <p className="text-sm text-[#1A1A2E] bg-[#FAFAF8] border border-[#D4CFC7] rounded px-3 py-2 mt-2">
                {pa.notes_on_parts}
              </p>
            )}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                ['Parts (excl. VAT)', cur(pa.parts_amount_excl_vat)],
                ['Handling Fee (excl. VAT)', cur(pa.parts_handling_fee_excl_vat)],
                ['Total Parts (excl. VAT)', cur(partsTotal)],
                ['Total Parts (incl. VAT)', cur(partsTotal * (1 + vatRate / 100))],
              ].map(([label, value]) => (
                <div key={label} className="bg-[#FAFAF8] border border-[#D4CFC7] rounded px-3 py-2">
                  <p className="text-[10px] text-[#6B6B7E] uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="font-semibold text-[#1A1A2E]">{value}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {/* ── 13. FINANCIAL SUMMARY ────────────────────────────────────────── */}
        <ReportSection number="13" title="Financial Summary">
          {isWriteOff && writeOffSettlement ? (
            <FinancialTable rows={[
              ['Vehicle Total Value', cur(vehicleTotalValue), false],
              ['Less: Salvage Value', `(${cur(lessSalvage)})`, false],
              ['Less: Excess', excessTba ? 'TBA' : (lessExcess ? `(${cur(lessExcess)})` : '—'), false],
              ['NET SETTLEMENT', cur(writeOffSettlement.netSettlement), true],
            ]} />
          ) : (
            <FinancialTable rows={[
              ['Repair Labour & Operations (excl. VAT)', cur(repairTotal), false],
              ['Parts incl. Handling (excl. VAT)', cur(partsTotal), false],
              ...(bettermentTotal > 0 ? [['Less: Betterment Deduction', `(${cur(bettermentTotal)})`, false] as [string, string, boolean]] : []),
              ['Total (excl. VAT)', cur(totalExclVat), false],
              [`VAT (${vatRate}%)`, cur(vatAmount), false],
              ['Total (incl. VAT)', cur(totalInclVat), false],
              ['Less: Excess', excessTba ? 'TBA' : (lessExcess ? `(${cur(lessExcess)})` : '—'), false],
              ['GRAND TOTAL', cur(grandTotal), true],
            ]} />
          )}
        </ReportSection>

        {/* ── 14. ASSESSMENT OUTCOME ───────────────────────────────────────── */}
        <ReportSection number="14" title="Assessment Outcome & Recommendation">
          {assessment.outcome && (
            <div className={`px-5 py-3 rounded-lg text-white text-center font-bold uppercase tracking-wider text-sm mb-4 ${OUTCOME_COLOR[assessment.outcome] ?? 'bg-gray-600'}`}>
              {OUTCOME_LABEL[assessment.outcome] ?? assessment.outcome}
            </div>
          )}
          {assessment.outcome_notes && (
            <p className="text-sm text-[#1A1A2E] leading-relaxed whitespace-pre-wrap">{assessment.outcome_notes}</p>
          )}
          {!assessment.outcome && !assessment.outcome_notes && (
            <p className="text-sm text-[#6B6B7E] italic">Outcome not yet recorded.</p>
          )}
        </ReportSection>

        {/* ── 15. SIGNATURE / ASSESSOR SIGN-OFF ────────────────────────────── */}
        <ReportSection number="15" title="Assessor Declaration">
          <p className="text-sm text-[#6B6B7E] mb-6 leading-relaxed">
            I, the undersigned assessor, hereby certify that the above assessment was conducted to the best of my
            professional ability and that the findings contained herein represent a true and accurate reflection of
            the vehicle's condition and damage at the time of inspection.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div>
              <div className="border-b-2 border-[#1A1A2E] mb-1 h-10" />
              <p className="text-xs text-[#6B6B7E]">Assessor Signature</p>
              <p className="text-sm font-medium text-[#1A1A2E] mt-0.5">{assessment.assessor_name || '______________________'}</p>
            </div>
            <div>
              <div className="border-b-2 border-[#1A1A2E] mb-1 h-10" />
              <p className="text-xs text-[#6B6B7E]">Date</p>
              <p className="text-sm font-medium text-[#1A1A2E] mt-0.5">{fmtDt(assessment.date_assessed)}</p>
            </div>
          </div>
        </ReportSection>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="px-10 py-5 border-t border-[#D4CFC7] text-[10px] text-[#6B6B7E] leading-relaxed">
        {stationery?.footer_disclaimer ? (
          <p>{stationery.footer_disclaimer}</p>
        ) : settings?.report_disclaimer ? (
          <p>{settings.report_disclaimer}</p>
        ) : (
          <p>
            This report has been prepared for the purposes of insurance loss assessment only.
            {withoutPrejudice && ' This assessment is issued without prejudice and does not constitute an admission of liability.'}
            {' '}The findings are based on the vehicle&apos;s condition at the time of inspection.
          </p>
        )}
        <div className="flex justify-between mt-3 pt-2 border-t border-[#D4CFC7]">
          <span>Assessment Ref: {assessment.claim_number || assessment.id.slice(0, 8).toUpperCase()}</span>
          <span>Generated: {fmtDt(new Date())}</span>
        </div>
        <p className="mt-2 text-center" style={{ fontSize: '7pt', color: '#9CA3AF' }}>
          Powered by Refrag · refrag.app
        </p>
      </footer>
    </div>
  )
}

// ─── Financial table helper ──────────────────────────────────────────────────

function FinancialTable({ rows }: { rows: [string, string, boolean][] }) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map(([label, value, isTotal], i) => (
          <tr
            key={i}
            className={`border-b ${!isTotal ? (i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAF8]') : ''}`}
            style={isTotal ? { backgroundColor: 'var(--accent)', color: '#fff' } : undefined}
          >
            <td className={`px-4 py-2.5 ${isTotal ? 'font-bold text-base' : ''}`}>{label}</td>
            <td className={`px-4 py-2.5 text-right ${isTotal ? 'font-bold text-base' : 'font-medium'}`}>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
