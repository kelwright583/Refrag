-- ============================================================================
-- PHASE 7: ASSESSMENT REPORT ENGINE — SCHEMA MIGRATION
-- Run AFTER the base schema.sql has been applied.
-- ============================================================================

-- ============================================================================
-- NEW ENUM TYPES
-- ============================================================================

CREATE TYPE assessment_outcome AS ENUM (
  'repairable',
  'write_off',
  'theft_total',
  'partial_theft',
  'rejected',
  'further_investigation'
);

CREATE TYPE assessment_sequence AS ENUM (
  'initial',
  'supplementary',
  're_inspection'
);

CREATE TYPE assessment_type AS ENUM (
  'physical',
  'digital',
  'desktop'
);

CREATE TYPE damage_direction AS ENUM (
  'front',
  'rear',
  'left',
  'right',
  'rollover',
  'multiple',
  'underbody'
);

CREATE TYPE tyre_position AS ENUM ('RF', 'LF', 'RR', 'LR');

CREATE TYPE tyre_condition AS ENUM ('good', 'worn', 'damaged', 'unknown');

CREATE TYPE windscreen_condition AS ENUM ('intact', 'cracked', 'damaged');

CREATE TYPE wheel_type AS ENUM ('factory', 'alloy', 'aftermarket', 'unknown');

CREATE TYPE accessory_status AS ENUM ('factory_fitted', 'aftermarket', 'none', 'unknown');

CREATE TYPE brake_condition AS ENUM ('good', 'fair', 'worn', 'unknown');

CREATE TYPE damage_severity AS ENUM ('minor', 'moderate', 'severe');

CREATE TYPE doc_type_ocr AS ENUM (
  'assessment_report',
  'mm_valuation',
  'repair_estimate',
  'parts_quote',
  'other'
);

CREATE TYPE ocr_status AS ENUM (
  'pending',
  'processing',
  'complete',
  'failed'
);

CREATE TYPE operation_type AS ENUM (
  'panel',
  'mechanical',
  'electrical',
  'paint',
  'structural',
  'trim',
  'glass',
  'other'
);

CREATE TYPE valuation_source AS ENUM (
  'mm_guide',
  'evalue8',
  'transunion',
  'other'
);

-- Add claim_type to cases table for future property/liability branching
ALTER TABLE cases ADD COLUMN IF NOT EXISTS claim_type TEXT NOT NULL DEFAULT 'motor';

-- ============================================================================
-- ASSESSMENT TABLES
-- ============================================================================

-- 1. motor_assessments — root record per assessment
CREATE TABLE motor_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  status report_status NOT NULL DEFAULT 'draft',

  assessment_sequence assessment_sequence NOT NULL DEFAULT 'initial',
  parent_assessment_id UUID REFERENCES motor_assessments(id) ON DELETE SET NULL,
  sequence_number INTEGER NOT NULL DEFAULT 1,

  assessment_type assessment_type NOT NULL DEFAULT 'physical',
  insurer_name TEXT,
  insurer_email TEXT,
  claim_number TEXT,
  date_of_loss DATE,
  claims_technician TEXT,
  assessor_name TEXT,
  assessor_contact TEXT,
  date_assessed DATE DEFAULT CURRENT_DATE,
  assessment_location TEXT,
  vehicle_stripped BOOLEAN DEFAULT false,

  insured_name TEXT,
  insured_contact TEXT,
  policy_number TEXT,

  outcome assessment_outcome,
  outcome_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. vehicle_details — one row per assessment
CREATE TABLE vehicle_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  make TEXT,
  model TEXT,
  year_model INTEGER,
  reg_number TEXT,
  vin_number TEXT,
  engine_number TEXT,
  mileage INTEGER,
  mileage_unknown BOOLEAN DEFAULT false,
  mm_code TEXT,

  transmission TEXT DEFAULT 'manual',
  colour TEXT,

  windscreen windscreen_condition DEFAULT 'intact',
  wheels wheel_type DEFAULT 'factory',
  spare_wheel accessory_status DEFAULT 'unknown',
  air_conditioning accessory_status DEFAULT 'unknown',
  radio accessory_status DEFAULT 'unknown',
  brakes brake_condition DEFAULT 'unknown',

  vehicle_notes TEXT,

  damage_direction damage_direction,
  damage_description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id)
);

