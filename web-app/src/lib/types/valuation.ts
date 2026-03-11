/**
 * Valuation snapshot types
 */

export interface ValuationSnapshot {
  id: string
  org_id: string
  case_id: string
  risk_item_id: string | null
  provider: string
  provider_request_id: string | null
  request_payload: Record<string, unknown>
  response_payload: Record<string, unknown>
  retail_value: number | null
  trade_value: number | null
  market_value: number | null
  decode_data: Record<string, unknown> | null
  fetched_at: string
  created_by: string | null
  created_at: string
}

export interface FetchValuationInput {
  case_id: string
  risk_item_id: string
}
