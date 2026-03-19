-- ============================================================================
-- REFRAG MASTER REBUILD — 001_master_schema.sql
-- Version: 3.1 (from REFRAG_MASTER_REBUILD_PROMPT.md)
--
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS throughout.
-- Covers all tables from Parts 4.1–4.7 of the spec.
--
-- Run order: this file first, then 002_rls_policies.sql
-- ============================================================================

-- ============================================================================
-- 0. UTILITY — updated_at trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. ORGANISATIONS — extend existing table with new columns
-- ============================================================================

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS tax_identifier TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS tax_identifier_label TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'ZA';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Africa/Johannesburg';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS currency_code TEXT NOT NULL DEFAULT 'ZAR';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en-ZA';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS signature_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS certification_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS banking_details JSONB DEFAULT '{}';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS professional_types TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS billing_subscription_id TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS report_pack_credits INTEGER DEFAULT 0;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stationery_primary_colour TEXT DEFAULT '#1F2933';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stationery_accent_colour TEXT DEFAULT '#B4533C';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stationery_text_colour TEXT DEFAULT '#1F2933';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS disclaimer_text TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS damage_classification_system TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS write_off_terminology TEXT DEFAULT 'write-off';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS data_protection_regime TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS billing_mode TEXT DEFAULT 'credits';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS monthly_pack_count INTEGER DEFAULT 0;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS monthly_pack_limit INTEGER;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS billing_period_start TIMESTAMPTZ;

-- ============================================================================
-- 2. ORG_MEMBERS — extend existing table
-- ============================================================================

ALTER TABLE org_members ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE org_members ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Ensure role column supports the new TEXT values (owner, admin, member)
-- The old schema used an enum; the new schema uses plain TEXT.
-- We leave the column as-is if it already works — the app layer validates.

-- ============================================================================
-- 3. CLIENTS — create if not exists, then add missing columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_type TEXT NOT NULL DEFAULT 'insurer',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  billing_email TEXT,
  address TEXT,
  country_code TEXT,
  default_mandate_id UUID,
  default_report_template TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(org_id, name);
CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(org_id, is_active) WHERE is_active = true;

-- ============================================================================
-- 4. CLIENT_RATE_STRUCTURES — create if not exists, then add missing columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_rate_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  amount DECIMAL(15,4) NOT NULL,
  currency_code TEXT NOT NULL,
  unit_label TEXT,
  applies_to TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_rate_structures ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE client_rate_structures ADD COLUMN IF NOT EXISTS currency_code TEXT;
ALTER TABLE client_rate_structures ADD COLUMN IF NOT EXISTS unit_label TEXT;
ALTER TABLE client_rate_structures ADD COLUMN IF NOT EXISTS applies_to TEXT;
ALTER TABLE client_rate_structures ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_client_rate_structures_client_id ON client_rate_structures(client_id);
CREATE INDEX IF NOT EXISTS idx_client_rate_structures_org_id ON client_rate_structures(org_id);

-- ============================================================================
-- 5. CLIENT_RULES — create if not exists, then add missing columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL,
  label TEXT,
  vertical TEXT DEFAULT 'all',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, rule_key, vertical)
);

ALTER TABLE client_rules ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE client_rules ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT 'all';

CREATE INDEX IF NOT EXISTS idx_client_rules_client_id ON client_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_client_rules_org_id ON client_rules(org_id);

-- ============================================================================
-- 6. CASES — extend existing table with new columns
-- ============================================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS insurer_reference TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS our_reference TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS vertical TEXT NOT NULL DEFAULT 'motor_assessor';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS site_visit_started_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS site_visit_completed_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS report_submitted_at TIMESTAMPTZ;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10,7);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10,7);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS intake_source TEXT DEFAULT 'manual';
ALTER TABLE cases ADD COLUMN IF NOT EXISTS instruction_date DATE;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS loss_date DATE;

