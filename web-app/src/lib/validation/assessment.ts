import { z } from 'zod'

// Shared enums
const assessmentOutcome = z.enum([
  'repairable', 'write_off', 'theft_total', 'partial_theft', 'rejected', 'further_investigation',
])
const assessmentSequence = z.enum(['initial', 'supplementary', 're_inspection'])
const assessmentType = z.enum(['physical', 'digital', 'desktop'])
const assessmentStatus = z.enum(['draft', 'ready', 'submitted'])
const damageDirection = z.enum(['front', 'rear', 'left', 'right', 'rollover', 'multiple', 'underbody'])
const tyrePosition = z.enum(['RF', 'LF', 'RR', 'LR'])
const tyreCondition = z.enum(['good', 'worn', 'damaged', 'unknown'])
const windscreenCondition = z.enum(['intact', 'cracked', 'damaged'])
const wheelType = z.enum(['factory', 'alloy', 'aftermarket', 'unknown'])
const accessoryStatus = z.enum(['factory_fitted', 'aftermarket', 'none', 'unknown'])
const brakeCondition = z.enum(['good', 'fair', 'worn', 'unknown'])
const damageSeverity = z.enum(['minor', 'moderate', 'severe'])
const operationType = z.enum(['panel', 'mechanical', 'electrical', 'paint', 'structural', 'trim', 'glass', 'other'])
const valuationSource = z.enum(['mm_guide', 'evalue8', 'transunion', 'other'])

// ============================================================================
// Motor Assessment
// ============================================================================

export const createMotorAssessmentSchema = z.object({
  case_id: z.string().uuid(),
  assessment_sequence: assessmentSequence.optional().default('initial'),
  parent_assessment_id: z.string().uuid().optional(),
  assessment_type: assessmentType.optional().default('physical'),
  insurer_name: z.string().optional(),
  insurer_email: z.string().email().optional().or(z.literal('')),
  claim_number: z.string().optional(),
  date_of_loss: z.string().optional(),
  claims_technician: z.string().optional(),
  assessor_name: z.string().optional(),
  assessor_contact: z.string().optional(),
  date_assessed: z.string().optional(),
  assessment_location: z.string().optional(),
  vehicle_stripped: z.boolean().optional().default(false),
  insured_name: z.string().optional(),
  insured_contact: z.string().optional(),
  policy_number: z.string().optional(),
})

export const updateMotorAssessmentSchema = z.object({
  status: assessmentStatus.optional(),
  assessment_type: assessmentType.optional(),
  insurer_name: z.string().optional(),
  insurer_email: z.string().email().optional().or(z.literal('')),
  claim_number: z.string().optional(),
  date_of_loss: z.string().optional(),
  claims_technician: z.string().optional(),
  assessor_name: z.string().optional(),
  assessor_contact: z.string().optional(),
  date_assessed: z.string().optional(),
  assessment_location: z.string().optional(),
  vehicle_stripped: z.boolean().optional(),
  insured_name: z.string().optional(),
  insured_contact: z.string().optional(),
  policy_number: z.string().optional(),
  outcome: assessmentOutcome.optional(),
  outcome_notes: z.string().optional(),
})

// ============================================================================
// Vehicle Details
// ============================================================================

export const upsertVehicleDetailsSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  year_model: z.number().int().min(1900).max(2100).optional(),
  reg_number: z.string().optional(),
  vin_number: z.string().optional(),
  engine_number: z.string().optional(),
  mileage: z.number().int().min(0).nullable().optional(),
  mileage_unknown: z.boolean().optional(),
  mm_code: z.string().optional(),
  transmission: z.string().optional(),
  colour: z.string().optional(),
  windscreen: windscreenCondition.optional(),
  wheels: wheelType.optional(),
  spare_wheel: accessoryStatus.optional(),
  air_conditioning: accessoryStatus.optional(),
  radio: accessoryStatus.optional(),
  brakes: brakeCondition.optional(),
  vehicle_notes: z.string().optional(),
  damage_direction: damageDirection.optional(),
  damage_description: z.string().optional(),
})

// ============================================================================
// Tyre Details
// ============================================================================

export const upsertTyreDetailSchema = z.object({
  position: tyrePosition,
  make: z.string().optional(),
  size: z.string().optional(),
  tread_mm: z.number().min(0).max(20).optional(),
  condition: tyreCondition.optional().default('unknown'),
  comments: z.string().optional(),
})

export const upsertTyreDetailsSchema = z.array(upsertTyreDetailSchema).min(1).max(4)

// ============================================================================
// Pre-existing Damages
// ============================================================================

export const createPreExistingDamageSchema = z.object({
  location: z.string().min(1, 'Location is required'),
  description: z.string().optional(),
  severity: damageSeverity.optional().default('minor'),
  photo_evidence_id: z.string().uuid().optional(),
})

// ============================================================================
// Vehicle Values
// ============================================================================

