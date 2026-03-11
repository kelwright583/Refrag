CREATE TYPE org_member_role AS ENUM ('owner', 'admin', 'member');

-- Case status
CREATE TYPE case_status AS ENUM (
  'draft',
  'assigned',
  'site_visit',
  'awaiting_quote',
  'reporting',
  'submitted',
  'additional',
  'closed'
);

-- Case priority
CREATE TYPE case_priority AS ENUM ('low', 'normal', 'high');

-- Contact types
CREATE TYPE contact_type AS ENUM (
  'insured',
  'broker',
  'insurer',
  'panelbeater',
  'other'
);

-- Evidence types
CREATE TYPE evidence_type AS ENUM ('photo', 'video', 'document', 'text_note', 'none');

-- Media types
CREATE TYPE media_type AS ENUM ('photo', 'video', 'document');

-- Requirement check status
CREATE TYPE requirement_status AS ENUM ('missing', 'provided', 'not_applicable');

-- Report status
CREATE TYPE report_status AS ENUM ('draft', 'ready', 'submitted');

-- Export types
CREATE TYPE export_type AS ENUM ('assessor_pack');

-- Communication channels
CREATE TYPE comms_channel AS ENUM ('email', 'note');

-- Organisation status (for admin)
CREATE TYPE org_status AS ENUM ('active', 'trial', 'suspended', 'closed');

-- Billing status
CREATE TYPE billing_status AS ENUM ('trialing', 'active', 'past_due', 'canceled');

-- Staff roles (for admin)
CREATE TYPE staff_role AS ENUM ('super_admin', 'admin', 'support', 'analyst');

-- Background job status
CREATE TYPE job_status AS ENUM ('queued', 'running', 'failed', 'completed');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. organisations
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status org_status DEFAULT 'active',
  plan_name TEXT DEFAULT 'refrag-standard',
  billing_status billing_status DEFAULT 'trialing',
  billing_provider TEXT,
  billing_customer_id TEXT,
  subscription_started_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. org_members
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_member_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, user_id)
);

-- 3. cases
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  case_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  insurer_name TEXT,
  broker_name TEXT,
  claim_reference TEXT,
  loss_date DATE,
  location TEXT,
  status case_status NOT NULL DEFAULT 'draft',
  priority case_priority NOT NULL DEFAULT 'normal',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, case_number)
);

-- 4. case_contacts
CREATE TABLE case_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  type contact_type NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. mandates
CREATE TABLE mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  insurer_name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. mandate_requirements
CREATE TABLE mandate_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES mandates(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  required BOOLEAN NOT NULL DEFAULT false,
  evidence_type evidence_type NOT NULL DEFAULT 'none',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. case_mandates
CREATE TABLE case_mandates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  mandate_id UUID NOT NULL REFERENCES mandates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, mandate_id)
);

-- 8. evidence
CREATE TABLE evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  storage_path TEXT NOT NULL,
  media_type media_type NOT NULL,
  content_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  captured_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. evidence_tags
CREATE TABLE evidence_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. requirement_checks
CREATE TABLE requirement_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  mandate_requirement_id UUID NOT NULL REFERENCES mandate_requirements(id) ON DELETE CASCADE,
  status requirement_status NOT NULL DEFAULT 'missing',
  evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, mandate_requirement_id)
);

-- 11. reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  version INTEGER NOT NULL DEFAULT 1,
  status report_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, version)
);

-- 12. report_sections
CREATE TABLE report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  heading TEXT NOT NULL,
  body_md TEXT NOT NULL DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. exports
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  report_id UUID REFERENCES reports(id) ON DELETE SET NULL,
  export_type export_type NOT NULL DEFAULT 'assessor_pack',
  storage_path TEXT,
  meta JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. comms_templates
CREATE TABLE comms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject_template TEXT NOT NULL,
  body_template_md TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. comms_log
CREATE TABLE comms_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id),
  channel comms_channel NOT NULL,
  to_recipients TEXT,
  subject TEXT,
  body_md TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. audit_log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17. case_notes
CREATE TABLE case_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  body_md TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ADMIN TABLES
-- ============================================================================

-- staff_users
CREATE TABLE staff_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role staff_role NOT NULL DEFAULT 'support',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- platform_events (telemetry)
CREATE TABLE platform_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  event_props JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- admin_audit_log
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- data_access_log (for compliance)
CREATE TABLE data_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  resource TEXT NOT NULL,
  resource_id UUID,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- background_jobs (optional, for future)
CREATE TABLE background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  status job_status NOT NULL DEFAULT 'queued',
  org_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- organisations
CREATE INDEX idx_organisations_slug ON organisations(slug);
CREATE INDEX idx_organisations_status ON organisations(status);

-- org_members
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_org_members_org_user ON org_members(org_id, user_id);

-- cases
CREATE INDEX idx_cases_org_id ON cases(org_id);
CREATE INDEX idx_cases_created_by ON cases(created_by);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_case_number ON cases(org_id, case_number);
CREATE INDEX idx_cases_client_name ON cases(org_id, client_name);
CREATE INDEX idx_cases_claim_reference ON cases(org_id, claim_reference);

-- case_contacts
CREATE INDEX idx_case_contacts_case_id ON case_contacts(case_id);
CREATE INDEX idx_case_contacts_org_id ON case_contacts(org_id);

-- mandates
CREATE INDEX idx_mandates_org_id ON mandates(org_id);