CREATE INDEX IF NOT EXISTS idx_cases_org_id ON cases(org_id);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_vertical ON cases(org_id, vertical);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(org_id, created_at DESC);

-- ============================================================================
-- 7. CASE_CONTACTS — extend existing table
-- ============================================================================

ALTER TABLE case_contacts ADD COLUMN IF NOT EXISTS party_type TEXT;
ALTER TABLE case_contacts ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE case_contacts ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE case_contacts ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_case_contacts_case_id ON case_contacts(case_id);
CREATE INDEX IF NOT EXISTS idx_case_contacts_org_id ON case_contacts(org_id);

-- ============================================================================
-- 8. RISK_ITEMS — new table (replaces case_risk_items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT true,
  risk_type TEXT NOT NULL,
  description TEXT,
  identifier_type TEXT,
  identifier_value TEXT,
  asset_data JSONB DEFAULT '{}',
  cover_type TEXT,
  sum_insured DECIMAL(15,4),
  sum_insured_currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_items_case_id ON risk_items(case_id);
CREATE INDEX IF NOT EXISTS idx_risk_items_org_id ON risk_items(org_id);
CREATE INDEX IF NOT EXISTS idx_risk_items_risk_type ON risk_items(risk_type);
CREATE INDEX IF NOT EXISTS idx_risk_items_primary ON risk_items(case_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_risk_items_identifier ON risk_items(identifier_type, identifier_value);

-- ============================================================================
-- 9. EVIDENCE — extend existing table with new columns
-- ============================================================================

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10,7);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10,7);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS ai_classification TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS ai_classification_confidence DECIMAL(5,4);
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS is_valuation_document BOOLEAN DEFAULT false;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS is_in_report_pack BOOLEAN DEFAULT true;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_evidence_case_id ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_org_id ON evidence(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_valuation ON evidence(case_id) WHERE is_valuation_document = true;

-- ============================================================================
-- 10. EVIDENCE_TAGS — already exists, ensure index
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_tags_evidence_id ON evidence_tags(evidence_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_org_id ON evidence_tags(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tags_tag ON evidence_tags(tag);

-- ============================================================================
-- 11. MANDATES — extend existing table
-- ============================================================================

ALTER TABLE mandates ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE mandates ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT 'all';
ALTER TABLE mandates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE mandates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_mandates_org_id ON mandates(org_id);
CREATE INDEX IF NOT EXISTS idx_mandates_client_id ON mandates(client_id);
CREATE INDEX IF NOT EXISTS idx_mandates_vertical ON mandates(org_id, vertical);

-- ============================================================================
-- 12. MANDATE_REQUIREMENTS — extend existing table
-- ============================================================================

ALTER TABLE mandate_requirements ADD COLUMN IF NOT EXISTS requirement_key TEXT;
ALTER TABLE mandate_requirements ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true;
ALTER TABLE mandate_requirements ADD COLUMN IF NOT EXISTS guidance_note TEXT;

-- Back-fill requirement_key from existing key column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mandate_requirements' AND column_name = 'key'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'mandate_requirements' AND column_name = 'requirement_key'
  ) THEN
    UPDATE mandate_requirements SET requirement_key = key WHERE requirement_key IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mandate_requirements_mandate_id ON mandate_requirements(mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandate_requirements_org_id ON mandate_requirements(org_id);
CREATE INDEX IF NOT EXISTS idx_mandate_requirements_order ON mandate_requirements(mandate_id, order_index);

-- ============================================================================
-- 13. CASE_MANDATES — already exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES mandates(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, mandate_id)
);

CREATE INDEX IF NOT EXISTS idx_case_mandates_case_id ON case_mandates(case_id);
CREATE INDEX IF NOT EXISTS idx_case_mandates_org_id ON case_mandates(org_id);

-- ============================================================================
-- 14. REQUIREMENT_CHECKS — extend existing table
-- ============================================================================

ALTER TABLE requirement_checks ADD COLUMN IF NOT EXISTS checked_by UUID REFERENCES auth.users(id);
ALTER TABLE requirement_checks ADD COLUMN IF NOT EXISTS checked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_requirement_checks_case_id ON requirement_checks(case_id);
CREATE INDEX IF NOT EXISTS idx_requirement_checks_org_id ON requirement_checks(org_id);
CREATE INDEX IF NOT EXISTS idx_requirement_checks_status ON requirement_checks(case_id, status);

-- ============================================================================
-- 15. ASSESSMENTS — new generic table (replaces motor_assessments)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  vertical TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  outcome TEXT,
  outcome_notes TEXT,
  financial_summary JSONB DEFAULT '{}',
  assessment_date DATE,
  assessor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_case_id ON assessments(case_id);
CREATE INDEX IF NOT EXISTS idx_assessments_org_id ON assessments(org_id);
CREATE INDEX IF NOT EXISTS idx_assessments_vertical ON assessments(org_id, vertical);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- ============================================================================
-- 16. REPAIR_LINE_ITEMS — recreate with new schema referencing assessments
--     The old table references motor_assessments. We create the new version
--     only if it doesn't exist with an assessment_id column already.
-- ============================================================================

-- If repair_line_items exists but lacks the new columns, add them
ALTER TABLE repair_line_items ADD COLUMN IF NOT EXISTS strip_assembly_cost DECIMAL(15,4) DEFAULT 0;
ALTER TABLE repair_line_items ADD COLUMN IF NOT EXISTS is_pre_existing BOOLEAN DEFAULT false;
ALTER TABLE repair_line_items ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_repair_line_items_assessment_id ON repair_line_items(assessment_id);
CREATE INDEX IF NOT EXISTS idx_repair_line_items_org_id ON repair_line_items(org_id);

-- ============================================================================
-- 17. VEHICLE_VALUES — extend existing table with new columns
-- ============================================================================

ALTER TABLE vehicle_values ADD COLUMN IF NOT EXISTS evidence_id UUID REFERENCES evidence(id);
ALTER TABLE vehicle_values ADD COLUMN IF NOT EXISTS provider_name TEXT;
ALTER TABLE vehicle_values ADD COLUMN IF NOT EXISTS replacement_value DECIMAL(15,4);
ALTER TABLE vehicle_values ADD COLUMN IF NOT EXISTS currency_code TEXT;
ALTER TABLE vehicle_values ADD COLUMN IF NOT EXISTS raw_extraction JSONB DEFAULT '{}';
ALTER TABLE vehicle_values ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES auth.users(id);
ALTER TABLE vehicle_values ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_vehicle_values_assessment_id ON vehicle_values(assessment_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_values_org_id ON vehicle_values(org_id);

-- ============================================================================
-- 18. TYRE_ASSESSMENTS — new table (replaces tyre_details)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tyre_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  make TEXT,
  size TEXT,
  tread_depth_mm DECIMAL(4,2),
  condition TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assessment_id, position)
);

CREATE INDEX IF NOT EXISTS idx_tyre_assessments_assessment_id ON tyre_assessments(assessment_id);
CREATE INDEX IF NOT EXISTS idx_tyre_assessments_org_id ON tyre_assessments(org_id);

-- ============================================================================
-- 19. INVESTIGATION_FINDINGS — new table
-- ============================================================================

CREATE TABLE IF NOT EXISTS investigation_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  finding_number INTEGER NOT NULL,
  category TEXT,
  description TEXT NOT NULL,
  significance TEXT DEFAULT 'medium',
  evidence_ids UUID[],
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_findings_assessment_id ON investigation_findings(assessment_id);
CREATE INDEX IF NOT EXISTS idx_investigation_findings_org_id ON investigation_findings(org_id);
CREATE INDEX IF NOT EXISTS idx_investigation_findings_category ON investigation_findings(category);

-- ============================================================================
-- 20. TIME_ENTRIES — new table
-- ============================================================================

CREATE TABLE IF NOT EXISTS time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  entry_type TEXT NOT NULL,
  description TEXT NOT NULL,
  hours DECIMAL(6,2),
  rate DECIMAL(15,4),
  amount DECIMAL(15,4) NOT NULL,
  currency_code TEXT NOT NULL,
  date DATE NOT NULL,
  is_billable BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_case_id ON time_entries(case_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id ON time_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(date);
CREATE INDEX IF NOT EXISTS idx_time_entries_type ON time_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_time_entries_billable ON time_entries(case_id, is_billable) WHERE is_billable = true;

-- ============================================================================
-- 21. INTAKE_DOCUMENTS — extend existing table with new columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id),
  assessment_id UUID REFERENCES assessments(id),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  content_type TEXT,
  file_size INTEGER,
  document_role TEXT NOT NULL DEFAULT 'other',
  ocr_status TEXT DEFAULT 'pending',
  ocr_provider TEXT,
  raw_text TEXT,
  extracted_fields JSONB DEFAULT '{}',
  confirmed_fields JSONB DEFAULT '{}',
  pii_fields TEXT[],
  ai_audit_log JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE intake_documents ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id);
