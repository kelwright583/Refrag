-- ============================================================================
-- PHASE 7B: REPORT PACK — Schema Migration
-- Run AFTER phase7_assessment_schema.sql
-- ============================================================================

-- Enum for report pack status
CREATE TYPE report_pack_status AS ENUM (
  'draft',
  'ready',
  'sent'
);

-- Enum for report pack item types
CREATE TYPE report_pack_item_type AS ENUM (
  'assessment_report',
  'mm_codes',
  'parts_quote',
  'labour_quote',
  'photos'
);

-- report_packs — bundle of assessment report + supporting documents
CREATE TABLE report_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  assessment_id UUID NOT NULL REFERENCES motor_assessments(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  status report_pack_status NOT NULL DEFAULT 'draft',
  title TEXT,
  sent_at TIMESTAMPTZ,
  sent_to TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- report_pack_items — individual documents in the pack
CREATE TABLE report_pack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES report_packs(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  item_type report_pack_item_type NOT NULL,
  assessment_document_id UUID REFERENCES assessment_documents(id) ON DELETE SET NULL,
  evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,

  included BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_report_packs_case_id ON report_packs(case_id);
CREATE INDEX idx_report_packs_assessment_id ON report_packs(assessment_id);
CREATE INDEX idx_report_packs_org_id ON report_packs(org_id);
CREATE INDEX idx_report_packs_status ON report_packs(status);

CREATE INDEX idx_report_pack_items_pack_id ON report_pack_items(pack_id);
CREATE INDEX idx_report_pack_items_org_id ON report_pack_items(org_id);
CREATE INDEX idx_report_pack_items_order ON report_pack_items(pack_id, order_index);

-- Triggers
CREATE TRIGGER update_report_packs_updated_at
  BEFORE UPDATE ON report_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_pack_items_updated_at
  BEFORE UPDATE ON report_pack_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
