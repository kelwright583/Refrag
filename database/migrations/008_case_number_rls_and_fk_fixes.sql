-- Migration 008: Add RLS to case_number_sequences + fix intake_documents FK
-- Run after 007_enhanced_invoicing.sql

-- ============================================================================
-- 1. RLS on case_number_sequences
-- ============================================================================

ALTER TABLE case_number_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_number_sequences_select" ON case_number_sequences;
CREATE POLICY "case_number_sequences_select" ON case_number_sequences
  FOR SELECT USING (is_org_member(org_id) OR is_staff());

DROP POLICY IF EXISTS "case_number_sequences_insert" ON case_number_sequences;
CREATE POLICY "case_number_sequences_insert" ON case_number_sequences
  FOR INSERT WITH CHECK (is_org_member(org_id) OR is_staff());

DROP POLICY IF EXISTS "case_number_sequences_update" ON case_number_sequences;
CREATE POLICY "case_number_sequences_update" ON case_number_sequences
  FOR UPDATE USING (is_org_member(org_id) OR is_staff());

-- ============================================================================
-- 2. Fix intake_documents.created_by FK — add ON DELETE SET NULL
-- Postgres doesn't allow ALTER CONSTRAINT, so drop and re-add
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'intake_documents_created_by_fkey'
      AND table_name = 'intake_documents'
  ) THEN
    ALTER TABLE intake_documents DROP CONSTRAINT intake_documents_created_by_fkey;
    ALTER TABLE intake_documents
      ALTER COLUMN created_by DROP NOT NULL;
    ALTER TABLE intake_documents
      ADD CONSTRAINT intake_documents_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 3. Remove duplicate index (created in both 001 and 005)
-- ============================================================================
-- idx_cases_client_id already created in 001, no action needed — IF NOT EXISTS handles it