-- 3. tyre_details — 4 rows per assessment (RF/LF/RR/LR)
CREATE TABLE tyre_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  position tyre_position NOT NULL,
  make TEXT,
  size TEXT,
  tread_mm DECIMAL(4,1),
  condition tyre_condition DEFAULT 'unknown',
  comments TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id, position)
);

-- 4. pre_existing_damages — old damages list
CREATE TABLE pre_existing_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  location TEXT NOT NULL,
  description TEXT,
  severity damage_severity DEFAULT 'minor',
  photo_evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. vehicle_values — M&M / eValue8 data (one row per assessment)
CREATE TABLE vehicle_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  source valuation_source DEFAULT 'mm_guide',
  valuation_date DATE,

  new_price_value DECIMAL(12,2),
  retail_value DECIMAL(12,2),
  trade_value DECIMAL(12,2),
  market_value DECIMAL(12,2),

  extras_value DECIMAL(12,2) DEFAULT 0,
  less_old_damages DECIMAL(12,2) DEFAULT 0,
  vehicle_total_value DECIMAL(12,2),

  max_repair_percentage DECIMAL(5,2) DEFAULT 75.00,
  max_repair_value DECIMAL(12,2),
  max_repair_value_override BOOLEAN DEFAULT false,

  salvage_value DECIMAL(12,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id)
);

-- 6. repair_assessments — repairer details and totals
CREATE TABLE repair_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  repairer_name TEXT,
  repairer_contact TEXT,
  repairer_email TEXT,
  approved_repairer BOOLEAN DEFAULT false,

  quoted_amount DECIMAL(12,2),
  assessed_repair_total_excl_vat DECIMAL(12,2),
  betterment_incl_vat DECIMAL(12,2) DEFAULT 0,

  is_uneconomical BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id)
);

-- 7. repair_line_items — per-line cost breakdown
CREATE TABLE repair_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  repair_assessment_id UUID NOT NULL REFERENCES repair_assessments(id) ON DELETE CASCADE,

  order_index INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  operation_type operation_type DEFAULT 'other',
  qty INTEGER DEFAULT 1,

  parts_cost DECIMAL(12,2) DEFAULT 0,

  labour_hours DECIMAL(6,2) DEFAULT 0,
  labour_rate DECIMAL(8,2) DEFAULT 0,
  labour_cost DECIMAL(12,2) GENERATED ALWAYS AS (labour_hours * labour_rate) STORED,

  paint_cost DECIMAL(12,2) DEFAULT 0,
  paint_materials_cost DECIMAL(12,2) DEFAULT 0,
  strip_assm_cost DECIMAL(12,2) DEFAULT 0,
  frame_cost DECIMAL(12,2) DEFAULT 0,
  misc_cost DECIMAL(12,2) DEFAULT 0,

  is_sublet BOOLEAN DEFAULT false,
  sublet_supplier TEXT,

  betterment_applicable BOOLEAN DEFAULT false,
  betterment_percentage DECIMAL(5,2) DEFAULT 0,

  is_approved BOOLEAN DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. parts_assessments — parts supplier and amounts
CREATE TABLE parts_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  supplier_name TEXT,
  supplier_contact TEXT,
  supplier_email TEXT,
  notes_on_parts TEXT,

  parts_amount_excl_vat DECIMAL(12,2) DEFAULT 0,
  parts_handling_fee_excl_vat DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id)
);

-- 9. claim_financials — computed summary
CREATE TABLE claim_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  total_excl_vat DECIMAL(12,2) DEFAULT 0,
  vat_rate DECIMAL(5,2) DEFAULT 15.00,
  vat_amount DECIMAL(12,2) DEFAULT 0,
  total_incl_vat DECIMAL(12,2) DEFAULT 0,

  less_excess DECIMAL(12,2),
  excess_tba BOOLEAN DEFAULT true,

  grand_total DECIMAL(12,2) DEFAULT 0,

  settlement_value DECIMAL(12,2),
  less_salvage DECIMAL(12,2),
  net_settlement DECIMAL(12,2),

  has_manual_override BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id)
);

