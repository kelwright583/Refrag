-- RLS for clients and client_rate_structures
-- Run after 001_clients_and_org_profile.sql

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_rate_structures ENABLE ROW LEVEL SECURITY;

-- clients: org members can CRUD their org's clients
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
  USING (is_org_member(org_id));

-- client_rate_structures
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
  USING (is_org_member(org_id));
