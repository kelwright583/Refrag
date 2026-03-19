/**
 * Export types
 */

export type ExportType = 'assessor_pack' | 'assessment_report'

export interface Export {
  id: string
  org_id: string
  case_id: string
  report_id: string | null
  assessment_id: string | null
  export_type: ExportType
  storage_path: string | null
  meta: Record<string, any>
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateExportInput {
  case_id: string
  report_id?: string
  assessment_id?: string
  export_type?: ExportType
}

export interface GenerateAssessmentPdfInput {
  assessment_id: string
  include_photos?: boolean
  include_documents?: boolean
}

export interface ExportWithDetails extends Export {
  case?: {
    case_number: string
    client_name: string
  }
  report?: {
    title: string
    version: number
  }
}