-- 10. assessment_documents — OCR ingestion tracking
CREATE TABLE assessment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,

  document_type doc_type_ocr NOT NULL,
  ocr_status ocr_status NOT NULL DEFAULT 'pending',
  raw_ocr_text TEXT,
  extracted_fields JSONB DEFAULT '{}',
  confidence_score DECIMAL(5,2),

  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  applied_to_assessment BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. report_evidence_links — embed evidence photos in report sections
CREATE TABLE report_evidence_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,

  report_section TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id, evidence_id, report_section)
);

-- 12. assessment_settings — per-org configuration
CREATE TABLE assessment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  logo_storage_path TEXT,
  company_registration TEXT,
  vat_registration TEXT,
  report_disclaimer TEXT,
  without_prejudice_default BOOLEAN DEFAULT true,

  max_repair_percentage DECIMAL(5,2) DEFAULT 75.00,
  vat_rate DECIMAL(5,2) DEFAULT 15.00,
  parts_handling_fee_percentage DECIMAL(5,2) DEFAULT 0,

  labour_rate_panel DECIMAL(8,2) DEFAULT 0,
  labour_rate_mechanical DECIMAL(8,2) DEFAULT 0,
  labour_rate_electrical DECIMAL(8,2) DEFAULT 0,
  labour_rate_paint DECIMAL(8,2) DEFAULT 0,
  labour_rate_structural DECIMAL(8,2) DEFAULT 0,
  labour_rate_trim DECIMAL(8,2) DEFAULT 0,
  labour_rate_glass DECIMAL(8,2) DEFAULT 0,

  betterment_wear_table JSONB DEFAULT '{}',
  fraud_indicator_items JSONB DEFAULT '["Odometer discrepancy","VIN/Reg inconsistencies","Pre-existing damage presented as new","Damage inconsistent with described incident","Multiple claims on same vehicle","Staged accident indicators","Identity / policy fraud indicators"]',
  assessment_types_available JSONB DEFAULT '["physical","digital","desktop"]',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (org_id)
);

