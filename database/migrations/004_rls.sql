-- RLS for tables from migration 004.
-- Run after 004_intake_risk_items_valuations_rules_transactions.sql

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE intake_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_risk_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- intake_documents
-- ============================================================================

DROP POLICY IF EXISTS "intake_documents_select" ON intake_documents;
DROP POLICY IF EXISTS "intake_documents_insert" ON intake_documents;
DROP POLICY IF EXISTS "intake_documents_update" ON intake_documents;
DROP POLICY IF EXISTS "intake_documents_delete" ON intake_documents;

CREATE POLICY "intake_documents_select" ON intake_documents FOR SELECT
  USING (is_org_member(org_id) OR is_staff());

CREATE POLICY "intake_documents_insert" ON intake_documents FOR INSERT
  WITH CHECK (is_org_member(org_id));

CREATE POLICY "intake_documents_update" ON intake_documents FOR UPDATE
  USING (is_org_member(org_id));

CREATE POLICY "intake_documents_delete" ON intake_documents FOR DELETE
  USING (is_org_member(org_id));

-- ============================================================================
-- extracted_fields
-- ============================================================================

DROP POLICY IF EXISTS "extracted_fields_select" ON extracted_fields;
DROP POLICY IF EXISTS "extracted_fields_insert" ON extracted_fields;
DROP POLICY IF EXISTS "extracted_fields_update" ON extracted_fields;
DROP POLICY IF EXISTS "extracted_fields_delete" ON extracted_fields;

CREATE POLICY "extracted_fields_select" ON extracted_fields FOR SELECT
  USING (is_org_member(org_id) OR is_staff());

CREATE POLICY "extracted_fields_insert" ON extracted_fields FOR INSERT
  WITH CHECK (is_org_member(org_id));

CREATE POLICY "extracted_fields_update" ON extracted_fields FOR UPDATE
  USING (is_org_member(org_id));

CREATE POLICY "extracted_fields_delete" ON extracted_fields FOR DELETE
  USING (is_org_member(org_id));

-- ============================================================================
-- case_risk_items
-- ============================================================================

DROP POLICY IF EXISTS "case_risk_items_select" ON case_risk_items;
DROP POLICY IF EXISTS "case_risk_items_insert" ON case_risk_items;
DROP POLICY IF EXISTS "case_risk_items_update" ON case_risk_items;
DROP POLICY IF EXISTS "case_risk_items_delete" ON case_risk_items;

CREATE POLICY "case_risk_items_select" ON case_risk_items FOR SELECT
  USING (is_org_member(org_id) OR is_staff());

CREATE POLICY "case_risk_items_insert" ON case_risk_items FOR INSERT
  WITH CHECK (is_org_member(org_id));

CREATE POLICY "case_risk_items_update" ON case_risk_items FOR UPDATE
  USING (is_org_member(org_id));

CREATE POLICY "case_risk_items_delete" ON case_risk_items FOR DELETE
  USING (is_org_member(org_id));

-- ============================================================================
-- valuation_snapshots
-- ============================================================================

DROP POLICY IF EXISTS "valuation_snapshots_select" ON valuation_snapshots;
DROP POLICY IF EXISTS "valuation_snapshots_insert" ON valuation_snapshots;

CREATE POLICY "valuation_snapshots_select" ON valuation_snapshots FOR SELECT
  USING (is_org_member(org_id) OR is_staff());

CREATE POLICY "valuation_snapshots_insert" ON valuation_snapshots FOR INSERT
  WITH CHECK (is_org_member(org_id));

-- Snapshots are append-only: no update or delete by users
-- Staff can view for support

-- ============================================================================
-- client_rules
-- ============================================================================

DROP POLICY IF EXISTS "client_rules_select" ON client_rules;
DROP POLICY IF EXISTS "client_rules_insert" ON client_rules;
DROP POLICY IF EXISTS "client_rules_update" ON client_rules;
DROP POLICY IF EXISTS "client_rules_delete" ON client_rules;

CREATE POLICY "client_rules_select" ON client_rules FOR SELECT
  USING (is_org_member(org_id) OR is_staff());

CREATE POLICY "client_rules_insert" ON client_rules FOR INSERT
  WITH CHECK (is_org_member(org_id));

CREATE POLICY "client_rules_update" ON client_rules FOR UPDATE
  USING (is_org_member(org_id));

CREATE POLICY "client_rules_delete" ON client_rules FOR DELETE
  USING (is_org_member(org_id));

-- ============================================================================
-- transactions
-- ============================================================================

DROP POLICY IF EXISTS "transactions_select" ON transactions;
DROP POLICY IF EXISTS "transactions_insert" ON transactions;

CREATE POLICY "transactions_select" ON transactions FOR SELECT
  USING (is_org_member(org_id) OR is_staff());

CREATE POLICY "transactions_insert" ON transactions FOR INSERT
  WITH CHECK (is_org_member(org_id));

-- Transactions are append-only from user side: no update or delete
-- Status changes happen via webhook (service role / server-side)
