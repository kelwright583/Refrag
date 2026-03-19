export interface FieldSchema {
  key: string
  label: string
  type: 'text' | 'date' | 'number' | 'currency'
  required?: boolean
  isPii?: boolean
}

export const EXTRACTION_SCHEMAS: Record<string, FieldSchema[]> = {
  instruction: [
    { key: 'insurer_reference', label: 'Insurer Reference', type: 'text' },
    { key: 'policy_number', label: 'Policy Number', type: 'text' },
    { key: 'loss_date', label: 'Date of Loss', type: 'date' },
    { key: 'insured_name', label: 'Insured Name', type: 'text', isPii: true },
    { key: 'contact_phone', label: 'Contact Phone', type: 'text', isPii: true },
    { key: 'contact_email', label: 'Contact Email', type: 'text', isPii: true },
    { key: 'insurer_name', label: 'Insurer/Company', type: 'text' },
    { key: 'cover_type', label: 'Cover Type', type: 'text' },
    { key: 'appointment_date', label: 'Appointment Date', type: 'date' },
    { key: 'loss_address', label: 'Loss Location', type: 'text' },
    { key: 'excess_amount', label: 'Excess Amount', type: 'currency' },
    { key: 'broker_name', label: 'Broker', type: 'text' },
    { key: 'claims_technician', label: 'Claims Technician', type: 'text' },
    // Motor-specific
    { key: 'vehicle_registration', label: 'Vehicle Registration', type: 'text' },
    { key: 'vin', label: 'VIN/Chassis Number', type: 'text' },
    { key: 'engine_number', label: 'Engine Number', type: 'text' },
    { key: 'vehicle_make', label: 'Vehicle Make', type: 'text' },
    { key: 'vehicle_model', label: 'Vehicle Model', type: 'text' },
    { key: 'vehicle_year', label: 'Vehicle Year', type: 'text' },
    { key: 'vehicle_colour', label: 'Vehicle Colour', type: 'text' },
    { key: 'mm_code', label: 'MM Code', type: 'text' },
    // Property-specific
    { key: 'property_address', label: 'Property Address', type: 'text' },
    { key: 'erf_number', label: 'Erf/Stand Number', type: 'text' },
    { key: 'property_type', label: 'Property Type', type: 'text' },
  ],

  valuation_printout: [
    { key: 'retail_value', label: 'Retail Value', type: 'currency' },
    { key: 'trade_value', label: 'Trade Value', type: 'currency' },
    { key: 'market_value', label: 'Market Value', type: 'currency' },
    { key: 'replacement_value', label: 'Replacement Value', type: 'currency' },
    { key: 'new_price', label: 'New Price', type: 'currency' },
    { key: 'valuation_date', label: 'Valuation Date', type: 'date' },
    { key: 'provider_name', label: 'Provider', type: 'text' },
    { key: 'mm_code', label: 'MM Code', type: 'text' },
    { key: 'vehicle_make', label: 'Vehicle Make', type: 'text' },
    { key: 'vehicle_model', label: 'Vehicle Model', type: 'text' },
    { key: 'vehicle_year', label: 'Vehicle Year', type: 'text' },
  ],

  repairer_quote: [
    { key: 'repairer_name', label: 'Repairer Name', type: 'text' },
    { key: 'repairer_contact', label: 'Repairer Contact', type: 'text' },
    { key: 'repairer_email', label: 'Repairer Email', type: 'text' },
    { key: 'quote_number', label: 'Quote Number', type: 'text' },
    { key: 'quote_date', label: 'Quote Date', type: 'date' },
    { key: 'labour_total', label: 'Labour Total', type: 'currency' },
    { key: 'parts_total', label: 'Parts Total', type: 'currency' },
    { key: 'paint_total', label: 'Paint/Sundries Total', type: 'currency' },
    { key: 'quoted_total', label: 'Quote Total', type: 'currency' },
    { key: 'vat_amount', label: 'VAT', type: 'currency' },
    { key: 'total_incl_vat', label: 'Total incl. VAT', type: 'currency' },
    { key: 'vehicle_registration', label: 'Vehicle Registration', type: 'text' },
  ],

  parts_quote: [
    { key: 'supplier_name', label: 'Supplier Name', type: 'text' },
    { key: 'supplier_contact', label: 'Supplier Contact', type: 'text' },
    { key: 'quote_number', label: 'Quote Number', type: 'text' },
    { key: 'quote_date', label: 'Quote Date', type: 'date' },
    { key: 'parts_total', label: 'Parts Total', type: 'currency' },
    { key: 'vat_amount', label: 'VAT', type: 'currency' },
    { key: 'total_incl_vat', label: 'Total incl. VAT', type: 'currency' },
    { key: 'vehicle_registration', label: 'Vehicle Registration', type: 'text' },
  ],

  statement: [
    { key: 'deponent_name', label: 'Deponent Name', type: 'text', isPii: true },
    { key: 'deponent_id', label: 'Deponent ID Number', type: 'text', isPii: true },
    { key: 'statement_date', label: 'Statement Date', type: 'date' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'witness_name', label: 'Witness Name', type: 'text', isPii: true },
  ],

  evidence_photo: [
    { key: 'photo_date', label: 'Photo Date', type: 'date' },
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'description', label: 'Description', type: 'text' },
  ],

  other: [
    { key: 'document_title', label: 'Document Title', type: 'text' },
    { key: 'document_date', label: 'Document Date', type: 'date' },
    { key: 'reference_number', label: 'Reference Number', type: 'text' },
  ],
}

export type DocumentRole = keyof typeof EXTRACTION_SCHEMAS

export function getSchemaForRole(role: string): FieldSchema[] {
  return EXTRACTION_SCHEMAS[role] ?? EXTRACTION_SCHEMAS.other
}

export function getNonPiiFields(schema: FieldSchema[]): FieldSchema[] {
  return schema.filter((f) => !f.isPii)
}

export function getPiiFields(schema: FieldSchema[]): FieldSchema[] {
  return schema.filter((f) => f.isPii)
}
