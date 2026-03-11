/**
 * Report types
 */

export type ReportStatus = 'draft' | 'ready' | 'submitted'

export interface Report {
  id: string
  org_id: string
  case_id: string
  created_by: string
  version: number
  status: ReportStatus
  title: string
  summary: string | null
  created_at: string
  updated_at: string
}

export interface ReportSection {
  id: string
  org_id: string
  report_id: string
  section_key: string
  heading: string
  body_md: string
  order_index: number
  created_at: string
  updated_at: string
}

export interface ReportWithSections extends Report {
  sections: ReportSection[]
}

export interface CreateReportInput {
  case_id: string
  title: string
  summary?: string
}

export interface UpdateReportInput {
  title?: string
  summary?: string
  status?: ReportStatus
}

export interface CreateReportSectionInput {
  report_id: string
  section_key: string
  heading: string
  body_md?: string
  order_index?: number
}

export interface UpdateReportSectionInput {
  heading?: string
  body_md?: string
  order_index?: number
}

export interface ReorderSectionsInput {
  section_orders: Array<{ id: string; order_index: number }>
}
