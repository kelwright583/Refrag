/**
 * Case Risk Item types (admin view)
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
  | 'all_risks'
  | 'buildings'
  | 'contents'
  | 'stock'
  | 'business_interruption'
  | 'goods_in_transit'
  | 'loss_of_income'
  | 'other'

export const COVER_TYPE_LABELS: Record<CoverType, string> = {
  comprehensive: 'Comprehensive',
  third_party: 'Third Party',
  fire_and_theft: 'Fire & Theft',
  all_risks: 'All Risks',
  buildings: 'Buildings',
  contents: 'Contents',
  stock: 'Stock',
  business_interruption: 'Business Interruption',
  goods_in_transit: 'Goods in Transit',
  loss_of_income: 'Loss of Income',
  other: 'Other',
}

export interface CaseRiskItem {
  id: string
  org_id: string
  case_id: string
  is_primary: boolean
  risk_type: RiskType
  cover_type: string | null
  description: string | null
  asset_data: Record<string, unknown>
  created_at: string
  updated_at: string
}
