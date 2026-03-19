import { describe, it, expect } from 'vitest'
import {
  computeLineItemTotal,
  computeLineItemBetterment,
  computeRepairTotal,
  computeTotalBetterment,
  computePartsTotal,
  computeMaxRepairValue,
  computeIsUneconomical,
  computeVehicleTotalValue,
  computeClaimTotalExclVat,
  applyVat,
  computeGrandTotal,
  computeWriteOffSettlement,
  computeFullFinancials,
  getLabourRateForOperation,
} from './calculator'

const makeLineItem = (overrides: Partial<Parameters<typeof computeLineItemTotal>[0]> & { is_approved?: boolean; betterment_applicable?: boolean; betterment_percentage?: number } = {}) => ({
  parts_cost: 0,
  labour_hours: 0,
  labour_rate: 0,
  paint_cost: 0,
  paint_materials_cost: 0,
  strip_assm_cost: 0,
  frame_cost: 0,
  misc_cost: 0,
  qty: 1,
  is_approved: true,
  betterment_applicable: false,
  betterment_percentage: 0,
  ...overrides,
})

describe('getLabourRateForOperation', () => {
  const rates = {
    panel: 350,
    mechanical: 400,
    electrical: 380,
    paint: 300,
    structural: 450,
    trim: 280,
    glass: 320,
    other: 250,
  }

  it('returns the correct rate for each operation type', () => {
    expect(getLabourRateForOperation('panel', rates)).toBe(350)
    expect(getLabourRateForOperation('mechanical', rates)).toBe(400)
    expect(getLabourRateForOperation('paint', rates)).toBe(300)
  })
})

describe('computeLineItemTotal', () => {
  it('sums all cost components multiplied by qty', () => {
    const item = makeLineItem({
      parts_cost: 1000,
      labour_hours: 2,
      labour_rate: 350,
      paint_cost: 200,
      paint_materials_cost: 50,
      strip_assm_cost: 100,
      frame_cost: 0,
      misc_cost: 30,
      qty: 1,
    })
    // 1000 + (2*350) + 200 + 50 + 100 + 0 + 30 = 2080
    expect(computeLineItemTotal(item)).toBe(2080)
  })

  it('multiplies total by quantity', () => {
    const item = makeLineItem({
      parts_cost: 500,
      labour_hours: 1,
      labour_rate: 200,
      qty: 3,
    })
    // (500 + 200) * 3 = 2100
    expect(computeLineItemTotal(item)).toBe(2100)
  })

  it('returns 0 when all costs are zero', () => {
    expect(computeLineItemTotal(makeLineItem())).toBe(0)
  })
})

describe('computeLineItemBetterment', () => {
  it('computes betterment on parts cost * qty', () => {
    const item = makeLineItem({
      parts_cost: 1000,
      qty: 2,
      betterment_applicable: true,
      betterment_percentage: 25,
    })
    // 1000 * 2 * 0.25 = 500
    expect(computeLineItemBetterment(item)).toBe(500)
  })

  it('returns 0 when betterment is not applicable', () => {
    const item = makeLineItem({
      parts_cost: 1000,
      qty: 1,
      betterment_applicable: false,
      betterment_percentage: 25,
    })
    expect(computeLineItemBetterment(item)).toBe(0)
  })

  it('returns 0 when betterment percentage is 0', () => {
    const item = makeLineItem({
      parts_cost: 1000,
      qty: 1,
      betterment_applicable: true,
      betterment_percentage: 0,
    })
    expect(computeLineItemBetterment(item)).toBe(0)
  })
})

describe('computeRepairTotal', () => {
  it('sums only approved line items', () => {
    const items = [
      makeLineItem({ parts_cost: 500, is_approved: true }),
      makeLineItem({ parts_cost: 300, is_approved: false }),
      makeLineItem({ parts_cost: 200, is_approved: true }),
    ]
    expect(computeRepairTotal(items)).toBe(700)
  })

  it('returns 0 when no items are approved', () => {
    const items = [
      makeLineItem({ parts_cost: 500, is_approved: false }),
    ]
    expect(computeRepairTotal(items)).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(computeRepairTotal([])).toBe(0)
  })
})

describe('computeTotalBetterment', () => {
  it('sums betterment only for approved items', () => {
    const items = [
      makeLineItem({ parts_cost: 1000, qty: 1, betterment_applicable: true, betterment_percentage: 20, is_approved: true }),
      makeLineItem({ parts_cost: 2000, qty: 1, betterment_applicable: true, betterment_percentage: 10, is_approved: false }),
    ]
    // Only first: 1000 * 1 * 0.20 = 200
    expect(computeTotalBetterment(items)).toBe(200)
  })
})

describe('computePartsTotal', () => {
  it('adds parts amount and handling fee', () => {
    expect(computePartsTotal(5000, 750)).toBe(5750)
  })

  it('handles zero values', () => {
    expect(computePartsTotal(0, 0)).toBe(0)
  })
})

