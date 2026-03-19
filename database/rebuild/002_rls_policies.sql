-- ============================================================================
-- REFRAG MASTER REBUILD — 002_rls_policies.sql
-- Version: 3.1 (from REFRAG_MASTER_REBUILD_PROMPT.md, Part 15)
--
-- Safe to re-run: uses DROP POLICY IF EXISTS before every CREATE POLICY.
-- Run AFTER 001_master_schema.sql
-- ============================================================================

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION is_org_member(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_members
    WHERE org_id = p_org_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_users
    WHERE user_id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. STANDARD ORG-SCOPED TABLES
--    Pattern:
--      SELECT  → is_org_member(org_id) OR is_staff()
--      INSERT  → is_org_member(org_id)
--      UPDATE  → is_org_member(org_id)
--      DELETE  → is_org_admin(org_id)
-- ============================================================================

-- ---------- organisations ----------
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organisations_select" ON organisations;
CREATE POLICY "organisations_select" ON organisations FOR SELECT
  USING (is_org_member(id) OR is_staff());
DROP POLICY IF EXISTS "organisations_insert" ON organisations;
CREATE POLICY "organisations_insert" ON organisations FOR INSERT
  WITH CHECK (true);
DROP POLICY IF EXISTS "organisations_update" ON organisations;
CREATE POLICY "organisations_update" ON organisations FOR UPDATE
  USING (is_org_member(id));
DROP POLICY IF EXISTS "organisations_delete" ON organisations;
CREATE POLICY "organisations_delete" ON organisations FOR DELETE
  USING (is_org_admin(id));

-- ---------- org_members ----------
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "org_members_select" ON org_members;
CREATE POLICY "org_members_select" ON org_members FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "org_members_insert" ON org_members;
CREATE POLICY "org_members_insert" ON org_members FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "org_members_update" ON org_members;
CREATE POLICY "org_members_update" ON org_members FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "org_members_delete" ON org_members;
CREATE POLICY "org_members_delete" ON org_members FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- clients ----------
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "clients_insert" ON clients;
CREATE POLICY "clients_insert" ON clients FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "clients_update" ON clients;
CREATE POLICY "clients_update" ON clients FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "clients_delete" ON clients;
CREATE POLICY "clients_delete" ON clients FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- client_rate_structures ----------
ALTER TABLE client_rate_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_rate_structures_select" ON client_rate_structures;
CREATE POLICY "client_rate_structures_select" ON client_rate_structures FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "client_rate_structures_insert" ON client_rate_structures;
CREATE POLICY "client_rate_structures_insert" ON client_rate_structures FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "client_rate_structures_update" ON client_rate_structures;
CREATE POLICY "client_rate_structures_update" ON client_rate_structures FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "client_rate_structures_delete" ON client_rate_structures;
CREATE POLICY "client_rate_structures_delete" ON client_rate_structures FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- client_rules ----------
ALTER TABLE client_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_rules_select" ON client_rules;
CREATE POLICY "client_rules_select" ON client_rules FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "client_rules_insert" ON client_rules;
CREATE POLICY "client_rules_insert" ON client_rules FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "client_rules_update" ON client_rules;
CREATE POLICY "client_rules_update" ON client_rules FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "client_rules_delete" ON client_rules;
CREATE POLICY "client_rules_delete" ON client_rules FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- cases ----------
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cases_select" ON cases;
CREATE POLICY "cases_select" ON cases FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "cases_insert" ON cases;
CREATE POLICY "cases_insert" ON cases FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "cases_update" ON cases;
CREATE POLICY "cases_update" ON cases FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "cases_delete" ON cases;
CREATE POLICY "cases_delete" ON cases FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- case_contacts ----------
ALTER TABLE case_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_contacts_select" ON case_contacts;
CREATE POLICY "case_contacts_select" ON case_contacts FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "case_contacts_insert" ON case_contacts;
CREATE POLICY "case_contacts_insert" ON case_contacts FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "case_contacts_update" ON case_contacts;
CREATE POLICY "case_contacts_update" ON case_contacts FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "case_contacts_delete" ON case_contacts;
CREATE POLICY "case_contacts_delete" ON case_contacts FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- risk_items ----------
ALTER TABLE risk_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "risk_items_select" ON risk_items;
CREATE POLICY "risk_items_select" ON risk_items FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "risk_items_insert" ON risk_items;
CREATE POLICY "risk_items_insert" ON risk_items FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "risk_items_update" ON risk_items;
CREATE POLICY "risk_items_update" ON risk_items FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "risk_items_delete" ON risk_items;
CREATE POLICY "risk_items_delete" ON risk_items FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- evidence ----------
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidence_select" ON evidence;
CREATE POLICY "evidence_select" ON evidence FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "evidence_insert" ON evidence;
CREATE POLICY "evidence_insert" ON evidence FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "evidence_update" ON evidence;
CREATE POLICY "evidence_update" ON evidence FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "evidence_delete" ON evidence;
CREATE POLICY "evidence_delete" ON evidence FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- evidence_tags ----------
ALTER TABLE evidence_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "evidence_tags_select" ON evidence_tags;
CREATE POLICY "evidence_tags_select" ON evidence_tags FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "evidence_tags_insert" ON evidence_tags;
CREATE POLICY "evidence_tags_insert" ON evidence_tags FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "evidence_tags_update" ON evidence_tags;
CREATE POLICY "evidence_tags_update" ON evidence_tags FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "evidence_tags_delete" ON evidence_tags;
CREATE POLICY "evidence_tags_delete" ON evidence_tags FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- mandates ----------
ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mandates_select" ON mandates;
CREATE POLICY "mandates_select" ON mandates FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "mandates_insert" ON mandates;
CREATE POLICY "mandates_insert" ON mandates FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "mandates_update" ON mandates;
CREATE POLICY "mandates_update" ON mandates FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "mandates_delete" ON mandates;
CREATE POLICY "mandates_delete" ON mandates FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- mandate_requirements ----------
ALTER TABLE mandate_requirements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mandate_requirements_select" ON mandate_requirements;
CREATE POLICY "mandate_requirements_select" ON mandate_requirements FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "mandate_requirements_insert" ON mandate_requirements;
CREATE POLICY "mandate_requirements_insert" ON mandate_requirements FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "mandate_requirements_update" ON mandate_requirements;
CREATE POLICY "mandate_requirements_update" ON mandate_requirements FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "mandate_requirements_delete" ON mandate_requirements;
CREATE POLICY "mandate_requirements_delete" ON mandate_requirements FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- case_mandates ----------
ALTER TABLE case_mandates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_mandates_select" ON case_mandates;
CREATE POLICY "case_mandates_select" ON case_mandates FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "case_mandates_insert" ON case_mandates;
CREATE POLICY "case_mandates_insert" ON case_mandates FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "case_mandates_update" ON case_mandates;
CREATE POLICY "case_mandates_update" ON case_mandates FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "case_mandates_delete" ON case_mandates;
CREATE POLICY "case_mandates_delete" ON case_mandates FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- requirement_checks ----------
ALTER TABLE requirement_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "requirement_checks_select" ON requirement_checks;
CREATE POLICY "requirement_checks_select" ON requirement_checks FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "requirement_checks_insert" ON requirement_checks;
CREATE POLICY "requirement_checks_insert" ON requirement_checks FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "requirement_checks_update" ON requirement_checks;
CREATE POLICY "requirement_checks_update" ON requirement_checks FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "requirement_checks_delete" ON requirement_checks;
CREATE POLICY "requirement_checks_delete" ON requirement_checks FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- assessments ----------
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "assessments_select" ON assessments;
CREATE POLICY "assessments_select" ON assessments FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "assessments_insert" ON assessments;
CREATE POLICY "assessments_insert" ON assessments FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "assessments_update" ON assessments;
CREATE POLICY "assessments_update" ON assessments FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "assessments_delete" ON assessments;
CREATE POLICY "assessments_delete" ON assessments FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- repair_line_items ----------
ALTER TABLE repair_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "repair_line_items_select" ON repair_line_items;
CREATE POLICY "repair_line_items_select" ON repair_line_items FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "repair_line_items_insert" ON repair_line_items;
CREATE POLICY "repair_line_items_insert" ON repair_line_items FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "repair_line_items_update" ON repair_line_items;
CREATE POLICY "repair_line_items_update" ON repair_line_items FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "repair_line_items_delete" ON repair_line_items;
CREATE POLICY "repair_line_items_delete" ON repair_line_items FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- vehicle_values ----------
ALTER TABLE vehicle_values ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_values_select" ON vehicle_values;
CREATE POLICY "vehicle_values_select" ON vehicle_values FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "vehicle_values_insert" ON vehicle_values;
CREATE POLICY "vehicle_values_insert" ON vehicle_values FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "vehicle_values_update" ON vehicle_values;
CREATE POLICY "vehicle_values_update" ON vehicle_values FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "vehicle_values_delete" ON vehicle_values;
CREATE POLICY "vehicle_values_delete" ON vehicle_values FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- tyre_assessments ----------
ALTER TABLE tyre_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tyre_assessments_select" ON tyre_assessments;
CREATE POLICY "tyre_assessments_select" ON tyre_assessments FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "tyre_assessments_insert" ON tyre_assessments;
CREATE POLICY "tyre_assessments_insert" ON tyre_assessments FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "tyre_assessments_update" ON tyre_assessments;
CREATE POLICY "tyre_assessments_update" ON tyre_assessments FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "tyre_assessments_delete" ON tyre_assessments;
CREATE POLICY "tyre_assessments_delete" ON tyre_assessments FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- investigation_findings ----------
ALTER TABLE investigation_findings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "investigation_findings_select" ON investigation_findings;
CREATE POLICY "investigation_findings_select" ON investigation_findings FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "investigation_findings_insert" ON investigation_findings;
CREATE POLICY "investigation_findings_insert" ON investigation_findings FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "investigation_findings_update" ON investigation_findings;
CREATE POLICY "investigation_findings_update" ON investigation_findings FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "investigation_findings_delete" ON investigation_findings;
CREATE POLICY "investigation_findings_delete" ON investigation_findings FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- time_entries ----------
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "time_entries_select" ON time_entries;
CREATE POLICY "time_entries_select" ON time_entries FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "time_entries_insert" ON time_entries;
CREATE POLICY "time_entries_insert" ON time_entries FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "time_entries_update" ON time_entries;
CREATE POLICY "time_entries_update" ON time_entries FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "time_entries_delete" ON time_entries;
CREATE POLICY "time_entries_delete" ON time_entries FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- intake_documents ----------
ALTER TABLE intake_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intake_documents_select" ON intake_documents;
CREATE POLICY "intake_documents_select" ON intake_documents FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "intake_documents_insert" ON intake_documents;
CREATE POLICY "intake_documents_insert" ON intake_documents FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "intake_documents_update" ON intake_documents;
CREATE POLICY "intake_documents_update" ON intake_documents FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "intake_documents_delete" ON intake_documents;
CREATE POLICY "intake_documents_delete" ON intake_documents FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- inbound_emails ----------
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inbound_emails_select" ON inbound_emails;
CREATE POLICY "inbound_emails_select" ON inbound_emails FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "inbound_emails_insert" ON inbound_emails;
CREATE POLICY "inbound_emails_insert" ON inbound_emails FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "inbound_emails_update" ON inbound_emails;
CREATE POLICY "inbound_emails_update" ON inbound_emails FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "inbound_emails_delete" ON inbound_emails;
CREATE POLICY "inbound_emails_delete" ON inbound_emails FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- reports ----------
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reports_select" ON reports;
CREATE POLICY "reports_select" ON reports FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "reports_insert" ON reports;
CREATE POLICY "reports_insert" ON reports FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "reports_update" ON reports;
CREATE POLICY "reports_update" ON reports FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "reports_delete" ON reports;
CREATE POLICY "reports_delete" ON reports FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- report_sections ----------
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_sections_select" ON report_sections;
CREATE POLICY "report_sections_select" ON report_sections FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "report_sections_insert" ON report_sections;
CREATE POLICY "report_sections_insert" ON report_sections FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "report_sections_update" ON report_sections;
CREATE POLICY "report_sections_update" ON report_sections FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "report_sections_delete" ON report_sections;
CREATE POLICY "report_sections_delete" ON report_sections FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- report_evidence_links ----------
ALTER TABLE report_evidence_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_evidence_links_select" ON report_evidence_links;
CREATE POLICY "report_evidence_links_select" ON report_evidence_links FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "report_evidence_links_insert" ON report_evidence_links;
CREATE POLICY "report_evidence_links_insert" ON report_evidence_links FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "report_evidence_links_update" ON report_evidence_links;
CREATE POLICY "report_evidence_links_update" ON report_evidence_links FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "report_evidence_links_delete" ON report_evidence_links;
CREATE POLICY "report_evidence_links_delete" ON report_evidence_links FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- report_packs ----------
ALTER TABLE report_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_packs_select" ON report_packs;
CREATE POLICY "report_packs_select" ON report_packs FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "report_packs_insert" ON report_packs;
CREATE POLICY "report_packs_insert" ON report_packs FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "report_packs_update" ON report_packs;
CREATE POLICY "report_packs_update" ON report_packs FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "report_packs_delete" ON report_packs;
CREATE POLICY "report_packs_delete" ON report_packs FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- report_pack_items ----------
ALTER TABLE report_pack_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "report_pack_items_select" ON report_pack_items;
CREATE POLICY "report_pack_items_select" ON report_pack_items FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "report_pack_items_insert" ON report_pack_items;
CREATE POLICY "report_pack_items_insert" ON report_pack_items FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "report_pack_items_update" ON report_pack_items;
CREATE POLICY "report_pack_items_update" ON report_pack_items FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "report_pack_items_delete" ON report_pack_items;
CREATE POLICY "report_pack_items_delete" ON report_pack_items FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- invoices ----------
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_select" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
CREATE POLICY "invoices_insert" ON invoices FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "invoices_update" ON invoices;
CREATE POLICY "invoices_update" ON invoices FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_delete" ON invoices FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- invoice_line_items ----------
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_line_items_select" ON invoice_line_items;
CREATE POLICY "invoice_line_items_select" ON invoice_line_items FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "invoice_line_items_insert" ON invoice_line_items;
CREATE POLICY "invoice_line_items_insert" ON invoice_line_items FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "invoice_line_items_update" ON invoice_line_items;
CREATE POLICY "invoice_line_items_update" ON invoice_line_items FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "invoice_line_items_delete" ON invoice_line_items;
CREATE POLICY "invoice_line_items_delete" ON invoice_line_items FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- comms_log ----------
ALTER TABLE comms_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comms_log_select" ON comms_log;
CREATE POLICY "comms_log_select" ON comms_log FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "comms_log_insert" ON comms_log;
CREATE POLICY "comms_log_insert" ON comms_log FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "comms_log_update" ON comms_log;
CREATE POLICY "comms_log_update" ON comms_log FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "comms_log_delete" ON comms_log;
CREATE POLICY "comms_log_delete" ON comms_log FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- comms_templates ----------
ALTER TABLE comms_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comms_templates_select" ON comms_templates;
CREATE POLICY "comms_templates_select" ON comms_templates FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "comms_templates_insert" ON comms_templates;
CREATE POLICY "comms_templates_insert" ON comms_templates FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "comms_templates_update" ON comms_templates;
CREATE POLICY "comms_templates_update" ON comms_templates FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "comms_templates_delete" ON comms_templates;
CREATE POLICY "comms_templates_delete" ON comms_templates FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- appointments ----------
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "appointments_select" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
CREATE POLICY "appointments_insert" ON appointments FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "appointments_update" ON appointments;
CREATE POLICY "appointments_update" ON appointments FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_delete" ON appointments FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- recordings ----------
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "recordings_select" ON recordings;
CREATE POLICY "recordings_select" ON recordings FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "recordings_insert" ON recordings;
CREATE POLICY "recordings_insert" ON recordings FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "recordings_update" ON recordings;
CREATE POLICY "recordings_update" ON recordings FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "recordings_delete" ON recordings;
CREATE POLICY "recordings_delete" ON recordings FOR DELETE
  USING (is_org_admin(org_id));

-- ---------- case_notes ----------
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "case_notes_select" ON case_notes;
CREATE POLICY "case_notes_select" ON case_notes FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "case_notes_insert" ON case_notes;
CREATE POLICY "case_notes_insert" ON case_notes FOR INSERT
  WITH CHECK (is_org_member(org_id));
DROP POLICY IF EXISTS "case_notes_update" ON case_notes;
CREATE POLICY "case_notes_update" ON case_notes FOR UPDATE
  USING (is_org_member(org_id));
DROP POLICY IF EXISTS "case_notes_delete" ON case_notes;
CREATE POLICY "case_notes_delete" ON case_notes FOR DELETE
  USING (is_org_admin(org_id));

-- ============================================================================
-- 3. SPECIAL TABLES — audit_log (insert + select only, no update/delete)
-- ============================================================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT
  USING (is_org_member(org_id) OR is_staff());
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT
  WITH CHECK (is_org_member(org_id));

-- ============================================================================
-- 4. SPECIAL TABLES — platform_events (insert from any auth user, select staff only)
-- ============================================================================

ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_events_select" ON platform_events;
CREATE POLICY "platform_events_select" ON platform_events FOR SELECT
  USING (is_staff());
DROP POLICY IF EXISTS "platform_events_insert" ON platform_events;
CREATE POLICY "platform_events_insert" ON platform_events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 5. SPECIAL TABLES — staff_users (staff-only access)
-- ============================================================================

ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_users_select" ON staff_users;
CREATE POLICY "staff_users_select" ON staff_users FOR SELECT
  USING (is_staff() OR user_id = auth.uid());
DROP POLICY IF EXISTS "staff_users_insert" ON staff_users;
CREATE POLICY "staff_users_insert" ON staff_users FOR INSERT
  WITH CHECK (is_staff());
DROP POLICY IF EXISTS "staff_users_update" ON staff_users;
CREATE POLICY "staff_users_update" ON staff_users FOR UPDATE
  USING (is_staff());
DROP POLICY IF EXISTS "staff_users_delete" ON staff_users;
CREATE POLICY "staff_users_delete" ON staff_users FOR DELETE
  USING (is_staff());

-- ============================================================================
-- 6. SPECIAL TABLES — admin_audit_log (staff-only)
-- ============================================================================

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_log_select" ON admin_audit_log;
CREATE POLICY "admin_audit_log_select" ON admin_audit_log FOR SELECT
  USING (is_staff());
DROP POLICY IF EXISTS "admin_audit_log_insert" ON admin_audit_log;
CREATE POLICY "admin_audit_log_insert" ON admin_audit_log FOR INSERT
  WITH CHECK (is_staff());

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