export const upsertVehicleValuesSchema = z.object({
  source: valuationSource.optional().default('mm_guide'),
  valuation_date: z.string().optional(),
  new_price_value: z.number().min(0).optional(),
  retail_value: z.number().min(0).optional(),
  trade_value: z.number().min(0).optional(),
  market_value: z.number().min(0).optional(),
  extras_value: z.number().min(0).optional().default(0),
  less_old_damages: z.number().min(0).optional().default(0),
  vehicle_total_value: z.number().min(0).optional(),
  max_repair_percentage: z.number().min(0).max(100).optional().default(75),
  max_repair_value: z.number().min(0).optional(),
  max_repair_value_override: z.boolean().optional(),
  salvage_value: z.number().min(0).optional(),
})

// ============================================================================
// Repair Assessment
// ============================================================================

export const upsertRepairAssessmentSchema = z.object({
  repairer_name: z.string().optional(),
  repairer_contact: z.string().optional(),
  repairer_email: z.string().email().optional().or(z.literal('')),
  approved_repairer: z.boolean().optional(),
  quoted_amount: z.number().min(0).optional(),
  assessed_repair_total_excl_vat: z.number().min(0).optional(),
  betterment_incl_vat: z.number().min(0).optional().default(0),
  is_uneconomical: z.boolean().optional(),
})

// ============================================================================
// Repair Line Items
// ============================================================================

export const createRepairLineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  operation_type: operationType.optional().default('other'),
  qty: z.number().int().min(1).optional().default(1),
  parts_cost: z.number().min(0).optional().default(0),
  labour_hours: z.number().min(0).optional().default(0),
  labour_rate: z.number().min(0).optional().default(0),
  paint_cost: z.number().min(0).optional().default(0),
  paint_materials_cost: z.number().min(0).optional().default(0),
  strip_assm_cost: z.number().min(0).optional().default(0),
  frame_cost: z.number().min(0).optional().default(0),
  misc_cost: z.number().min(0).optional().default(0),
  is_sublet: z.boolean().optional().default(false),
  sublet_supplier: z.string().optional(),
  betterment_applicable: z.boolean().optional().default(false),
  betterment_percentage: z.number().min(0).max(100).optional().default(0),
  is_approved: z.boolean().optional().default(true),
  notes: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
})

export const updateRepairLineItemSchema = createRepairLineItemSchema.partial()

// ============================================================================
// Parts Assessment
// ============================================================================

export const upsertPartsAssessmentSchema = z.object({
  supplier_name: z.string().optional(),
  supplier_contact: z.string().optional(),
  supplier_email: z.string().email().optional().or(z.literal('')),
  notes_on_parts: z.string().optional(),
  parts_amount_excl_vat: z.number().min(0).optional().default(0),
  parts_handling_fee_excl_vat: z.number().min(0).optional().default(0),
})

// ============================================================================
// Claim Financials
// ============================================================================

export const upsertClaimFinancialsSchema = z.object({
  total_excl_vat: z.number().min(0).optional(),
  vat_rate: z.number().min(0).max(100).optional().default(15),
  vat_amount: z.number().min(0).optional(),
  total_incl_vat: z.number().min(0).optional(),
  less_excess: z.number().min(0).nullable().optional(),
  excess_tba: z.boolean().optional(),
  grand_total: z.number().optional(),
  settlement_value: z.number().min(0).optional(),
  less_salvage: z.number().min(0).optional(),
  net_settlement: z.number().optional(),
  has_manual_override: z.boolean().optional(),
})

// ============================================================================
// Report Evidence Links
// ============================================================================

export const createReportEvidenceLinkSchema = z.object({
  evidence_id: z.string().uuid(),
  report_section: z.string().min(1),
  display_order: z.number().int().min(0).optional().default(0),
  caption: z.string().optional(),
})

// ============================================================================
// Assessment Settings
// ============================================================================

export const updateAssessmentSettingsSchema = z.object({
  logo_storage_path: z.string().optional(),
  company_registration: z.string().optional(),
  vat_registration: z.string().optional(),
  report_disclaimer: z.string().optional(),
  without_prejudice_default: z.boolean().optional(),
  max_repair_percentage: z.number().min(0).max(100).optional(),
  vat_rate: z.number().min(0).max(100).optional(),
  parts_handling_fee_percentage: z.number().min(0).max(100).optional(),
  labour_rate_panel: z.number().min(0).optional(),
  labour_rate_mechanical: z.number().min(0).optional(),
  labour_rate_electrical: z.number().min(0).optional(),
  labour_rate_paint: z.number().min(0).optional(),
  labour_rate_structural: z.number().min(0).optional(),
  labour_rate_trim: z.number().min(0).optional(),
  labour_rate_glass: z.number().min(0).optional(),
  betterment_wear_table: z.record(z.unknown()).optional(),
  fraud_indicator_items: z.array(z.string()).optional(),
  assessment_types_available: z.array(assessmentType).optional(),
})

// ============================================================================
// Approved Repairers / Preferred Suppliers
// ============================================================================

export const createApprovedRepairerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
})

export const createPreferredSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contact_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
})