describe('computeMaxRepairValue', () => {
  it('calculates percentage of retail value', () => {
    expect(computeMaxRepairValue(200000, 70)).toBe(140000)
  })

  it('returns 0 when retail value is 0', () => {
    expect(computeMaxRepairValue(0, 70)).toBe(0)
  })

  it('returns 0 when percentage is 0', () => {
    expect(computeMaxRepairValue(200000, 0)).toBe(0)
  })

  it('handles 100% correctly', () => {
    expect(computeMaxRepairValue(150000, 100)).toBe(150000)
  })
})

describe('computeIsUneconomical', () => {
  it('returns uneconomical when repair exceeds max', () => {
    const result = computeIsUneconomical(150000, 100000)
    expect(result.isUneconomical).toBe(true)
    expect(result.exceedsByAmount).toBe(50000)
    expect(result.exceedsByPercent).toBe(50)
  })

  it('returns economical when repair is under max', () => {
    const result = computeIsUneconomical(80000, 100000)
    expect(result.isUneconomical).toBe(false)
    expect(result.exceedsByAmount).toBe(0)
    expect(result.exceedsByPercent).toBe(0)
  })

  it('returns economical when repair equals max', () => {
    const result = computeIsUneconomical(100000, 100000)
    expect(result.isUneconomical).toBe(false)
    expect(result.exceedsByAmount).toBe(0)
    expect(result.exceedsByPercent).toBe(0)
  })

  it('handles zero max repair value', () => {
    const result = computeIsUneconomical(50000, 0)
    expect(result.isUneconomical).toBe(true)
    expect(result.exceedsByAmount).toBe(50000)
    expect(result.exceedsByPercent).toBe(0)
  })
})

describe('computeVehicleTotalValue', () => {
  it('adds extras and subtracts old damages', () => {
    expect(computeVehicleTotalValue(200000, 15000, 5000)).toBe(210000)
  })

  it('handles zero extras and damages', () => {
    expect(computeVehicleTotalValue(200000, 0, 0)).toBe(200000)
  })
})

describe('computeClaimTotalExclVat', () => {
  it('combines repair, parts, and subtracts betterment', () => {
    expect(computeClaimTotalExclVat(50000, 10000, 2000)).toBe(58000)
  })

  it('handles zero betterment', () => {
    expect(computeClaimTotalExclVat(50000, 10000, 0)).toBe(60000)
  })
})

describe('applyVat', () => {
  it('applies default 15% VAT', () => {
    const result = applyVat(10000)
    expect(result.vatAmount).toBe(1500)
    expect(result.totalInclVat).toBe(11500)
  })

  it('applies custom VAT rate', () => {
    const result = applyVat(10000, 20)
    expect(result.vatAmount).toBe(2000)
    expect(result.totalInclVat).toBe(12000)
  })

  it('applies 0% VAT', () => {
    const result = applyVat(10000, 0)
    expect(result.vatAmount).toBe(0)
    expect(result.totalInclVat).toBe(10000)
  })

  it('applies 5% VAT (UAE)', () => {
    const result = applyVat(10000, 5)
    expect(result.vatAmount).toBe(500)
    expect(result.totalInclVat).toBe(10500)
  })

  it('applies 7.7% VAT (Switzerland)', () => {
    const result = applyVat(10000, 7.7)
    expect(result.vatAmount).toBe(770)
    expect(result.totalInclVat).toBe(10770)
  })

  it('applies 23% VAT (Ireland)', () => {
    const result = applyVat(10000, 23)
    expect(result.vatAmount).toBe(2300)
    expect(result.totalInclVat).toBe(12300)
  })

  it('handles zero amount', () => {
    const result = applyVat(0)
    expect(result.vatAmount).toBe(0)
    expect(result.totalInclVat).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    const result = applyVat(100.33, 15)
    expect(result.vatAmount).toBe(15.05)
    expect(result.totalInclVat).toBe(115.38)
  })
})

describe('computeGrandTotal', () => {
  it('deducts excess from total', () => {
    expect(computeGrandTotal(115000, 5000)).toBe(110000)
  })

  it('returns total when excess is null', () => {
    expect(computeGrandTotal(115000, null)).toBe(115000)
  })

  it('handles zero excess', () => {
    expect(computeGrandTotal(115000, 0)).toBe(115000)
  })
})

describe('computeWriteOffSettlement', () => {
  it('computes settlement correctly', () => {
    const result = computeWriteOffSettlement(200000, 30000, 5000)
    expect(result.settlementValue).toBe(200000)
    expect(result.lessSalvage).toBe(30000)
    expect(result.netSettlement).toBe(165000) // 200000 - 30000 - 5000
  })

  it('handles null excess', () => {
    const result = computeWriteOffSettlement(200000, 30000, null)
    expect(result.netSettlement).toBe(170000) // 200000 - 30000
  })

  it('handles zero salvage', () => {
    const result = computeWriteOffSettlement(200000, 0, 5000)
    expect(result.netSettlement).toBe(195000)
  })
})

