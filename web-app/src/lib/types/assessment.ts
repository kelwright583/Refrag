export type AssessmentOutcome =
  | 'repairable'
  | 'write_off'
  | 'theft_total'
  | 'partial_theft'
  | 'rejected'
  | 'further_investigation'

export type AssessmentSequence = 'initial' | 'supplementary' | 're_inspection'

export type AssessmentType = 'physical' | 'digital' | 'desktop'

export type AssessmentStatus = 'draft' | 'ready' | 'submitted'

export type DamageDirection =
  | 'front'
  | 'rear'
  | 'left'
  | 'right'
  | 'rollover'
  | 'multiple'
  | 'underbody'

export type TyrePosition = 'RF' | 'LF' | 'RR' | 'LR'
export type TyreCondition = 'good' | 'worn' | 'damaged' | 'unknown'

export type WindscreenCondition = 'intact' | 'cracked' | 'damaged'
export type WheelType = 'factory' | 'alloy' | 'aftermarket' | 'unknown'
export type AccessoryStatus = 'factory_fitted' | 'aftermarket' | 'none' | 'unknown'
export type BrakeCondition = 'good' | 'fair' | 'worn' | 'unknown'
export type DamageSeverity = 'minor' | 'moderate' | 'severe'

export type OperationType =
  | 'panel'
  | 'mechanical'
  | 'electrical'
  | 'paint'
  | 'structural'
  | 'trim'
  | 'glass'
  | 'other'

export type ValuationSource = 'mm_guide' | 'evalue8' | 'transunion' | 'other'

export type OcrDocumentType =
  | 'assessment_report'
  | 'mm_valuation'
  | 'repair_estimate'
  | 'parts_quote'
  | 'other'

export type OcrStatus = 'pending' | 'processing' | 'complete' | 'failed'

// ============================================================================
// Motor Assessment (root record)
// ============================================================================