ALTER TABLE intake_documents ADD COLUMN IF NOT EXISTS document_role TEXT NOT NULL DEFAULT 'other';
ALTER TABLE intake_documents ADD COLUMN IF NOT EXISTS ocr_provider TEXT;
ALTER TABLE intake_documents ADD COLUMN IF NOT EXISTS extracted_fields JSONB DEFAULT '{}';
ALTER TABLE intake_documents ADD COLUMN IF NOT EXISTS confirmed_fields JSONB DEFAULT '{}';
ALTER TABLE intake_documents ADD COLUMN IF NOT EXISTS pii_fields TEXT[];
ALTER TABLE intake_documents ADD COLUMN IF NOT EXISTS ai_audit_log JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_intake_documents_org_id ON intake_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_intake_documents_case_id ON intake_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_intake_documents_status ON intake_documents(ocr_status);
CREATE INDEX IF NOT EXISTS idx_intake_documents_role ON intake_documents(document_role);
CREATE INDEX IF NOT EXISTS idx_intake_documents_created_at ON intake_documents(created_at DESC);

-- ============================================================================
-- 22. INBOUND_EMAILS — extend existing table
-- ============================================================================

CREATE TABLE IF NOT EXISTS inbound_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id),
  raw_subject TEXT,
  raw_from TEXT,
  raw_body TEXT,
  raw_html TEXT,
  attachments_meta JSONB DEFAULT '[]',
  parsed_json JSONB DEFAULT '{}',
  case_id UUID REFERENCES cases(id),
  status TEXT DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS raw_html TEXT;
ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE inbound_emails ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_inbound_emails_org_id ON inbound_emails(org_id);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_status ON inbound_emails(status);
CREATE INDEX IF NOT EXISTS idx_inbound_emails_case_id ON inbound_emails(case_id);