-- mandate_requirements
CREATE INDEX idx_mandate_requirements_mandate_id ON mandate_requirements(mandate_id);
CREATE INDEX idx_mandate_requirements_org_id ON mandate_requirements(org_id);
CREATE INDEX idx_mandate_requirements_order ON mandate_requirements(mandate_id, order_index);

-- case_mandates
CREATE INDEX idx_case_mandates_case_id ON case_mandates(case_id);
CREATE INDEX idx_case_mandates_mandate_id ON case_mandates(mandate_id);
CREATE INDEX idx_case_mandates_org_id ON case_mandates(org_id);

-- evidence
CREATE INDEX idx_evidence_case_id ON evidence(case_id);
CREATE INDEX idx_evidence_org_id ON evidence(org_id);
CREATE INDEX idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX idx_evidence_created_at ON evidence(created_at DESC);

-- evidence_tags
CREATE INDEX idx_evidence_tags_evidence_id ON evidence_tags(evidence_id);
CREATE INDEX idx_evidence_tags_case_id ON evidence_tags(case_id);
CREATE INDEX idx_evidence_tags_tag ON evidence_tags(tag);
CREATE INDEX idx_evidence_tags_org_id ON evidence_tags(org_id);

-- requirement_checks
CREATE INDEX idx_requirement_checks_case_id ON requirement_checks(case_id);
CREATE INDEX idx_requirement_checks_mandate_req_id ON requirement_checks(mandate_requirement_id);
CREATE INDEX idx_requirement_checks_status ON requirement_checks(case_id, status);
CREATE INDEX idx_requirement_checks_org_id ON requirement_checks(org_id);

-- reports
CREATE INDEX idx_reports_case_id ON reports(case_id);
CREATE INDEX idx_reports_org_id ON reports(org_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_version ON reports(case_id, version DESC);

-- report_sections
CREATE INDEX idx_report_sections_report_id ON report_sections(report_id);
CREATE INDEX idx_report_sections_order ON report_sections(report_id, order_index);
CREATE INDEX idx_report_sections_org_id ON report_sections(org_id);

-- exports
CREATE INDEX idx_exports_case_id ON exports(case_id);
CREATE INDEX idx_exports_org_id ON exports(org_id);
CREATE INDEX idx_exports_created_at ON exports(created_at DESC);

-- comms_templates
CREATE INDEX idx_comms_templates_org_id ON comms_templates(org_id);

-- comms_log
CREATE INDEX idx_comms_log_case_id ON comms_log(case_id);
CREATE INDEX idx_comms_log_org_id ON comms_log(org_id);
CREATE INDEX idx_comms_log_created_at ON comms_log(created_at DESC);

-- audit_log
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_audit_log_case_id ON audit_log(case_id);
CREATE INDEX idx_audit_log_actor ON audit_log(actor_user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);

-- case_notes
CREATE INDEX idx_case_notes_case_id ON case_notes(case_id);
CREATE INDEX idx_case_notes_org_id ON case_notes(org_id);
CREATE INDEX idx_case_notes_created_at ON case_notes(created_at DESC);

-- staff_users
CREATE INDEX idx_staff_users_user_id ON staff_users(user_id);
CREATE INDEX idx_staff_users_active ON staff_users(is_active) WHERE is_active = true;

-- platform_events
CREATE INDEX idx_platform_events_org_id ON platform_events(org_id);
CREATE INDEX idx_platform_events_user_id ON platform_events(user_id);
CREATE INDEX idx_platform_events_event_name ON platform_events(event_name);
CREATE INDEX idx_platform_events_created_at ON platform_events(created_at DESC);
CREATE INDEX idx_platform_events_org_created ON platform_events(org_id, created_at DESC);

-- admin_audit_log
CREATE INDEX idx_admin_audit_log_staff_user ON admin_audit_log(staff_user_id);
CREATE INDEX idx_admin_audit_log_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);

-- data_access_log
CREATE INDEX idx_data_access_log_staff_user ON data_access_log(staff_user_id);
CREATE INDEX idx_data_access_log_org_id ON data_access_log(org_id);
CREATE INDEX idx_data_access_log_resource ON data_access_log(resource);
CREATE INDEX idx_data_access_log_created_at ON data_access_log(created_at DESC);

-- background_jobs
CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_org_id ON background_jobs(org_id);
CREATE INDEX idx_background_jobs_created_at ON background_jobs(created_at DESC);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_organisations_updated_at BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_members_updated_at BEFORE UPDATE ON org_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_contacts_updated_at BEFORE UPDATE ON case_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mandates_updated_at BEFORE UPDATE ON mandates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mandate_requirements_updated_at BEFORE UPDATE ON mandate_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_mandates_updated_at BEFORE UPDATE ON case_mandates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_updated_at BEFORE UPDATE ON evidence
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_evidence_tags_updated_at BEFORE UPDATE ON evidence_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirement_checks_updated_at BEFORE UPDATE ON requirement_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_sections_updated_at BEFORE UPDATE ON report_sections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exports_updated_at BEFORE UPDATE ON exports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comms_templates_updated_at BEFORE UPDATE ON comms_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comms_log_updated_at BEFORE UPDATE ON comms_log
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_case_notes_updated_at BEFORE UPDATE ON case_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_users_updated_at BEFORE UPDATE ON staff_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_background_jobs_updated_at BEFORE UPDATE ON background_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
