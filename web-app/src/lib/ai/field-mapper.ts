/**
 * Field Mapper — maps raw AI output field names to our ExtractionResult schema.
 *
 * Insurers use different label conventions across instructions and quotes.
 * This mapper normalises them regardless of source format.
 */

import type { ExtractionResult, ExtractedField, FieldConfidence } from '@/lib/types/ingestion'

/** Aliases that different insurers use for each canonical field */
const FIELD_ALIASES: Record<keyof Omit<ExtractionResult, 'document_type' | 'document_type_confidence' | 'storage_path' | 'assessment_document_id' | 'additional_fields'>, string[]> = {
  claim_reference:     ['claim number', 'claim no', 'claim ref', 'seb claim number', 'claim_number', 'reference number', 'case number', 'file number'],
  insurer_name:        ['insurer', 'insurance company', 'underwriter', 'insured by', 'insurance'],
  broker_name:         ['broker', 'broker name', 'intermediary', 'agent'],
  loss_date:           ['date of loss', 'loss date', 'incident date', 'accident date', 'date of incident', 'date of accident'],

  insured_name:        ['insured', 'the insured', 'policy holder', 'policyholder', 'client', 'name of insured'],
  insured_contact:     ['phone', 'cell', 'contact number', 'telephone', 'mobile'],
  policy_number:       ['policy number', 'policy no', 'policy_number', 'policy ref'],

  insurer_email:       ['insurer email', 'claims email', 'contact email'],
  claims_technician:   ['claims technician', 'handler', 'claims handler', 'appointed by', 'contact person at insurer'],
  assessment_location: ['area of operation', 'area', 'location', 'region', 'assessment location', 'province'],
  cover_type:          ['cover', 'cover type', 'type of cover', 'policy type', 'cover section'],
  excess_amount:       ['basic excess', 'excess', 'excess applicable', 'compulsory excess', 'basic excess applicable'],
  excess_note:         ['excess note', 'excess condition', 'excess comment'],
  primary_use:         ['primary use', 'use', 'vehicle use', 'use of vehicle', 'driver category'],

  vehicle_make:        ['vehicle make', 'make', 'manufacturer'],
  vehicle_model:       ['vehicle model', 'model', 'model description'],
  vehicle_year:        ['vehicle year', 'year', 'year of manufacture', 'year model'],
  vehicle_reg:         ['registration', 'reg number', 'registration number', 'vehicle registration', 'license plate'],
  vehicle_vin:         ['vin', 'vin number', 'chassis number', 'chassis', 'vin_number'],
  vehicle_engine_number: ['engine number', 'engine no', 'engine_number'],
  vehicle_mm_code:     ['mm code', 'mmcode', 'mm_code', 'transunion code', 'vehicle code', 'glass code', 'identifier code', 'kbb code'],
  vehicle_identifier_type: ['identifier type', 'code type', 'valuation source type'],
  vehicle_identifier_value: ['identifier value', 'identifier', 'vehicle identifier'],
  vehicle_colour:      ['colour', 'color', 'vehicle colour', 'vehicle color'],

  repairer_name:       ['repairer', 'repairer name', 'workshop', 'panel shop', 'repair shop'],
  repairer_contact:    ['repairer contact', 'workshop contact', 'repairer phone'],
  repairer_email:      ['repairer email', 'workshop email'],
  quoted_total:        ['quoted amount', 'quote total', 'total quoted', 'total repair cost', 'quote amount'],

  parts_supplier:      ['supplier', 'parts supplier', 'supplier name'],
  parts_total:         ['parts total', 'parts amount', 'total parts'],

  retail_value:        ['retail value', 'retail', 'retail price'],
  trade_value:         ['trade value', 'trade', 'trade price'],
  market_value:        ['market value', 'market', 'average market value'],
  new_price:           ['new price', 'otr', 'on the road', 'new vehicle price', 'list price'],
  valuation_date:      ['valuation date', 'date of valuation', 'guide date', 'date'],
  mm_code_valuation:   ['mm code', 'mmcode', 'vehicle code', 'glass code', 'identifier code', 'kbb code'],
}

/** Normalise a label key for fuzzy matching */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Map a raw AI output object (keys = whatever labels the AI used)
 * to our canonical ExtractionResult field names.
 */
export function mapAIFields(
  rawFields: Record<string, { value: string | null; confidence: string; context?: string }>
): Partial<ExtractionResult> {
  const result: Partial<ExtractionResult> = {}
  const unmapped: Record<string, ExtractedField> = {}

  for (const [rawKey, rawField] of Object.entries(rawFields)) {
    const normKey = normalise(rawKey)
    let matched = false

    for (const [canonicalKey, aliases] of Object.entries(FIELD_ALIASES)) {
      const normAliases = aliases.map(normalise)
      if (normAliases.some((a) => a === normKey || normKey.includes(a) || a.includes(normKey))) {
        const existing = result[canonicalKey as keyof ExtractionResult] as ExtractedField | undefined
        const incoming: ExtractedField = {
          value: rawField.value,
          confidence: (rawField.confidence as FieldConfidence) ?? 'medium',
          context: rawField.context,
        }
        // Keep higher-confidence value if field already mapped
        if (!existing || confidenceRank(incoming.confidence) > confidenceRank(existing.confidence)) {
          ;(result as any)[canonicalKey] = incoming
        }
        matched = true
        break
      }
    }

    if (!matched && rawField.value !== null) {
      unmapped[rawKey] = {
        value: rawField.value,
        confidence: (rawField.confidence as FieldConfidence) ?? 'low',
        context: rawField.context,
      }
    }
  }

  if (Object.keys(unmapped).length > 0) {
    result.additional_fields = unmapped
  }

  return result
}

function confidenceRank(c: FieldConfidence): number {
  return { high: 3, medium: 2, low: 1, not_found: 0 }[c] ?? 0
}

/**
 * Extract PII fields (insured name, contact, policy number) from raw OCR text
 * using local regex — these values are NEVER sent to AI.
 */
export function extractPIILocally(rawText: string): Pick<ExtractionResult, 'insured_name' | 'insured_contact' | 'policy_number'> {
  const result: Pick<ExtractionResult, 'insured_name' | 'insured_contact' | 'policy_number'> = {}

  // Policy number — typically labelled "Policy Number: 123456"
  const policyMatch = rawText.match(/policy\s*(?:number|no\.?|num)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i)
  if (policyMatch?.[1]) {
    result.policy_number = { value: policyMatch[1].trim(), confidence: 'high', is_pii: true }
  }

  // Phone number — international format (+XX...) or local (leading 0), min 7 digits
  const phoneMatch = rawText.match(/(?:\+\d{1,3}[\s\-]?)?(?:\(?\d{1,4}\)?[\s\-]?)?\d{2,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}/)
  if (phoneMatch?.[0] && phoneMatch[0].replace(/\D/g, '').length >= 7) {
    result.insured_contact = { value: phoneMatch[0].replace(/\s/g, ''), confidence: 'high', is_pii: true }
  }

  // Insured name — look for label patterns like "The Insured: John Smith" or "Insured: Surname, Name"
  const nameMatch = rawText.match(/(?:the\s+insured|insured\s+name|policy\s+holder)\s*[:\-]?\s*([A-Za-z][A-Za-z\s,\.]{2,40})/i)
  if (nameMatch?.[1]) {
    const name = nameMatch[1].trim().replace(/\s+/g, ' ')
    if (name.length > 2 && name.length < 60) {
      result.insured_name = { value: name, confidence: 'medium', is_pii: true }
    }
  }

  return result
}
