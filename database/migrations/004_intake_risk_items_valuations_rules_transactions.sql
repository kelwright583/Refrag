-- Migration 004: Intake documents, extracted fields, case risk items, valuation snapshots,
--                client rules, transactions, org specialisations, case write-off fields
-- Run after 003_onboarding_inbound_appointments_recordings_invoices.sql + 003_rls.sql

-- ============================================================================
-- 1. EXTEND organisations — specialisations
-- ============================================================================

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS specialisations JSONB DEFAULT '[]';
-- e.g. ["motor_assessor", "property_assessor", "loss_adjuster", "investigator"]

-- ============================================================================
-- 2. intake_documents — instruction document uploads (PDF, email, scan)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intake_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  content_type TEXT NOT NULL,                 -- application/pdf, message/rfc822, image/jpeg, etc.
  source_type TEXT NOT NULL DEFAULT 'pdf_upload',  -- pdf_upload, email_file, scan_photo
  status TEXT NOT NULL DEFAULT 'pending',     -- pending, extracting, extracted, confirmed, rejected
  raw_text TEXT,                              -- Full extracted text (PDF text layer or OCR)
  extraction_method TEXT,                     -- pdf_text, vision_ocr, email_parse
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intake_documents_org_id ON intake_documents(org_id);
CREATE INDEX IF NOT EXISTS idx_intake_documents_status ON intake_documents(status);
CREATE INDEX IF NOT EXISTS idx_intake_documents_case_id ON intake_documents(case_id);
CREATE INDEX IF NOT EXISTS idx_intake_documents_created_at ON intake_documents(created_at DESC);

-- ============================================================================
-- 3. extracted_fields — OCR-extracted fields with confidence, per intake_document
-- ============================================================================

CREATE TABLE IF NOT EXISTS extracted_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  intake_document_id UUID NOT NULL REFERENCES intake_documents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,                    -- insurer_reference, policy_number, vin, etc.
  value TEXT NOT NULL,                        -- Extracted value
  confidence TEXT NOT NULL DEFAULT 'low',     -- high, medium, low
  extraction_method TEXT DEFAULT 'rule',      -- rule, ai_fallback
  label_matched TEXT,                         -- Which label matched (for audit)
  confirmed_value TEXT,                       -- User-confirmed value (may differ from extracted)
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intake_document_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_extracted_fields_intake_doc ON extracted_fields(intake_document_id);
CREATE INDEX IF NOT EXISTS idx_extracted_fields_org_id ON extracted_fields(org_id);

-- ============================================================================
-- 4. case_risk_items — flexible risk items per case (motor, property, contents, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_risk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  risk_type TEXT NOT NULL,                    -- motor_vehicle, building, contents, stock,
                                              -- business_interruption, goods_in_transit, other
  cover_type TEXT,                            -- comprehensive, third_party, buildings, household_contents, etc.
  description TEXT,                           -- Free-text description of the risk item
  asset_data JSONB NOT NULL DEFAULT '{}',     -- Type-specific structured data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_risk_items_case_id ON case_risk_items(case_id);
CREATE INDEX IF NOT EXISTS idx_case_risk_items_org_id ON case_risk_items(org_id);
CREATE INDEX IF NOT EXISTS idx_case_risk_items_risk_type ON case_risk_items(risk_type);
CREATE INDEX IF NOT EXISTS idx_case_risk_items_primary ON case_risk_items(case_id) WHERE is_primary = true;

-- ============================================================================
-- 5. valuation_snapshots — Lightstone / provider API responses
-- ============================================================================

CREATE TABLE IF NOT EXISTS valuation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  risk_item_id UUID REFERENCES case_risk_items(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'lightstone',
  provider_request_id TEXT,
  request_payload JSONB DEFAULT '{}',
  response_payload JSONB NOT NULL DEFAULT '{}',
  retail_value DECIMAL(12,2),                 -- Motor: retail. Property: replacement cost.
  trade_value DECIMAL(12,2),                  -- Motor: trade. Property: municipal value.
  market_value DECIMAL(12,2),                 -- Market value where applicable.
  decode_data JSONB,                          -- Decoded make/model/year/specs for motor
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_case_id ON valuation_snapshots(case_id);
CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_risk_item_id ON valuation_snapshots(risk_item_id);
CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_org_id ON valuation_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_fetched_at ON valuation_snapshots(fetched_at DESC);

-- ============================================================================
-- 6. client_rules — per-client rule engine (write-off %, settlement, parts, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,                     -- write_off_threshold_pct, settlement_basis, etc.
  rule_value JSONB NOT NULL,                  -- e.g. {"value": 30}, {"value": "retail"}
  description TEXT,                           -- Human-readable description for UI
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, rule_key)
);

CREATE INDEX IF NOT EXISTS idx_client_rules_client_id ON client_rules(client_id);
CREATE INDEX IF NOT EXISTS idx_client_rules_org_id ON client_rules(org_id);

-- ============================================================================
-- 7. transactions — Report Pack checkout (Stripe)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  export_id UUID REFERENCES exports(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL,              -- report_pack_base, valuation_enrichment, transcript_enrichment
  amount DECIMAL(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ZAR',
  status TEXT NOT NULL DEFAULT 'pending',      -- pending, completed, failed, refunded
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  meta JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON transactions(org_id);
CREATE INDEX IF NOT EXISTS idx_transactions_case_id ON transactions(case_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_session ON transactions(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id);

-- ============================================================================
-- 8. EXTEND cases — risk item link, repair estimate, write-off status
-- ============================================================================

ALTER TABLE cases ADD COLUMN IF NOT EXISTS primary_risk_item_id UUID;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS repair_estimate_amount DECIMAL(12,2);
ALTER TABLE cases ADD COLUMN IF NOT EXISTS write_off_status TEXT;
-- write_off_status: null | economic | structural_code_3 | structural_code_3a | structural_code_4 | repairer_declined

-- FK constraint added separately (case_risk_items must exist first)
-- We use DO block to avoid error if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'cases_primary_risk_item_id_fkey'
  ) THEN
    ALTER TABLE cases
      ADD CONSTRAINT cases_primary_risk_item_id_fkey
      FOREIGN KEY (primary_risk_item_id) REFERENCES case_risk_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- 9. TRIGGERS for updated_at on new tables
-- ============================================================================

DROP TRIGGER IF EXISTS update_intake_documents_updated_at ON intake_documents;
CREATE TRIGGER update_intake_documents_updated_at BEFORE UPDATE ON intake_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_case_risk_items_updated_at ON case_risk_items;
CREATE TRIGGER update_case_risk_items_updated_at BEFORE UPDATE ON case_risk_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_client_rules_updated_at ON client_rules;
CREATE TRIGGER update_client_rules_updated_at BEFORE UPDATE ON client_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Note: extracted_fields, valuation_snapshots, transactions are append-only (no updated_at trigger needed)
