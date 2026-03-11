/**
 * Document Ingestion Engine — types
 *
 * Describes the result of uploading and AI-extracting a document
 * (assessment instruction, parts quote, repairer quote, MM valuation, etc.)
 */

export type DocumentType =
  | 'motor_assessment_instruction'
  | 'repairer_quote'
  | 'parts_quote'
  | 'mm_valuation'
  | 'unknown'

export type FieldConfidence = 'high' | 'medium' | 'low' | 'not_found'

/** A single field extracted from a document */
export interface ExtractedField {
  value: string | null
  confidence: FieldConfidence
  /** Brief note from the AI about where/how it found this value */
  context?: string
  /** Whether this field contains PII — was extracted locally, never sent to AI */
  is_pii?: boolean
}

/** Full extraction result returned by the ingest-document API */
export interface ExtractionResult {
  /** Detected document type */
  document_type: DocumentType
  /** Confidence in the document type detection */
  document_type_confidence: FieldConfidence
  /** Storage path for the uploaded file */
  storage_path: string
  /** assessment_documents row id (if assessment_id was provided) */
  assessment_document_id?: string

  // ── Case-level fields ─────────────────────────────────────────────────────
  claim_reference?: ExtractedField
  insurer_name?: ExtractedField
  broker_name?: ExtractedField
  loss_date?: ExtractedField

  // ── PII fields (extracted via regex/OCR locally, never sent to AI) ────────
  insured_name?: ExtractedField
  insured_contact?: ExtractedField
  policy_number?: ExtractedField

  // ── Instruction / assessment fields ───────────────────────────────────────
  insurer_email?: ExtractedField
  claims_technician?: ExtractedField
  assessment_location?: ExtractedField
  cover_type?: ExtractedField
  excess_amount?: ExtractedField
  excess_note?: ExtractedField
  primary_use?: ExtractedField

  // ── Vehicle fields ────────────────────────────────────────────────────────
  vehicle_make?: ExtractedField
  vehicle_model?: ExtractedField
  vehicle_year?: ExtractedField
  vehicle_reg?: ExtractedField
  vehicle_vin?: ExtractedField
  vehicle_engine_number?: ExtractedField
  vehicle_mm_code?: ExtractedField
  vehicle_colour?: ExtractedField

  // ── Repairer quote fields ─────────────────────────────────────────────────
  repairer_name?: ExtractedField
  repairer_contact?: ExtractedField
  repairer_email?: ExtractedField
  quoted_total?: ExtractedField

  // ── Parts quote fields ────────────────────────────────────────────────────
  parts_supplier?: ExtractedField
  parts_total?: ExtractedField

  // ── MM / valuation fields ─────────────────────────────────────────────────
  retail_value?: ExtractedField
  trade_value?: ExtractedField
  market_value?: ExtractedField
  new_price?: ExtractedField
  valuation_date?: ExtractedField
  mm_code_valuation?: ExtractedField

  /** Any additional fields the AI found that don't map to known schema fields */
  additional_fields?: Record<string, ExtractedField>
}

/** Input to the ingest-document API */
export interface DocumentIngestionInput {
  /** The file to process */
  file: File
  /** Optional: attach result to an existing assessment */
  assessment_id?: string
  /** Optional: attach result to an existing case */
  case_id?: string
  /** Optional hint about what type of document to expect */
  expected_type?: DocumentType
}

/**
 * After the user reviews and confirms, this is what gets applied to the form.
 * Keys match ExtractionResult but values are plain strings (user-edited).
 */
export type ConfirmedFields = Partial<Record<keyof Omit<ExtractionResult, 'document_type' | 'document_type_confidence' | 'storage_path' | 'assessment_document_id' | 'additional_fields'>, string | null>>
