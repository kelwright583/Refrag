/**
 * Transaction types (Report Pack checkout)
 */

export type TransactionType = 'report_pack_base' | 'valuation_enrichment' | 'transcript_enrichment'

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface Transaction {
  id: string
  org_id: string
  case_id: string
  export_id: string | null
  transaction_type: TransactionType
  amount: number
  currency: string
  status: TransactionStatus
  stripe_session_id: string | null
  stripe_payment_intent_id: string | null
  meta: Record<string, unknown>
  created_by: string
  created_at: string
}

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  report_pack_base: 'Report Pack (Base)',
  valuation_enrichment: 'Valuation Enrichment',
  transcript_enrichment: 'Transcript Enrichment',
}
