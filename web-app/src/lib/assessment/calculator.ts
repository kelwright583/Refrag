import type {
  RepairLineItem,
  ClaimFinancials,
  VehicleValues,
  AssessmentOutcome,
  OperationType,
} from '@/lib/types/assessment'

export interface LabourRateTable {
  panel: number
  mechanical: number
  electrical: number
  paint: number
  structural: number
  trim: number
  glass: number
  other: number
}

export function getLabourRateForOperation(
  operationType: OperationType,
  rates: LabourRateTable
): number {
  return rates[operationType] ?? 0
}

/**
 * Compute the total cost of a single line item (excluding betterment deduction).
 * labour_cost is hours × rate (computed column in DB, but we calculate client-side for preview).
 */
export function computeLineItemTotal(item: {
  parts_cost: number
  labour_hours: number
  labour_rate: number
  paint_cost: number
  paint_materials_cost: number
  strip_assm_cost: number
  frame_cost: number
  misc_cost: number
  qty: number
}): number {
  const labourCost = item.labour_hours * item.labour_rate
  return (
    item.parts_cost +
    labourCost +
    item.paint_cost +
    item.paint_materials_cost +
    item.strip_assm_cost +
    item.frame_cost +
    item.misc_cost
  ) * item.qty
}

/**
 * Compute betterment deduction for a single line item.
 * Betterment applies to the parts cost only (new part replacing worn part).
 */
export function computeLineItemBetterment(item: {
  parts_cost: number
  qty: number
  betterment_applicable: boolean
  betterment_percentage: number
}): number {
  if (!item.betterment_applicable || item.betterment_percentage <= 0) return 0
  return item.parts_cost * item.qty * (item.betterment_percentage / 100)
}

/**
 * Sum all approved line items to get the assessed repair total (excl VAT).
 */
export function computeRepairTotal(
  lineItems: Pick<RepairLineItem, 'is_approved' | 'parts_cost' | 'labour_hours' | 'labour_rate' | 'paint_cost' | 'paint_materials_cost' | 'strip_assm_cost' | 'frame_cost' | 'misc_cost' | 'qty'>[]
): number {
  return lineItems
    .filter((item) => item.is_approved)
    .reduce((sum, item) => sum + computeLineItemTotal(item), 0)
}

/**
 * Sum all betterment deductions across approved line items.
 */
export function computeTotalBetterment(
  lineItems: Pick<RepairLineItem, 'is_approved' | 'parts_cost' | 'qty' | 'betterment_applicable' | 'betterment_percentage'>[]
): number {
  return lineItems
    .filter((item) => item.is_approved)
    .reduce((sum, item) => sum + computeLineItemBetterment(item), 0)
}

/**
 * Compute parts total including handling fee.
 */
export function computePartsTotal(
  partsAmountExclVat: number,
  handlingFeeExclVat: number
): number {
  return partsAmountExclVat + handlingFeeExclVat
}

/**
 * Compute max repair value from retail value and percentage.
 */
export function computeMaxRepairValue(
  retailValue: number,
  percentage: number
): number {
  return retailValue * (percentage / 100)
}

/**
 * Check if the repair is uneconomical (exceeds max repair value).
 */
export function computeIsUneconomical(
  repairTotal: number,
  maxRepairValue: number
): { isUneconomical: boolean; exceedsByAmount: number; exceedsByPercent: number } {
  const exceedsByAmount = repairTotal - maxRepairValue
  const exceedsByPercent = maxRepairValue > 0
    ? ((repairTotal - maxRepairValue) / maxRepairValue) * 100
    : 0

  return {
    isUneconomical: repairTotal > maxRepairValue,
    exceedsByAmount: Math.max(0, exceedsByAmount),
    exceedsByPercent: Math.max(0, exceedsByPercent),
  }
}

/**
 * Compute the vehicle total value after extras and old damage deductions.
 */
export function computeVehicleTotalValue(
  retailValue: number,
  extrasValue: number,
  lessOldDamages: number
): number {
  return retailValue + extrasValue - lessOldDamages
}

/**
 * Compute claim total excl VAT for a repairable outcome.
 */
export function computeClaimTotalExclVat(
  repairTotal: number,
  partsTotal: number,
  bettermentDeduction: number
): number {
  return repairTotal + partsTotal - bettermentDeduction
}

