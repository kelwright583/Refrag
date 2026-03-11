/**
 * Client rule types (per-client rule engine)
 */

export type SettlementBasis = 'retail' | 'trade' | 'market'
export type PartsPolicy = 'oem_only' | 'alternate_allowed' | 'mixed'

export interface ClientRule {
  id: string
  org_id: string
  client_id: string
  rule_key: string
  rule_value: Record<string, unknown>
  description: string | null
  created_at: string
  updated_at: string
}

export interface CreateClientRuleInput {
  client_id: string
  rule_key: string
  rule_value: Record<string, unknown>
  description?: string
}

export type UpdateClientRuleInput = Partial<Omit<CreateClientRuleInput, 'client_id' | 'rule_key'>>

/**
 * Standard rule keys with metadata
 */
export const STANDARD_RULE_KEYS: Record<string, { label: string; description: string; inputType: string }> = {
  write_off_threshold_pct: {
    label: 'Write-off Threshold %',
    description: 'Percentage of retail value at which a vehicle is deemed uneconomical to repair',
    inputType: 'number',
  },
  settlement_basis: {
    label: 'Settlement Basis',
    description: 'Which valuation to use for settlement calculations',
    inputType: 'select', // retail | trade | market
  },
  parts_policy: {
    label: 'Parts Policy',
    description: 'Whether alternative parts are permitted',
    inputType: 'select', // oem_only | alternate_allowed | mixed
  },
  approved_labour_rate: {
    label: 'Approved Labour Rate (ZAR/hr)',
    description: 'Approved labour rate for repair estimates',
    inputType: 'currency',
  },
  approved_storage_rate: {
    label: 'Approved Storage Rate (ZAR/day)',
    description: 'Approved daily vehicle storage rate',
    inputType: 'currency',
  },
  structural_write_off_codes: {
    label: 'Structural Write-off Codes',
    description: 'SA vehicle damage codes that trigger automatic structural write-off',
    inputType: 'multi_select', // ["3", "3a", "4"]
  },
}

/**
 * Structured client rules (parsed from client_rules rows)
 */
export interface ClientRulesConfig {
  writeOffThresholdPct: number | null
  settlementBasis: SettlementBasis | null
  partsPolicy: PartsPolicy | null
  approvedLabourRate: number | null
  approvedStorageRate: number | null
  structuralWriteOffCodes: string[]
}

/**
 * Write-off evaluation result
 */
export type WriteOffStatus =
  | 'none'
  | 'economic'
  | 'structural_code_3'
  | 'structural_code_3a'
  | 'structural_code_4'
  | 'repairer_declined'

export interface WriteOffEvaluation {
  status: WriteOffStatus | 'insufficient_data'
  details: string
  repairEstimate: number | null
  valuationRetail: number | null
  threshold: number | null
  structuralCode: string | null
  suggestedReportText: string | null
}
