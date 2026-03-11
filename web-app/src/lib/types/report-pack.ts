export type ReportPackStatus = 'draft' | 'ready' | 'sent'

export type ReportPackItemType =
  | 'assessment_report'
  | 'mm_codes'
  | 'parts_quote'
  | 'labour_quote'
  | 'photos'

export interface ReportPack {
  id: string
  org_id: string
  case_id: string
  assessment_id: string
  created_by: string
  status: ReportPackStatus
  title: string | null
  sent_at: string | null
  sent_to: string | null
  created_at: string
  updated_at: string
}

export interface ReportPackItem {
  id: string
  pack_id: string
  org_id: string
  item_type: ReportPackItemType
  assessment_document_id: string | null
  evidence_id: string | null
  included: boolean
  order_index: number
  created_at: string
  updated_at: string
}

export interface ReportPackWithItems extends ReportPack {
  items: ReportPackItem[]
}

export interface CreateReportPackInput {
  case_id: string
  assessment_id: string
  title?: string
}

export interface UpdateReportPackInput {
  title?: string
  status?: ReportPackStatus
  sent_to?: string
}

export interface CreateReportPackItemInput {
  item_type: ReportPackItemType
  assessment_document_id?: string
  evidence_id?: string
  included?: boolean
  order_index?: number
}

export interface UpdateReportPackItemInput {
  included?: boolean
  order_index?: number
}