/**
 * Apply VAT to an amount.
 */
export function applyVat(
  amountExclVat: number,
  vatRate: number = 15
): { vatAmount: number; totalInclVat: number } {
  const vatAmount = amountExclVat * (vatRate / 100)
  return {
    vatAmount: Math.round(vatAmount * 100) / 100,
    totalInclVat: Math.round((amountExclVat + vatAmount) * 100) / 100,
  }
}

/**
 * Compute grand total after excess deduction.
 */
export function computeGrandTotal(
  totalInclVat: number,
  lessExcess: number | null
): number {
  if (lessExcess === null) return totalInclVat
  return totalInclVat - lessExcess
}

/**
 * Compute write-off / theft total settlement.
 */
export function computeWriteOffSettlement(
  vehicleTotalValue: number,
  salvageValue: number,
  lessExcess: number | null
): { settlementValue: number; lessSalvage: number; netSettlement: number } {
  const netBeforeExcess = vehicleTotalValue - salvageValue
  const excessDeduction = lessExcess ?? 0

  return {
    settlementValue: vehicleTotalValue,
    lessSalvage: salvageValue,
    netSettlement: netBeforeExcess - excessDeduction,
  }
}

// ============================================================================
// Full financial computation — runs all calculations and returns ClaimFinancials
// ============================================================================

export interface FinancialComputationInput {
  outcome: AssessmentOutcome | null
  lineItems: Pick<RepairLineItem, 'is_approved' | 'parts_cost' | 'labour_hours' | 'labour_rate' | 'paint_cost' | 'paint_materials_cost' | 'strip_assm_cost' | 'frame_cost' | 'misc_cost' | 'qty' | 'betterment_applicable' | 'betterment_percentage'>[]
  partsAmountExclVat: number
  partsHandlingFeeExclVat: number
  vatRate: number
  lessExcess: number | null
  excessTba: boolean
  vehicleValues: Pick<VehicleValues, 'retail_value' | 'extras_value' | 'less_old_damages' | 'max_repair_percentage' | 'salvage_value'> | null
}

export function computeFullFinancials(input: FinancialComputationInput): Omit<ClaimFinancials, 'id' | 'assessment_id' | 'org_id' | 'created_at' | 'updated_at'> {
  const repairTotal = computeRepairTotal(input.lineItems)
  const bettermentTotal = computeTotalBetterment(input.lineItems)
  const partsTotal = computePartsTotal(input.partsAmountExclVat, input.partsHandlingFeeExclVat)

  const isWriteOff = input.outcome === 'write_off' || input.outcome === 'theft_total'

  if (isWriteOff && input.vehicleValues) {
    const vehicleTotalValue = computeVehicleTotalValue(
      input.vehicleValues.retail_value ?? 0,
      input.vehicleValues.extras_value ?? 0,
      input.vehicleValues.less_old_damages ?? 0
    )
    const settlement = computeWriteOffSettlement(
      vehicleTotalValue,
      input.vehicleValues.salvage_value ?? 0,
      input.lessExcess
    )

    return {
      total_excl_vat: 0,
      vat_rate: input.vatRate,
      vat_amount: 0,
      total_incl_vat: 0,
      less_excess: input.lessExcess,
      excess_tba: input.excessTba,
      grand_total: 0,
      settlement_value: settlement.settlementValue,
      less_salvage: settlement.lessSalvage,
      net_settlement: settlement.netSettlement,
      has_manual_override: false,
    }
  }

  const totalExclVat = computeClaimTotalExclVat(repairTotal, partsTotal, bettermentTotal)
  const { vatAmount, totalInclVat } = applyVat(totalExclVat, input.vatRate)
  const grandTotal = computeGrandTotal(totalInclVat, input.lessExcess)

  return {
    total_excl_vat: Math.round(totalExclVat * 100) / 100,
    vat_rate: input.vatRate,
    vat_amount: vatAmount,
    total_incl_vat: totalInclVat,
    less_excess: input.lessExcess,
    excess_tba: input.excessTba,
    grand_total: Math.round(grandTotal * 100) / 100,
    settlement_value: null,
    less_salvage: null,
    net_settlement: null,
    has_manual_override: false,
  }
}
