-- Migration 002: Case number format RF-ORG-YEAR-SEQ (sequential)
-- Run after 001_clients_and_org_profile.sql

-- Table for sequential case numbers per org per year
CREATE TABLE IF NOT EXISTS case_number_sequences (
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_seq INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (org_id, year)
);

-- Function to get next case number
CREATE OR REPLACE FUNCTION get_next_case_number(p_org_id UUID, p_org_slug TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_seq INTEGER;
BEGIN
  INSERT INTO case_number_sequences (org_id, year, last_seq)
  VALUES (p_org_id, v_year, 1)
  ON CONFLICT (org_id, year) DO UPDATE
  SET last_seq = case_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'RF-' || UPPER(p_org_slug) || '-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
