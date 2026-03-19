import type { FieldSchema } from './extraction-schemas'

export interface MatchedField {
  value: string
  confidence: 'high' | 'medium' | 'low'
  source: string
}

/**
 * Label variations keyed by field key.
 * Each entry is an array of regex-safe label strings that might precede
 * the value in document text. The matcher tries each pattern in order.
 */
const LABEL_DICTIONARY: Record<string, string[]> = {
  // Instruction / case fields
  insurer_reference: [
    'insurer ref', 'claim ref', 'claim no', 'claim number', 'reference number',
    'reference no', 'our ref', 'your ref', 'file ref', 'file reference',
  ],
  policy_number: [
    'policy no', 'policy number', 'policy #', 'policy ref',
  ],
  loss_date: [
    'date of loss', 'loss date', 'incident date', 'date of incident',
    'date of accident', 'accident date',
  ],
  insured_name: [
    'insured', 'policyholder', 'policy holder', 'client name', 'name of insured',
  ],
  contact_phone: [
    'contact no', 'contact number', 'phone', 'tel', 'telephone', 'cell',
    'mobile', 'mobile no',
  ],
  contact_email: [
    'email', 'e-mail', 'email address',
  ],
  insurer_name: [
    'insurer', 'insurance company', 'underwriter', 'company name',
  ],
  cover_type: [
    'cover type', 'type of cover', 'section', 'cover section',
  ],
  appointment_date: [
    'appointment date', 'date of appointment', 'inspection date',
  ],
  loss_address: [
    'loss location', 'loss address', 'incident location', 'incident address',
    'location of loss', 'accident location',
  ],
  excess_amount: [
    'excess', 'excess amount', 'deductible',
  ],
  broker_name: [
    'broker', 'broker name', 'brokerage',
  ],
  claims_technician: [
    'claims technician', 'claims handler', 'handler', 'assigned to',
  ],

  // Vehicle fields
  vehicle_registration: [
    'registration', 'reg no', 'reg number', 'vehicle reg', 'license plate',
    'number plate', 'registration no',
  ],
  vin: [
    'vin', 'vin no', 'vin number', 'chassis', 'chassis no', 'chassis number',
  ],
  engine_number: [
    'engine no', 'engine number', 'engine #',
  ],
  vehicle_make: [
    'make', 'vehicle make', 'manufacturer',
  ],
  vehicle_model: [
    'model', 'vehicle model',
  ],
  vehicle_year: [
    'year', 'model year', 'year model', 'vehicle year',
  ],
  vehicle_colour: [
    'colour', 'color', 'vehicle colour', 'vehicle color',
  ],
  mm_code: [
    'mm code', 'mmcode', 'mm-code', "glass's code", 'glass code',
  ],

  // Property fields
  property_address: [
    'property address', 'risk address', 'street address', 'physical address',
  ],
  erf_number: [
    'erf', 'erf no', 'stand no', 'stand number', 'erf number',
  ],
  property_type: [
    'property type', 'building type', 'dwelling type',
  ],

  // Valuation fields
  retail_value: [
    'retail value', 'retail', 'retail price',
  ],
  trade_value: [
    'trade value', 'trade', 'trade price',
  ],
  market_value: [
    'market value', 'market', 'fair market value',
  ],
  replacement_value: [
    'replacement value', 'replacement', 'replacement cost',
  ],
  new_price: [
    'new price', 'new vehicle price', 'list price', 'on the road',
  ],
  valuation_date: [
    'valuation date', 'date of valuation', 'valued on', 'as at',
  ],
  provider_name: [
    'provider', 'valuation provider', 'valued by', 'source',
  ],

  // Quote fields
  repairer_name: [
    'repairer', 'repairer name', 'workshop', 'body shop', 'panel beater',
  ],
  repairer_contact: [
    'repairer contact', 'repairer tel', 'repairer phone', 'workshop tel',
  ],
  repairer_email: [
    'repairer email', 'workshop email',
  ],
  quote_number: [
    'quote no', 'quote number', 'quotation no', 'quotation number', 'estimate no',
  ],
  quote_date: [
    'quote date', 'quotation date', 'estimate date', 'date of quote',
  ],
  labour_total: [
    'labour total', 'labor total', 'total labour', 'total labor',
  ],
  parts_total: [
    'parts total', 'total parts',
  ],
  paint_total: [
    'paint total', 'sundries total', 'paint & sundries', 'paint/sundries',
  ],
  quoted_total: [
    'total', 'grand total', 'quote total', 'sub total', 'subtotal',
    'total excl', 'total excluding vat',
  ],
  vat_amount: [
    'vat', 'vat amount', 'tax',
  ],
  total_incl_vat: [
    'total incl', 'total including vat', 'amount due', 'balance due',
  ],
  supplier_name: [
    'supplier', 'supplier name', 'parts supplier', 'vendor',
  ],
  supplier_contact: [
    'supplier contact', 'supplier tel', 'supplier phone',
  ],

  // Statement fields
  deponent_name: [
    'deponent', 'deponent name', 'i the undersigned', 'name of deponent',
    'full name',
  ],
  deponent_id: [
    'identity number', 'id number', 'id no',
  ],
  statement_date: [
    'statement date', 'date of statement', 'signed on', 'dated',
  ],
  witness_name: [
    'witness', 'witness name',
  ],

  // Generic
  document_title: [
    'title', 'document title', 'subject', 're:',
  ],
  document_date: [
    'date', 'document date',
  ],
  reference_number: [
    'reference', 'ref', 'ref no', 'reference number',
  ],
}

/**
 * Build a regex that matches "Label" followed by a delimiter and captures the value.
 * Handles patterns like:
 *   "Policy No: 12345"
 *   "Policy No  12345"
 *   "Policy No.:12345"
 */
function buildLabelRegex(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `(?:^|\\n)\\s*${escaped}[\\s.:;\\-]*\\s*([^\\n]{1,200})`,
    'i',
  )
}

/**
 * Extract a value for a single field by searching text for known label patterns.
 * Returns null if no match found.
 */
function matchField(
  text: string,
  fieldKey: string,
): MatchedField | null {
  const labels = LABEL_DICTIONARY[fieldKey]
  if (!labels) return null

  // Try exact label matches first (high confidence)
  for (const label of labels) {
    const regex = buildLabelRegex(label)
    const match = regex.exec(text)
    if (match?.[1]?.trim()) {
      const value = match[1].trim()
      if (value.length > 0 && value.length < 200) {
        return {
          value,
          confidence: 'high',
          source: `label: "${label}"`,
        }
      }
    }
  }

  // Try looser matching: label anywhere in a line (medium confidence)
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const looseRegex = new RegExp(
      `${escaped}[\\s.:;\\-]*\\s*([^\\n]{1,200})`,
      'i',
    )
    const match = looseRegex.exec(text)
    if (match?.[1]?.trim()) {
      const value = match[1].trim()
      if (value.length > 0 && value.length < 200) {
        return {
          value,
          confidence: 'medium',
          source: `fuzzy label: "${label}"`,
        }
      }
    }
  }

  return null
}

/**
 * Run rule-based field extraction across all fields in a schema.
 * Returns a map of field key → matched field for every field found.
 */
export function matchLabels(
  text: string,
  schema: FieldSchema[],
): Record<string, MatchedField> {
  const results: Record<string, MatchedField> = {}

  for (const field of schema) {
    const matched = matchField(text, field.key)
    if (matched) {
      results[field.key] = matched
    }
  }

  return results
}