-- 13. approved_repairers — org's approved repairer panel
CREATE TABLE approved_repairers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. preferred_parts_suppliers — org's preferred suppliers
CREATE TABLE preferred_parts_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. report_versions — immutable snapshots on "Mark Ready"
CREATE TABLE report_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  version_number INTEGER NOT NULL,
  snapshot_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (assessment_id, version_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- motor_assessments
CREATE INDEX idx_motor_assessments_case_id ON motor_assessments(case_id);
CREATE INDEX idx_motor_assessments_org_id ON motor_assessments(org_id);
CREATE INDEX idx_motor_assessments_status ON motor_assessments(status);
CREATE INDEX idx_motor_assessments_created_by ON motor_assessments(created_by);
CREATE INDEX idx_motor_assessments_parent ON motor_assessments(parent_assessment_id);
CREATE INDEX idx_motor_assessments_sequence ON motor_assessments(case_id, sequence_number);

-- vehicle_details
CREATE INDEX idx_vehicle_details_assessment_id ON vehicle_details(assessment_id);
CREATE INDEX idx_vehicle_details_org_id ON vehicle_details(org_id);
CREATE INDEX idx_vehicle_details_vin ON vehicle_details(vin_number);
CREATE INDEX idx_vehicle_details_reg ON vehicle_details(reg_number);

-- tyre_details
CREATE INDEX idx_tyre_details_assessment_id ON tyre_details(assessment_id);
CREATE INDEX idx_tyre_details_org_id ON tyre_details(org_id);

-- pre_existing_damages
CREATE INDEX idx_pre_existing_damages_assessment_id ON pre_existing_damages(assessment_id);
CREATE INDEX idx_pre_existing_damages_org_id ON pre_existing_damages(org_id);

-- vehicle_values
CREATE INDEX idx_vehicle_values_assessment_id ON vehicle_values(assessment_id);
CREATE INDEX idx_vehicle_values_org_id ON vehicle_values(org_id);

-- repair_assessments
CREATE INDEX idx_repair_assessments_assessment_id ON repair_assessments(assessment_id);
CREATE INDEX idx_repair_assessments_org_id ON repair_assessments(org_id);

-- repair_line_items
CREATE INDEX idx_repair_line_items_assessment_id ON repair_line_items(assessment_id);
CREATE INDEX idx_repair_line_items_repair_assessment_id ON repair_line_items(repair_assessment_id);
CREATE INDEX idx_repair_line_items_org_id ON repair_line_items(org_id);
CREATE INDEX idx_repair_line_items_order ON repair_line_items(repair_assessment_id, order_index);

-- parts_assessments
CREATE INDEX idx_parts_assessments_assessment_id ON parts_assessments(assessment_id);
CREATE INDEX idx_parts_assessments_org_id ON parts_assessments(org_id);

-- claim_financials
CREATE INDEX idx_claim_financials_assessment_id ON claim_financials(assessment_id);
CREATE INDEX idx_claim_financials_org_id ON claim_financials(org_id);

-- assessment_documents
CREATE INDEX idx_assessment_documents_assessment_id ON assessment_documents(assessment_id);
CREATE INDEX idx_assessment_documents_org_id ON assessment_documents(org_id);
CREATE INDEX idx_assessment_documents_ocr_status ON assessment_documents(ocr_status);
CREATE INDEX idx_assessment_documents_evidence_id ON assessment_documents(evidence_id);

-- report_evidence_links
CREATE INDEX idx_report_evidence_links_assessment_id ON report_evidence_links(assessment_id);
CREATE INDEX idx_report_evidence_links_org_id ON report_evidence_links(org_id);
CREATE INDEX idx_report_evidence_links_evidence_id ON report_evidence_links(evidence_id);
CREATE INDEX idx_report_evidence_links_section ON report_evidence_links(assessment_id, report_section, display_order);

-- assessment_settings
CREATE INDEX idx_assessment_settings_org_id ON assessment_settings(org_id);

-- approved_repairers
CREATE INDEX idx_approved_repairers_org_id ON approved_repairers(org_id);
CREATE INDEX idx_approved_repairers_active ON approved_repairers(org_id, is_active) WHERE is_active = true;

-- preferred_parts_suppliers
CREATE INDEX idx_preferred_parts_suppliers_org_id ON preferred_parts_suppliers(org_id);
CREATE INDEX idx_preferred_parts_suppliers_active ON preferred_parts_suppliers(org_id, is_active) WHERE is_active = true;

-- report_versions
CREATE INDEX idx_report_versions_assessment_id ON report_versions(assessment_id);
CREATE INDEX idx_report_versions_org_id ON report_versions(org_id);
CREATE INDEX idx_report_versions_number ON report_versions(assessment_id, version_number DESC);

-- cases claim_type
CREATE INDEX idx_cases_claim_type ON cases(org_id, claim_type);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_motor_assessments_updated_at BEFORE UPDATE ON motor_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_details_updated_at BEFORE UPDATE ON vehicle_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tyre_details_updated_at BEFORE UPDATE ON tyre_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pre_existing_damages_updated_at BEFORE UPDATE ON pre_existing_damages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicle_values_updated_at BEFORE UPDATE ON vehicle_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repair_assessments_updated_at BEFORE UPDATE ON repair_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repair_line_items_updated_at BEFORE UPDATE ON repair_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_assessments_updated_at BEFORE UPDATE ON parts_assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claim_financials_updated_at BEFORE UPDATE ON claim_financials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_documents_updated_at BEFORE UPDATE ON assessment_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_evidence_links_updated_at BEFORE UPDATE ON report_evidence_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_settings_updated_at BEFORE UPDATE ON assessment_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_approved_repairers_updated_at BEFORE UPDATE ON approved_repairers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferred_parts_suppliers_updated_at BEFORE UPDATE ON preferred_parts_suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
