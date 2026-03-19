export type RateType = 'flat_fee' | 'hourly' | 'per_assessment' | 'per_km' | 'daily'

export interface ClientRate {
  id: string
  org_id: string
  client_id: string
  name: string
  rate_type: RateType
  amount: number
  currency_code: string
  unit_label: string | null
  applies_to: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateClientRateInput {
  name: string
  rate_type: RateType
  amount: number
  currency_code?: string
  unit_label?: string
  applies_to?: string
  notes?: string
}

export type UpdateClientRateInput = Partial<CreateClientRateInput>

export const RATE_TYPE_OPTIONS: { value: RateType; label: string }[] = [
  { value: 'flat_fee', label: 'Flat Fee' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'per_assessment', label: 'Per Assessment' },
  { value: 'per_km', label: 'Per KM' },
  { value: 'daily', label: 'Daily' },
]

export const RATE_APPLIES_TO_OPTIONS = [
  'motor_assessment',
  'property_assessment',
  'investigation',
  'loss_adjustment',
  'travel',
  'storage',
  'towing',
  'administration',
  'all',
]
