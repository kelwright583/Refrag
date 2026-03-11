/**
 * Intake document and extracted field types
 */

export type IntakeSourceType = 'pdf_upload' | 'email_file' | 'scan_photo'

export type IntakeStatus = 'pending' | 'extracting' | 'extracted' | 'confirmed' | 'rejected'

export type FieldConfidence = 'high' | 'medium' | 'low'

export type ExtractionMethod = 'pdf_text' | 'vision_ocr' | 'email_parse' | 'rule' | 'ai_fallback'

export interface IntakeDocument {
  id: string
  org_id: string
  case_id: string | null
  storage_path: string
  file_name: string
  file_size: number | null
  content_type: string
  source_type: IntakeSourceType
  status: IntakeStatus
  raw_text: string | null
  extraction_method: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface ExtractedField {
  id: string
  org_id: string
  intake_document_id: string
  field_key: string
  value: string
  confidence: FieldConfidence
  extraction_method: ExtractionMethod
  label_matched: string | null
  confirmed_value: string | null
  confirmed_at: string | null
  created_at: string
}

export interface ExtractedFieldWithMeta extends ExtractedField {
  field_label: string        // Human-readable label (e.g. "Insurer Reference")
  field_category: string     // common, motor, property
}

/**
 * Mapping of field keys to human-readable labels
 */
export const FIELD_KEY_LABELS: Record<string, string> = {
  // Common
  insurer_reference: 'Insurer Reference',
  policy_number: 'Policy Number',
  date_of_loss: 'Date of Loss',
  insured_name: 'Insured Name',
  contact_phone: 'Contact Phone',
  insurer_name: 'Insurer',
  cover_type: 'Cover Type',
  appointment_date: 'Appointment Date',
  loss_address: 'Loss Address',
  // Motor
  vehicle_registration: 'Vehicle Registration',
  vin: 'VIN',
  engine_number: 'Engine Number',
  mm_code: 'MM Code',
  vehicle_make: 'Vehicle Make',
  vehicle_model: 'Vehicle Model',
  vehicle_year: 'Vehicle Year',
  // Property
  property_address: 'Property Address',
  erf_number: 'Erf Number',
  property_type: 'Property Type',
}

export const CONFIDENCE_COLOURS: Record<FieldConfidence, string> = {
  high: 'bg-green-100 text-green-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-red-100 text-red-800',
}
