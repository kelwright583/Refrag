-- Migration 007: Enhanced invoicing - line items, assessment rates, extended org/client profiles
-- Run after 006

-- ============================================================================
-- 1. EXTEND organisations for full invoice details
-- ============================================================================

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS postal_address TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS physical_address TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS email TEXT;

-- banking_details JSONB already exists from migration 001
-- Expected shape: { account_holder, bank, account_number, branch_name, branch_code }

-- ============================================================================
-- 2. EXTEND clients for invoice addressing
-- ============================================================================

ALTER TABLE clients ADD COLUMN IF NOT EXISTS vat_number TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS postal_address TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS physical_address TEXT;

-- ============================================================================
-- 3. EXTEND invoices for full tax invoice fields
-- ============================================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reference TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sales_rep TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS overall_discount_pct DECIMAL(5,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_pct DECIMAL(5,2) DEFAULT 15;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_excl DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_vat DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sub_total DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS grand_total DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 30;

-- ============================================================================
-- 4. CREATE invoice_line_items
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  detail_lines TEXT[],
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  excl_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  disc_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  vat_pct DECIMAL(5,2) NOT NULL DEFAULT 15,
  excl_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  incl_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_org_id ON invoice_line_items(org_id);

-- ============================================================================
-- 5. CREATE assessment_rates (org-level rate configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assessment_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  rate_name TEXT NOT NULL,
  rate_type TEXT NOT NULL DEFAULT 'desktop',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_inclusive BOOLEAN NOT NULL DEFAULT true,
  vat_pct DECIMAL(5,2) NOT NULL DEFAULT 15,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, rate_name)
);

CREATE INDEX IF NOT EXISTS idx_assessment_rates_org_id ON assessment_rates(org_id);
CREATE INDEX IF NOT EXISTS idx_assessment_rates_type ON assessment_rates(rate_type);

-- ============================================================================
-- 6. EXTEND cases for vehicle/assessment details used in invoicing
-- ============================================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS vehicle_registration TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS vehicle_manufacturer TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS assessment_type TEXT;

-- ============================================================================
-- 7. TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_invoice_line_items_updated_at ON invoice_line_items;
CREATE TRIGGER update_invoice_line_items_updated_at BEFORE UPDATE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assessment_rates_updated_at ON assessment_rates;
CREATE TRIGGER update_assessment_rates_updated_at BEFORE UPDATE ON assessment_rates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_line_items_org_select" ON invoice_line_items
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "invoice_line_items_org_insert" ON invoice_line_items
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "invoice_line_items_org_update" ON invoice_line_items
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "invoice_line_items_org_delete" ON invoice_line_items
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "assessment_rates_org_select" ON assessment_rates
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "assessment_rates_org_insert" ON assessment_rates
  FOR INSERT WITH CHECK (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "assessment_rates_org_update" ON assessment_rates
  FOR UPDATE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "assessment_rates_org_delete" ON assessment_rates
  FOR DELETE USING (
    org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
  );
