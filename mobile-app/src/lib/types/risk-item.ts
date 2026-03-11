/**
 * Case Risk Item types
 */

export type RiskType =
  | 'motor_vehicle'
  | 'building'
  | 'contents'
  | 'stock'
  | 'business_interruption'
  | 'goods_in_transit'
  | 'other'

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  motor_vehicle: 'Motor Vehicle',
  building: 'Building',
  contents: 'Contents',
  stock: 'Stock',
  business_interruption: 'Business Interruption',
  goods_in_transit: 'Goods in Transit',
  other: 'Other',
}

export type CoverType =
  | 'comprehensive'
  | 'third_party'
  | 'fire_and_theft'
  | 'buildings'
  | 'household_contents'
  | 'stock_and_contents'
  | 'business_all_risks'
  | 'loss_of_income'
  | 'goods_in_transit'
  | 'other'

export const COVER_TYPE_LABELS: Record<CoverType, string> = {
  comprehensive: 'Comprehensive',
  third_party: 'Third Party',
  fire_and_theft: 'Fire & Theft',
  buildings: 'Buildings',
  household_contents: 'Household Contents',
  stock_and_contents: 'Stock & Contents',
  business_all_risks: 'Business All Risks',
  loss_of_income: 'Loss of Income',
  goods_in_transit: 'Goods in Transit',
  other: 'Other',
}

/** Motor vehicle asset data */
export interface MotorVehicleAssetData {
  vin?: string
  registration?: string
  make?: string
  model?: string
  year?: number
  engine_number?: string
  mm_code?: string
  colour?: string
  odometer_km?: number
}

/** Building asset data */
export interface BuildingAssetData {
  address?: string
  erf_number?: string
  municipal_value?: number
  property_type?: string
  construction_type?: string
}

/** Generic asset data (contents, stock, other) */
export interface GenericAssetData {
  description?: string
  estimated_value?: number
}

/** Union of all asset data types */
export type AssetData = MotorVehicleAssetData | BuildingAssetData | GenericAssetData | Record<string, unknown>

export interface CaseRiskItem {
  id: string
  org_id: string
  case_id: string
  is_primary: boolean
  risk_type: RiskType
  cover_type: string | null
  description: string | null
  asset_data: AssetData
  created_at: string
  updated_at: string
}

export interface CreateRiskItemInput {
  case_id: string
  is_primary?: boolean
  risk_type: RiskType
  cover_type?: string
  description?: string
  asset_data?: AssetData
}

export type UpdateRiskItemInput = Partial<Omit<CreateRiskItemInput, 'case_id'>>

/**
 * Which risk types are available per org specialisation
 */
export const RISK_TYPES_BY_SPECIALISATION: Record<string, RiskType[]> = {
  motor_assessor: ['motor_vehicle'],
  property_assessor: ['building', 'contents'],
  loss_adjuster: ['motor_vehicle', 'building', 'contents', 'stock', 'business_interruption', 'goods_in_transit', 'other'],
  investigator: ['motor_vehicle', 'building', 'contents', 'stock', 'business_interruption', 'goods_in_transit', 'other'],
  general: ['motor_vehicle', 'building', 'contents', 'stock', 'business_interruption', 'goods_in_transit', 'other'],
}

/**
 * Get available risk types for an org based on its specialisations
 */
export function getAvailableRiskTypes(specialisations: string[]): RiskType[] {
  if (!specialisations.length) return Object.keys(RISK_TYPE_LABELS) as RiskType[]
  const types = new Set<RiskType>()
  for (const spec of specialisations) {
    const specTypes = RISK_TYPES_BY_SPECIALISATION[spec] || []
    specTypes.forEach((t) => types.add(t))
  }
  return Array.from(types)
}
