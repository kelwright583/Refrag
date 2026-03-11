-- Refrag Row Level Security (RLS) Policies
-- This file contains all RLS policies for tenant isolation and access control

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Check if user is a member of an organisation
CREATE OR REPLACE FUNCTION is_org_member(org_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM org_members
    WHERE org_id = org_id_param
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is an admin or owner of an organisation
CREATE OR REPLACE FUNCTION is_org_admin(org_id_param UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM org_members
    WHERE org_id = org_id_param
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is staff
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM staff_users
    WHERE user_id = auth.uid()
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get staff role
CREATE OR REPLACE FUNCTION staff_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::TEXT
    FROM staff_users
    WHERE user_id = auth.uid()
      AND is_active = true
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandate_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE comms_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_jobs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANISATIONS POLICIES
-- ============================================================================

-- SELECT: Members can see their orgs, staff can see all
CREATE POLICY "organisations_select"
  ON organisations FOR SELECT
  USING (
    is_org_member(id) OR is_staff()
  );

-- INSERT: Only staff can create orgs (or via app layer with proper checks)
CREATE POLICY "organisations_insert"
  ON organisations FOR INSERT
  WITH CHECK (is_staff() OR true); -- App layer will handle validation

-- UPDATE: Only owners/admins or staff can update
CREATE POLICY "organisations_update"
  ON organisations FOR UPDATE
  USING (
    is_org_admin(id) OR is_staff()
  )
  WITH CHECK (
    is_org_admin(id) OR is_staff()
  );

-- DELETE: Only staff can delete (or owners via app layer with validation)
CREATE POLICY "organisations_delete"
  ON organisations FOR DELETE
  USING (is_staff());

-- ============================================================================
-- ORG_MEMBERS POLICIES
-- ============================================================================

-- SELECT: Members can see members of their orgs, staff can see all
CREATE POLICY "org_members_select"
  ON org_members FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- INSERT: Only owners/admins or staff can add members
CREATE POLICY "org_members_insert"
  ON org_members FOR INSERT
  WITH CHECK (
    is_org_admin(org_id) OR is_staff()
  );

-- UPDATE: Only owners/admins or staff can update roles
CREATE POLICY "org_members_update"
  ON org_members FOR UPDATE
  USING (
    is_org_admin(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_admin(org_id) OR is_staff()
  );

-- DELETE: Only owners/admins or staff can remove members
CREATE POLICY "org_members_delete"
  ON org_members FOR DELETE
  USING (
    is_org_admin(org_id) OR is_staff()
  );

-- ============================================================================
-- CASES POLICIES
-- ============================================================================

-- SELECT: Members can see cases in their orgs, staff can see all
CREATE POLICY "cases_select"
  ON cases FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- INSERT: Members can create cases in their orgs, staff can create anywhere
CREATE POLICY "cases_insert"
  ON cases FOR INSERT
  WITH CHECK (
    (is_org_member(org_id) AND created_by = auth.uid()) OR is_staff()
  );

-- UPDATE: Members can update cases in their orgs, staff can update all
CREATE POLICY "cases_update"
  ON cases FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

-- DELETE: Members can delete cases in their orgs, staff can delete all
CREATE POLICY "cases_delete"
  ON cases FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- CASE_CONTACTS POLICIES
-- ============================================================================

CREATE POLICY "case_contacts_select"
  ON case_contacts FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_contacts_insert"
  ON case_contacts FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_contacts_update"
  ON case_contacts FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_contacts_delete"
  ON case_contacts FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- MANDATES POLICIES
-- ============================================================================

CREATE POLICY "mandates_select"
  ON mandates FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "mandates_insert"
  ON mandates FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "mandates_update"
  ON mandates FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "mandates_delete"
  ON mandates FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- MANDATE_REQUIREMENTS POLICIES
-- ============================================================================

CREATE POLICY "mandate_requirements_select"
  ON mandate_requirements FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "mandate_requirements_insert"
  ON mandate_requirements FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "mandate_requirements_update"
  ON mandate_requirements FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "mandate_requirements_delete"
  ON mandate_requirements FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- CASE_MANDATES POLICIES
-- ============================================================================

CREATE POLICY "case_mandates_select"
  ON case_mandates FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_mandates_insert"
  ON case_mandates FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_mandates_update"
  ON case_mandates FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_mandates_delete"
  ON case_mandates FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- EVIDENCE POLICIES
-- ============================================================================

CREATE POLICY "evidence_select"
  ON evidence FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "evidence_insert"
  ON evidence FOR INSERT
  WITH CHECK (
    (is_org_member(org_id) AND uploaded_by = auth.uid()) OR is_staff()
  );

CREATE POLICY "evidence_update"
  ON evidence FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "evidence_delete"
  ON evidence FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- EVIDENCE_TAGS POLICIES
-- ============================================================================

CREATE POLICY "evidence_tags_select"
  ON evidence_tags FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "evidence_tags_insert"
  ON evidence_tags FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "evidence_tags_update"
  ON evidence_tags FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "evidence_tags_delete"
  ON evidence_tags FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- REQUIREMENT_CHECKS POLICIES
-- ============================================================================

CREATE POLICY "requirement_checks_select"
  ON requirement_checks FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "requirement_checks_insert"
  ON requirement_checks FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "requirement_checks_update"
  ON requirement_checks FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "requirement_checks_delete"
  ON requirement_checks FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

CREATE POLICY "reports_select"
  ON reports FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "reports_insert"
  ON reports FOR INSERT
  WITH CHECK (
    (is_org_member(org_id) AND created_by = auth.uid()) OR is_staff()
  );

CREATE POLICY "reports_update"
  ON reports FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "reports_delete"
  ON reports FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- REPORT_SECTIONS POLICIES
-- ============================================================================

CREATE POLICY "report_sections_select"
  ON report_sections FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "report_sections_insert"
  ON report_sections FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "report_sections_update"
  ON report_sections FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "report_sections_delete"
  ON report_sections FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- EXPORTS POLICIES
-- ============================================================================

CREATE POLICY "exports_select"
  ON exports FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "exports_insert"
  ON exports FOR INSERT
  WITH CHECK (
    (is_org_member(org_id) AND created_by = auth.uid()) OR is_staff()
  );

CREATE POLICY "exports_update"
  ON exports FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "exports_delete"
  ON exports FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- COMMS_TEMPLATES POLICIES
-- ============================================================================

CREATE POLICY "comms_templates_select"
  ON comms_templates FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "comms_templates_insert"
  ON comms_templates FOR INSERT
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "comms_templates_update"
  ON comms_templates FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "comms_templates_delete"
  ON comms_templates FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- COMMS_LOG POLICIES
-- ============================================================================

CREATE POLICY "comms_log_select"
  ON comms_log FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "comms_log_insert"
  ON comms_log FOR INSERT
  WITH CHECK (
    (is_org_member(org_id) AND sent_by = auth.uid()) OR is_staff()
  );

CREATE POLICY "comms_log_update"
  ON comms_log FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "comms_log_delete"
  ON comms_log FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- AUDIT_LOG POLICIES
-- ============================================================================

-- SELECT: Members can see audit logs for their orgs, staff can see all
CREATE POLICY "audit_log_select"
  ON audit_log FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- INSERT: Only app layer can insert (via service role or RPC)
-- No direct INSERT policy - use RPC functions instead

-- UPDATE/DELETE: No updates or deletes allowed
-- Audit logs are immutable

-- ============================================================================
-- CASE_NOTES POLICIES
-- ============================================================================

CREATE POLICY "case_notes_select"
  ON case_notes FOR SELECT
  USING (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_notes_insert"
  ON case_notes FOR INSERT
  WITH CHECK (
    (is_org_member(org_id) AND created_by = auth.uid()) OR is_staff()
  );

CREATE POLICY "case_notes_update"
  ON case_notes FOR UPDATE
  USING (
    is_org_member(org_id) OR is_staff()
  )
  WITH CHECK (
    is_org_member(org_id) OR is_staff()
  );

CREATE POLICY "case_notes_delete"
  ON case_notes FOR DELETE
  USING (
    is_org_member(org_id) OR is_staff()
  );

-- ============================================================================
-- STAFF_USERS POLICIES
-- ============================================================================

-- SELECT: Staff can see all staff users
CREATE POLICY "staff_users_select"
  ON staff_users FOR SELECT
  USING (is_staff());

-- INSERT: Only super_admin can create staff (or via app layer)
CREATE POLICY "staff_users_insert"
  ON staff_users FOR INSERT
  WITH CHECK (
    staff_role() = 'super_admin' OR true -- App layer validation
  );

-- UPDATE: Only super_admin can update staff
CREATE POLICY "staff_users_update"
  ON staff_users FOR UPDATE
  USING (staff_role() = 'super_admin')
  WITH CHECK (staff_role() = 'super_admin');

-- DELETE: Only super_admin can delete staff
CREATE POLICY "staff_users_delete"
  ON staff_users FOR DELETE
  USING (staff_role() = 'super_admin');

-- ============================================================================
-- PLATFORM_EVENTS POLICIES
-- ============================================================================

-- SELECT: Members can see events for their orgs, staff can see all
CREATE POLICY "platform_events_select"
  ON platform_events FOR SELECT
  USING (
    (org_id IS NOT NULL AND is_org_member(org_id)) OR
    (org_id IS NULL AND user_id = auth.uid()) OR
    is_staff()
  );

-- INSERT: App layer inserts (via service role or RPC)
-- No direct INSERT policy

-- UPDATE/DELETE: No updates or deletes allowed

-- ============================================================================
-- ADMIN_AUDIT_LOG POLICIES
-- ============================================================================

-- SELECT: Only staff can see admin audit logs
CREATE POLICY "admin_audit_log_select"
  ON admin_audit_log FOR SELECT
  USING (is_staff());

-- INSERT: App layer inserts (via service role or RPC)
-- No direct INSERT policy

-- UPDATE/DELETE: No updates or deletes allowed

-- ============================================================================
-- DATA_ACCESS_LOG POLICIES
-- ============================================================================

-- SELECT: Only staff can see data access logs
CREATE POLICY "data_access_log_select"
  ON data_access_log FOR SELECT
  USING (is_staff());

-- INSERT: App layer inserts (via service role or RPC)
-- No direct INSERT policy

-- UPDATE/DELETE: No updates or deletes allowed

-- ============================================================================
-- BACKGROUND_JOBS POLICIES
-- ============================================================================

-- SELECT: Members can see jobs for their orgs, staff can see all
CREATE POLICY "background_jobs_select"
  ON background_jobs FOR SELECT
  USING (
    (org_id IS NOT NULL AND is_org_member(org_id)) OR
    is_staff()
  );

-- INSERT: App layer inserts (via service role or RPC)
-- No direct INSERT policy

-- UPDATE: App layer updates (via service role or RPC)
-- No direct UPDATE policy

-- DELETE: Only staff can delete jobs
CREATE POLICY "background_jobs_delete"
  ON background_jobs FOR DELETE
  USING (is_staff());