describe('computeFullFinancials', () => {
  it('computes repairable financials end-to-end', () => {
    const result = computeFullFinancials({
      outcome: 'repairable',
      lineItems: [
        makeLineItem({ parts_cost: 5000, labour_hours: 3, labour_rate: 350, is_approved: true }),
        makeLineItem({ parts_cost: 2000, labour_hours: 1, labour_rate: 350, is_approved: true }),
      ],
      partsAmountExclVat: 3000,
      partsHandlingFeeExclVat: 450,
      vatRate: 15,
      lessExcess: 2500,
      excessTba: false,
      vehicleValues: null,
    })

    // Repair total: (5000 + 1050) + (2000 + 350) = 6050 + 2350 = 8400
    // Parts total: 3000 + 450 = 3450
    // Betterment: 0
    // Total excl VAT: 8400 + 3450 = 11850
    expect(result.total_excl_vat).toBe(11850)
    expect(result.vat_rate).toBe(15)
    expect(result.vat_amount).toBe(1777.5)
    expect(result.total_incl_vat).toBe(13627.5)
    expect(result.grand_total).toBe(11127.5)
    expect(result.settlement_value).toBeNull()
    expect(result.net_settlement).toBeNull()
  })

  it('computes write-off financials', () => {
    const result = computeFullFinancials({
      outcome: 'write_off',
      lineItems: [],
      partsAmountExclVat: 0,
      partsHandlingFeeExclVat: 0,
      vatRate: 15,
      lessExcess: 3000,
      excessTba: false,
      vehicleValues: {
        retail_value: 200000,
        extras_value: 10000,
        less_old_damages: 5000,
        max_repair_percentage: 70,
        salvage_value: 25000,
      },
    })

    expect(result.total_excl_vat).toBe(0)
    expect(result.grand_total).toBe(0)
    expect(result.settlement_value).toBe(205000) // 200000 + 10000 - 5000
    expect(result.less_salvage).toBe(25000)
    expect(result.net_settlement).toBe(177000) // 205000 - 25000 - 3000
  })

  it('computes theft_total same as write_off', () => {
    const result = computeFullFinancials({
      outcome: 'theft_total',
      lineItems: [],
      partsAmountExclVat: 0,
      partsHandlingFeeExclVat: 0,
      vatRate: 15,
      lessExcess: null,
      excessTba: true,
      vehicleValues: {
        retail_value: 150000,
        extras_value: 0,
        less_old_damages: 0,
        max_repair_percentage: 70,
        salvage_value: 0,
      },
    })

    expect(result.settlement_value).toBe(150000)
    expect(result.net_settlement).toBe(150000)
  })

  it('computes full motor summary: parts + labour + paint + VAT', () => {
    const result = computeFullFinancials({
      outcome: 'repairable',
      lineItems: [
        makeLineItem({
          parts_cost: 8000,
          labour_hours: 5,
          labour_rate: 400,
          paint_cost: 1200,
          paint_materials_cost: 300,
          strip_assm_cost: 250,
          frame_cost: 0,
          misc_cost: 50,
          qty: 1,
          is_approved: true,
        }),
      ],
      partsAmountExclVat: 0,
      partsHandlingFeeExclVat: 0,
      vatRate: 15,
      lessExcess: 3000,
      excessTba: false,
      vehicleValues: null,
    })

    // Line item total: 8000 + (5*400) + 1200 + 300 + 250 + 0 + 50 = 11800
    expect(result.total_excl_vat).toBe(11800)
    expect(result.vat_amount).toBe(1770)
    expect(result.total_incl_vat).toBe(13570)
    expect(result.grand_total).toBe(10570)
  })

  it('uses non-15% VAT rate end-to-end', () => {
    const result = computeFullFinancials({
      outcome: 'repairable',
      lineItems: [
        makeLineItem({ parts_cost: 10000, is_approved: true }),
      ],
      partsAmountExclVat: 0,
      partsHandlingFeeExclVat: 0,
      vatRate: 20,
      lessExcess: null,
      excessTba: false,
      vehicleValues: null,
    })

    expect(result.total_excl_vat).toBe(10000)
    expect(result.vat_rate).toBe(20)
    expect(result.vat_amount).toBe(2000)
    expect(result.total_incl_vat).toBe(12000)
    expect(result.grand_total).toBe(12000)
  })

  it('produces currency-agnostic numeric outputs', () => {
    const result = computeFullFinancials({
      outcome: 'repairable',
      lineItems: [
        makeLineItem({ parts_cost: 25000, is_approved: true }),
      ],
      partsAmountExclVat: 5000,
      partsHandlingFeeExclVat: 500,
      vatRate: 15,
      lessExcess: 1000,
      excessTba: false,
      vehicleValues: null,
    })

    expect(typeof result.total_excl_vat).toBe('number')
    expect(typeof result.vat_amount).toBe('number')
    expect(typeof result.grand_total).toBe('number')
    const json = JSON.stringify(result)
    expect(json).not.toContain('R')
    expect(json).not.toContain('$')
    expect(json).not.toContain('£')
    expect(json).not.toContain('€')
  })
})
