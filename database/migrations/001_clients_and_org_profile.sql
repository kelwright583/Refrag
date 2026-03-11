-- Migration 001: Clients entity, Organisation profile, Case updates
-- Run after schema.sql and rls_policies.sql

-- ============================================================================
-- 1. EXTEND organisations
-- ============================================================================

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS legal_name TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS banking_details JSONB DEFAULT '{}';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS certification_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS signature_storage_path TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS country TEXT;

-- ============================================================================
-- 2. CREATE clients table
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  client_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  billing_email TEXT,
  default_mandate_id UUID REFERENCES mandates(id) ON DELETE SET NULL,
  default_report_template TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_org_id ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(org_id, name);

-- ============================================================================
-- 3. CREATE client_rate_structures (billing rates per client)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_rate_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rate_type TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  unit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_rate_structures_client_id ON client_rate_structures(client_id);
CREATE INDEX IF NOT EXISTS idx_client_rate_structures_org_id ON client_rate_structures(org_id);

-- ============================================================================
-- 4. EXTEND cases - client_id and insurer_reference
-- ============================================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS insurer_reference TEXT;
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);

-- claim_reference stays for backwards compat; insurer_reference is insurer's ref
-- Refrag case_number = RF-{ORG}-{YEAR}-{SEQ}; insurer_reference = their ref

-- ============================================================================
-- 5. TRIGGERS for updated_at
-- ============================================================================

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_rate_structures_updated_at ON client_rate_structures;
CREATE TRIGGER update_client_rate_structures_updated_at BEFORE UPDATE ON client_rate_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
