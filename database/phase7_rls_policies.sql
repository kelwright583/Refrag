-- ============================================================================
-- PHASE 7: ASSESSMENT REPORT ENGINE — RLS POLICIES
-- Run AFTER phase7_assessment_schema.sql has been applied.
-- Depends on helper functions from rls_policies.sql: is_org_member(), is_org_admin()
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL NEW TABLES
-- ============================================================================

ALTER TABLE motor_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE tyre_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_existing_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE repair_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE claim_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_repairers ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferred_parts_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_versions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- MOTOR ASSESSMENTS
-- ============================================================================

CREATE POLICY "motor_assessments_select" ON motor_assessments
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "motor_assessments_insert" ON motor_assessments
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "motor_assessments_update" ON motor_assessments
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "motor_assessments_delete" ON motor_assessments
  FOR DELETE USING (is_org_admin(org_id));

-- Staff access
CREATE POLICY "motor_assessments_staff_select" ON motor_assessments
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff_users WHERE user_id = auth.uid() AND is_active = true));

-- ============================================================================
-- VEHICLE DETAILS
-- ============================================================================

CREATE POLICY "vehicle_details_select" ON vehicle_details
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "vehicle_details_insert" ON vehicle_details
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "vehicle_details_update" ON vehicle_details
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "vehicle_details_delete" ON vehicle_details
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- TYRE DETAILS
-- ============================================================================

CREATE POLICY "tyre_details_select" ON tyre_details
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "tyre_details_insert" ON tyre_details
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "tyre_details_update" ON tyre_details
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "tyre_details_delete" ON tyre_details
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- PRE-EXISTING DAMAGES
-- ============================================================================

CREATE POLICY "pre_existing_damages_select" ON pre_existing_damages
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "pre_existing_damages_insert" ON pre_existing_damages
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "pre_existing_damages_update" ON pre_existing_damages
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "pre_existing_damages_delete" ON pre_existing_damages
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- VEHICLE VALUES
-- ============================================================================

CREATE POLICY "vehicle_values_select" ON vehicle_values
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "vehicle_values_insert" ON vehicle_values
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "vehicle_values_update" ON vehicle_values
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "vehicle_values_delete" ON vehicle_values
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- REPAIR ASSESSMENTS
-- ============================================================================

CREATE POLICY "repair_assessments_select" ON repair_assessments
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "repair_assessments_insert" ON repair_assessments
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "repair_assessments_update" ON repair_assessments
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "repair_assessments_delete" ON repair_assessments
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- REPAIR LINE ITEMS
-- ============================================================================

CREATE POLICY "repair_line_items_select" ON repair_line_items
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "repair_line_items_insert" ON repair_line_items
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "repair_line_items_update" ON repair_line_items
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "repair_line_items_delete" ON repair_line_items
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- PARTS ASSESSMENTS
-- ============================================================================

CREATE POLICY "parts_assessments_select" ON parts_assessments
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "parts_assessments_insert" ON parts_assessments
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "parts_assessments_update" ON parts_assessments
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "parts_assessments_delete" ON parts_assessments
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- CLAIM FINANCIALS
-- ============================================================================

CREATE POLICY "claim_financials_select" ON claim_financials
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "claim_financials_insert" ON claim_financials
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "claim_financials_update" ON claim_financials
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "claim_financials_delete" ON claim_financials
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- ASSESSMENT DOCUMENTS (OCR)
-- ============================================================================

CREATE POLICY "assessment_documents_select" ON assessment_documents
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "assessment_documents_insert" ON assessment_documents
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "assessment_documents_update" ON assessment_documents
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "assessment_documents_delete" ON assessment_documents
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- REPORT EVIDENCE LINKS
-- ============================================================================

CREATE POLICY "report_evidence_links_select" ON report_evidence_links
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "report_evidence_links_insert" ON report_evidence_links
  FOR INSERT WITH CHECK (is_org_member(org_id));

CREATE POLICY "report_evidence_links_update" ON report_evidence_links
  FOR UPDATE USING (is_org_member(org_id));

CREATE POLICY "report_evidence_links_delete" ON report_evidence_links
  FOR DELETE USING (is_org_member(org_id));

-- ============================================================================
-- ASSESSMENT SETTINGS (org admin only for write)
-- ============================================================================

CREATE POLICY "assessment_settings_select" ON assessment_settings
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "assessment_settings_insert" ON assessment_settings
  FOR INSERT WITH CHECK (is_org_admin(org_id));

CREATE POLICY "assessment_settings_update" ON assessment_settings
  FOR UPDATE USING (is_org_admin(org_id));

CREATE POLICY "assessment_settings_delete" ON assessment_settings
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================================================
-- APPROVED REPAIRERS (org admin only for write)
-- ============================================================================

CREATE POLICY "approved_repairers_select" ON approved_repairers
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "approved_repairers_insert" ON approved_repairers
  FOR INSERT WITH CHECK (is_org_admin(org_id));

CREATE POLICY "approved_repairers_update" ON approved_repairers
  FOR UPDATE USING (is_org_admin(org_id));

CREATE POLICY "approved_repairers_delete" ON approved_repairers
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================================================
-- PREFERRED PARTS SUPPLIERS (org admin only for write)
-- ============================================================================

CREATE POLICY "preferred_parts_suppliers_select" ON preferred_parts_suppliers
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "preferred_parts_suppliers_insert" ON preferred_parts_suppliers
  FOR INSERT WITH CHECK (is_org_admin(org_id));

CREATE POLICY "preferred_parts_suppliers_update" ON preferred_parts_suppliers
  FOR UPDATE USING (is_org_admin(org_id));

CREATE POLICY "preferred_parts_suppliers_delete" ON preferred_parts_suppliers
  FOR DELETE USING (is_org_admin(org_id));

-- ============================================================================
-- REPORT VERSIONS
-- ============================================================================

CREATE POLICY "report_versions_select" ON report_versions
  FOR SELECT USING (is_org_member(org_id));

CREATE POLICY "report_versions_insert" ON report_versions
  FOR INSERT WITH CHECK (is_org_member(org_id));

-- No update/delete on report_versions — they are immutable snapshots

-- Staff access for report versions
CREATE POLICY "report_versions_staff_select" ON report_versions
  FOR SELECT USING (EXISTS (SELECT 1 FROM staff_users WHERE user_id = auth.uid() AND is_active = true));