-- ============================================================================
-- 23. REPORTS — extend existing table with new columns
-- ============================================================================

ALTER TABLE reports ADD COLUMN IF NOT EXISTS assessment_id UUID REFERENCES assessments(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS vertical TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS executive_summary TEXT;

CREATE INDEX IF NOT EXISTS idx_reports_case_id ON reports(case_id);
CREATE INDEX IF NOT EXISTS idx_reports_org_id ON reports(org_id);
CREATE INDEX IF NOT EXISTS idx_reports_assessment_id ON reports(assessment_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================================
-- 24. REPORT_SECTIONS — extend existing table
-- ============================================================================

ALTER TABLE report_sections ADD COLUMN IF NOT EXISTS body_md TEXT;
ALTER TABLE report_sections ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_report_sections_report_id ON report_sections(report_id);
CREATE INDEX IF NOT EXISTS idx_report_sections_org_id ON report_sections(org_id);

-- ============================================================================
-- 25. REPORT_EVIDENCE_LINKS — extend existing table
-- ============================================================================

ALTER TABLE report_evidence_links ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES reports(id) ON DELETE CASCADE;
ALTER TABLE report_evidence_links ADD COLUMN IF NOT EXISTS section_key TEXT;
ALTER TABLE report_evidence_links ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_report_evidence_links_report_id ON report_evidence_links(report_id);
CREATE INDEX IF NOT EXISTS idx_report_evidence_links_evidence_id ON report_evidence_links(evidence_id);
CREATE INDEX IF NOT EXISTS idx_report_evidence_links_org_id ON report_evidence_links(org_id);

-- ============================================================================
-- 26. REPORT_PACKS — extend existing table with new columns
-- ============================================================================

ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES reports(id);
ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(15,4);
ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS payment_currency TEXT;
ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS pack_credits_used INTEGER DEFAULT 0;
ALTER TABLE report_packs ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_report_packs_case_id ON report_packs(case_id);
CREATE INDEX IF NOT EXISTS idx_report_packs_org_id ON report_packs(org_id);
CREATE INDEX IF NOT EXISTS idx_report_packs_report_id ON report_packs(report_id);
CREATE INDEX IF NOT EXISTS idx_report_packs_status ON report_packs(status);

-- ============================================================================
-- 27. REPORT_PACK_ITEMS — extend existing table
-- ============================================================================

ALTER TABLE report_pack_items ADD COLUMN IF NOT EXISTS item_type TEXT;
ALTER TABLE report_pack_items ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE report_pack_items ADD COLUMN IF NOT EXISTS evidence_id UUID REFERENCES evidence(id);
ALTER TABLE report_pack_items ADD COLUMN IF NOT EXISTS intake_document_id UUID REFERENCES intake_documents(id);
ALTER TABLE report_pack_items ADD COLUMN IF NOT EXISTS is_included BOOLEAN DEFAULT true;

-- The new schema uses report_pack_id instead of pack_id
ALTER TABLE report_pack_items ADD COLUMN IF NOT EXISTS report_pack_id UUID REFERENCES report_packs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_report_pack_items_pack_id ON report_pack_items(pack_id);
CREATE INDEX IF NOT EXISTS idx_report_pack_items_org_id ON report_pack_items(org_id);

-- ============================================================================
-- 28. INVOICES — extend existing table with new columns
-- ============================================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15,4) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15,4) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,4) DEFAULT 0.15;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tax_label TEXT DEFAULT 'VAT';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total DECIMAL(15,4) NOT NULL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency_code TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_case_id ON invoices(case_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- ============================================================================
-- 29. INVOICE_LINE_ITEMS — new table
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(8,2) DEFAULT 1,
  unit_label TEXT DEFAULT 'item',
  unit_price DECIMAL(15,4) NOT NULL,
  total DECIMAL(15,4) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_org_id ON invoice_line_items(org_id);

-- ============================================================================
-- 30. COMMS_LOG — extend existing table
-- ============================================================================

ALTER TABLE comms_log ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'outbound';
ALTER TABLE comms_log ADD COLUMN IF NOT EXISTS cc_recipients TEXT;
ALTER TABLE comms_log ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE comms_log ADD COLUMN IF NOT EXISTS resend_message_id TEXT;
ALTER TABLE comms_log ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'logged';
ALTER TABLE comms_log ADD COLUMN IF NOT EXISTS trigger_event TEXT;

CREATE INDEX IF NOT EXISTS idx_comms_log_case_id ON comms_log(case_id);
CREATE INDEX IF NOT EXISTS idx_comms_log_org_id ON comms_log(org_id);
CREATE INDEX IF NOT EXISTS idx_comms_log_trigger ON comms_log(trigger_event);
CREATE INDEX IF NOT EXISTS idx_comms_log_created_at ON comms_log(created_at DESC);

-- ============================================================================
-- 31. COMMS_TEMPLATES — extend existing table
-- ============================================================================

ALTER TABLE comms_templates ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE comms_templates ADD COLUMN IF NOT EXISTS trigger_event TEXT;
ALTER TABLE comms_templates ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'manual';
ALTER TABLE comms_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE comms_templates ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT 'all';

CREATE INDEX IF NOT EXISTS idx_comms_templates_org_id ON comms_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_comms_templates_trigger ON comms_templates(trigger_event);
CREATE INDEX IF NOT EXISTS idx_comms_templates_client ON comms_templates(client_id);

-- ============================================================================
-- 32. AUDIT_LOG — extend existing table
-- ============================================================================

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_id UUID;

CREATE INDEX IF NOT EXISTS idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_case_id ON audit_log(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at DESC);

-- ============================================================================
-- 33. APPOINTMENTS — extend existing table
-- ============================================================================

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10,7);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10,7);

CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON appointments(org_id);
CREATE INDEX IF NOT EXISTS idx_appointments_case_id ON appointments(case_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);

-- ============================================================================
-- 34. RECORDINGS — extend existing table
-- ============================================================================

ALTER TABLE recordings ADD COLUMN IF NOT EXISTS consent_recorded_at TIMESTAMPTZ;
ALTER TABLE recordings ADD COLUMN IF NOT EXISTS transcription_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_recordings_case_id ON recordings(case_id);
CREATE INDEX IF NOT EXISTS idx_recordings_org_id ON recordings(org_id);

-- ============================================================================
-- 35. PLATFORM_EVENTS — extend existing table
-- ============================================================================

ALTER TABLE platform_events ADD COLUMN IF NOT EXISTS vertical TEXT;

CREATE INDEX IF NOT EXISTS idx_platform_events_org ON platform_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_name ON platform_events(event_name, created_at DESC);

-- ============================================================================
-- 36. STAFF_USERS — already exists, ensure columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  role TEXT NOT NULL DEFAULT 'support',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_users_user_id ON staff_users(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_users_active ON staff_users(is_active) WHERE is_active = true;

-- ============================================================================
-- 37. ADMIN_AUDIT_LOG — already exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID REFERENCES staff_users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_staff_user ON admin_audit_log(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- ============================================================================
-- 38. CASE_NOTES — extend existing table
-- ============================================================================

ALTER TABLE case_notes ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_org_id ON case_notes(org_id);
CREATE INDEX IF NOT EXISTS idx_case_notes_created_at ON case_notes(created_at DESC);

-- ============================================================================
-- 39. TRIGGERS — updated_at for all tables that have the column
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
  trig_name TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'organisations', 'org_members', 'clients', 'client_rate_structures',
      'client_rules', 'cases', 'case_contacts', 'risk_items', 'evidence',
      'mandates', 'mandate_requirements', 'requirement_checks',
      'assessments', 'repair_line_items', 'vehicle_values',
      'tyre_assessments', 'investigation_findings', 'time_entries',
      'intake_documents', 'inbound_emails', 'reports', 'report_sections',
      'report_evidence_links', 'report_packs', 'report_pack_items',
      'invoices', 'comms_log', 'comms_templates', 'appointments',
      'recordings', 'case_notes', 'staff_users'
    ])
  LOOP
    trig_name := 'update_' || tbl || '_updated_at';
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I ON %I', trig_name, tbl
    );
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = tbl AND column_name = 'updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        trig_name, tbl
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 40. CASE NUMBER GENERATION — server-side only
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_case_number(p_org_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_slug TEXT;
  v_year TEXT;
  v_seq INTEGER;
  v_case_number TEXT;
BEGIN
  SELECT slug INTO v_slug FROM organisations WHERE id = p_org_id;
  v_year := to_char(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(split_part(case_number, '-', 4) AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM cases
  WHERE org_id = p_org_id
  AND case_number LIKE 'RF-' || UPPER(v_slug) || '-' || v_year || '-%';

  v_case_number := 'RF-' || UPPER(v_slug) || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_case_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- END OF MASTER SCHEMA MIGRATION
-- ============================================================================