export interface MotorAssessment {
  id: string
  case_id: string
  org_id: string
  created_by: string
  status: AssessmentStatus
  assessment_sequence: AssessmentSequence
  parent_assessment_id: string | null
  sequence_number: number
  assessment_type: AssessmentType
  insurer_name: string | null
  insurer_email: string | null
  claim_number: string | null
  date_of_loss: string | null
  claims_technician: string | null
  assessor_name: string | null
  assessor_contact: string | null
  date_assessed: string | null
  assessment_location: string | null
  vehicle_stripped: boolean
  insured_name: string | null
  insured_contact: string | null
  policy_number: string | null
  outcome: AssessmentOutcome | null
  outcome_notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateMotorAssessmentInput {
  case_id: string
  assessment_sequence?: AssessmentSequence
  parent_assessment_id?: string
  assessment_type?: AssessmentType
  insurer_name?: string
  insurer_email?: string
  claim_number?: string
  date_of_loss?: string
  claims_technician?: string
  assessor_name?: string
  assessor_contact?: string
  date_assessed?: string
  assessment_location?: string
  vehicle_stripped?: boolean
  insured_name?: string
  insured_contact?: string
  policy_number?: string
}

export interface UpdateMotorAssessmentInput {
  status?: AssessmentStatus
  assessment_type?: AssessmentType
  insurer_name?: string
  insurer_email?: string
  claim_number?: string
  date_of_loss?: string
  claims_technician?: string
  assessor_name?: string
  assessor_contact?: string
  date_assessed?: string
  assessment_location?: string
  vehicle_stripped?: boolean
  insured_name?: string
  insured_contact?: string
  policy_number?: string
  outcome?: AssessmentOutcome
  outcome_notes?: string
}

// ============================================================================
// Vehicle Details
// ============================================================================

export interface VehicleDetails {
  id: string
  assessment_id: string
  org_id: string
  make: string | null
  model: string | null
  year_model: number | null
  reg_number: string | null
  vin_number: string | null
  engine_number: string | null
  identifier_type: string | null
  identifier_value: string | null
  mileage: number | null
  mileage_unknown: boolean
  mm_code: string | null
  transmission: string | null
  colour: string | null
  windscreen: WindscreenCondition
  wheels: WheelType
  spare_wheel: AccessoryStatus
  air_conditioning: AccessoryStatus
  radio: AccessoryStatus
  brakes: BrakeCondition
  vehicle_notes: string | null
  damage_direction: DamageDirection | null
  damage_description: string | null
  created_at: string
  updated_at: string
}

export interface UpsertVehicleDetailsInput {
  make?: string
  model?: string
  year_model?: number
  reg_number?: string
  vin_number?: string
  engine_number?: string
  mileage?: number | null
  mileage_unknown?: boolean
  mm_code?: string
  transmission?: string
  colour?: string
  windscreen?: WindscreenCondition
  wheels?: WheelType
  spare_wheel?: AccessoryStatus
  air_conditioning?: AccessoryStatus
  radio?: AccessoryStatus
  brakes?: BrakeCondition
  vehicle_notes?: string
  damage_direction?: DamageDirection
  damage_description?: string
}

// ============================================================================
// Tyre Details
// ============================================================================

export interface TyreDetail {
  id: string
  assessment_id: string
  org_id: string
  position: TyrePosition
  make: string | null
  size: string | null
  tread_mm: number | null
  condition: TyreCondition
  comments: string | null
  created_at: string
  updated_at: string
}

export interface UpsertTyreDetailInput {
  position: TyrePosition
  make?: string
  size?: string
  tread_mm?: number
  condition?: TyreCondition
  comments?: string
}

// ============================================================================
// Pre-existing Damages
// ============================================================================

export interface PreExistingDamage {
  id: string
  assessment_id: string
  org_id: string
  location: string
  description: string | null
  severity: DamageSeverity
  photo_evidence_id: string | null
  created_at: string
  updated_at: string
}

export interface CreatePreExistingDamageInput {
  location: string
  description?: string
  severity?: DamageSeverity
  photo_evidence_id?: string
}

// ============================================================================
// Vehicle Values
// ============================================================================

export interface VehicleValues {
  id: string
  assessment_id: string
  org_id: string
  source: ValuationSource
  valuation_date: string | null
  new_price_value: number | null
  retail_value: number | null
  trade_value: number | null
  market_value: number | null
  extras_value: number
  less_old_damages: number
  vehicle_total_value: number | null
  max_repair_percentage: number
  max_repair_value: number | null
  max_repair_value_override: boolean
  salvage_value: number | null
  created_at: string
  updated_at: string
}

export interface UpsertVehicleValuesInput {
  source?: ValuationSource
  valuation_date?: string
  new_price_value?: number
  retail_value?: number
  trade_value?: number
  market_value?: number
  extras_value?: number
  less_old_damages?: number
  vehicle_total_value?: number
  max_repair_percentage?: number
  max_repair_value?: number
  max_repair_value_override?: boolean
  salvage_value?: number
}

// ============================================================================
// Repair Assessment
// ============================================================================

export interface RepairAssessment {
  id: string
  assessment_id: string
  org_id: string
  repairer_name: string | null
  repairer_contact: string | null
  repairer_email: string | null
  approved_repairer: boolean
  quoted_amount: number | null
  assessed_repair_total_excl_vat: number | null
  betterment_incl_vat: number
  is_uneconomical: boolean
  created_at: string
  updated_at: string
}

export interface UpsertRepairAssessmentInput {
  repairer_name?: string
  repairer_contact?: string
  repairer_email?: string
  approved_repairer?: boolean
  quoted_amount?: number
  assessed_repair_total_excl_vat?: number
  betterment_incl_vat?: number
  is_uneconomical?: boolean
}

// ============================================================================
// Repair Line Items
// ============================================================================

export interface RepairLineItem {
  id: string
  assessment_id: string
  org_id: string
  repair_assessment_id: string
  order_index: number
  description: string
  operation_type: OperationType
  qty: number
  parts_cost: number
  labour_hours: number
  labour_rate: number
  labour_cost: number
  paint_cost: number
  paint_materials_cost: number
  strip_assm_cost: number
  frame_cost: number
  misc_cost: number
  is_sublet: boolean
  sublet_supplier: string | null
  betterment_applicable: boolean
  betterment_percentage: number
  is_approved: boolean
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CreateRepairLineItemInput {
  description: string
  operation_type?: OperationType
  qty?: number
  parts_cost?: number
  labour_hours?: number
  labour_rate?: number
  paint_cost?: number
  paint_materials_cost?: number
  strip_assm_cost?: number
  frame_cost?: number
  misc_cost?: number
  is_sublet?: boolean
  sublet_supplier?: string
  betterment_applicable?: boolean
  betterment_percentage?: number
  is_approved?: boolean
  notes?: string
  order_index?: number
}

export interface UpdateRepairLineItemInput extends Partial<CreateRepairLineItemInput> {}

// ============================================================================
// Parts Assessment
// ============================================================================

export interface PartsAssessment {
  id: string
  assessment_id: string
  org_id: string
  supplier_name: string | null
  supplier_contact: string | null
  supplier_email: string | null
  notes_on_parts: string | null
  parts_amount_excl_vat: number
  parts_handling_fee_excl_vat: number
  created_at: string
  updated_at: string
}

export interface UpsertPartsAssessmentInput {
  supplier_name?: string
  supplier_contact?: string
  supplier_email?: string
  notes_on_parts?: string
  parts_amount_excl_vat?: number
  parts_handling_fee_excl_vat?: number
}

// ============================================================================
// Claim Financials
// ============================================================================

export interface ClaimFinancials {
  id: string
  assessment_id: string
  org_id: string
  total_excl_vat: number
  vat_rate: number
  vat_amount: number
  total_incl_vat: number
  less_excess: number | null
  excess_tba: boolean
  grand_total: number
  settlement_value: number | null
  less_salvage: number | null
  net_settlement: number | null
  has_manual_override: boolean
  created_at: string
  updated_at: string
}

export interface UpsertClaimFinancialsInput {
  total_excl_vat?: number
  vat_rate?: number
  vat_amount?: number
  total_incl_vat?: number
  less_excess?: number | null
  excess_tba?: boolean
  grand_total?: number
  settlement_value?: number
  less_salvage?: number
  net_settlement?: number
  has_manual_override?: boolean
}

// ============================================================================
// Assessment Documents (OCR)
// ============================================================================

export interface AssessmentDocument {
  id: string
  assessment_id: string
  org_id: string
  evidence_id: string | null
  document_type: OcrDocumentType
  ocr_status: OcrStatus
  raw_ocr_text: string | null
  extracted_fields: Record<string, unknown>
  confidence_score: number | null
  reviewed_by: string | null
  reviewed_at: string | null
  applied_to_assessment: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Report Evidence Links
// ============================================================================

export interface ReportEvidenceLink {
  id: string
  assessment_id: string
  org_id: string
  evidence_id: string
  report_section: string
  display_order: number
  caption: string | null
  created_at: string
  updated_at: string
}

export interface CreateReportEvidenceLinkInput {
  evidence_id: string
  report_section: string
  display_order?: number
  caption?: string
}

// ============================================================================
// Assessment Settings (per-org)
// ============================================================================

export interface AssessmentSettings {
  id: string
  org_id: string
  logo_storage_path: string | null
  company_registration: string | null
  vat_registration: string | null
  report_disclaimer: string | null
  without_prejudice_default: boolean
  max_repair_percentage: number
  vat_rate: number
  parts_handling_fee_percentage: number
  labour_rate_panel: number
  labour_rate_mechanical: number
  labour_rate_electrical: number
  labour_rate_paint: number
  labour_rate_structural: number
  labour_rate_trim: number
  labour_rate_glass: number
  betterment_wear_table: Record<string, unknown>
  fraud_indicator_items: string[]
  assessment_types_available: AssessmentType[]
  created_at: string
  updated_at: string
}

export interface UpdateAssessmentSettingsInput {
  logo_storage_path?: string
  company_registration?: string
  vat_registration?: string
  report_disclaimer?: string
  without_prejudice_default?: boolean
  max_repair_percentage?: number
  vat_rate?: number
  parts_handling_fee_percentage?: number
  labour_rate_panel?: number
  labour_rate_mechanical?: number
  labour_rate_electrical?: number
  labour_rate_paint?: number
  labour_rate_structural?: number
  labour_rate_trim?: number
  labour_rate_glass?: number
  betterment_wear_table?: Record<string, unknown>
  fraud_indicator_items?: string[]
  assessment_types_available?: AssessmentType[]
}

// ============================================================================
// Approved Repairers / Preferred Suppliers
// ============================================================================

export interface ApprovedRepairer {
  id: string
  org_id: string
  name: string
  contact_number: string | null
  email: string | null
  address: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PreferredPartsSupplier {
  id: string
  org_id: string
  name: string
  contact_number: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Report Versions (immutable snapshots)
// ============================================================================

export interface ReportVersion {
  id: string
  assessment_id: string
  org_id: string
  created_by: string
  version_number: number
  snapshot_data: Record<string, unknown>
  created_at: string
}

// ============================================================================
// Composite types (full assessment with all related data)
// ============================================================================

export interface FullMotorAssessment extends MotorAssessment {
  vehicle_details: VehicleDetails | null
  tyre_details: TyreDetail[]
  pre_existing_damages: PreExistingDamage[]
  vehicle_values: VehicleValues | null
  repair_assessment: RepairAssessment | null
  repair_line_items: RepairLineItem[]
  parts_assessment: PartsAssessment | null
  claim_financials: ClaimFinancials | null
  assessment_documents: AssessmentDocument[]
  report_evidence_links: ReportEvidenceLink[]
}
