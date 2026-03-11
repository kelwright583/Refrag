-- RLS for tables from migration 003. Run after 003_onboarding_inbound_appointments_recordings_invoices.sql

ALTER TABLE client_rate_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- client_rate_matrices
DROP POLICY IF EXISTS "client_rate_matrices_select" ON client_rate_matrices;
DROP POLICY IF EXISTS "client_rate_matrices_insert" ON client_rate_matrices;
DROP POLICY IF EXISTS "client_rate_matrices_update" ON client_rate_matrices;
DROP POLICY IF EXISTS "client_rate_matrices_delete" ON client_rate_matrices;
CREATE POLICY "client_rate_matrices_select" ON client_rate_matrices FOR SELECT USING (is_org_member(org_id) OR is_staff());
CREATE POLICY "client_rate_matrices_insert" ON client_rate_matrices FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "client_rate_matrices_update" ON client_rate_matrices FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "client_rate_matrices_delete" ON client_rate_matrices FOR DELETE USING (is_org_member(org_id));

-- inbound_emails
DROP POLICY IF EXISTS "inbound_emails_select" ON inbound_emails;
DROP POLICY IF EXISTS "inbound_emails_insert" ON inbound_emails;
DROP POLICY IF EXISTS "inbound_emails_update" ON inbound_emails;
DROP POLICY IF EXISTS "inbound_emails_delete" ON inbound_emails;
CREATE POLICY "inbound_emails_select" ON inbound_emails FOR SELECT USING ((org_id IS NOT NULL AND is_org_member(org_id)) OR is_staff());
CREATE POLICY "inbound_emails_insert" ON inbound_emails FOR INSERT WITH CHECK (true);
CREATE POLICY "inbound_emails_update" ON inbound_emails FOR UPDATE USING (is_org_member(org_id) OR is_staff());
CREATE POLICY "inbound_emails_delete" ON inbound_emails FOR DELETE USING (is_org_member(org_id) OR is_staff());

-- appointments
DROP POLICY IF EXISTS "appointments_select" ON appointments;
DROP POLICY IF EXISTS "appointments_insert" ON appointments;
DROP POLICY IF EXISTS "appointments_update" ON appointments;
DROP POLICY IF EXISTS "appointments_delete" ON appointments;
CREATE POLICY "appointments_select" ON appointments FOR SELECT USING (is_org_member(org_id) OR is_staff());
CREATE POLICY "appointments_insert" ON appointments FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "appointments_update" ON appointments FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "appointments_delete" ON appointments FOR DELETE USING (is_org_member(org_id));

-- recordings
DROP POLICY IF EXISTS "recordings_select" ON recordings;
DROP POLICY IF EXISTS "recordings_insert" ON recordings;
DROP POLICY IF EXISTS "recordings_update" ON recordings;
DROP POLICY IF EXISTS "recordings_delete" ON recordings;
CREATE POLICY "recordings_select" ON recordings FOR SELECT USING (is_org_member(org_id) OR is_staff());
CREATE POLICY "recordings_insert" ON recordings FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "recordings_update" ON recordings FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "recordings_delete" ON recordings FOR DELETE USING (is_org_member(org_id));

-- invoices
DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;
CREATE POLICY "invoices_select" ON invoices FOR SELECT USING (is_org_member(org_id) OR is_staff());
CREATE POLICY "invoices_insert" ON invoices FOR INSERT WITH CHECK (is_org_member(org_id));
CREATE POLICY "invoices_update" ON invoices FOR UPDATE USING (is_org_member(org_id));
CREATE POLICY "invoices_delete" ON invoices FOR DELETE USING (is_org_member(org_id));
