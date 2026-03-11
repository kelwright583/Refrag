-- Migration 005: Notification rules, calendar blocks, AI processing log, filing indexes
-- Run after 004_rls.sql

-- ============================================================================
-- 1. NOTIFICATION RULES (org-level status-change notification config)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  from_status TEXT,          -- null means "any"
  to_status TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  auto_send BOOLEAN DEFAULT false,  -- true = send without prompt, false = show confirmation
  template_id UUID REFERENCES comms_templates(id) ON DELETE SET NULL,
  default_recipients JSONB NOT NULL DEFAULT '["client","broker"]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, from_status, to_status)
);

CREATE INDEX IF NOT EXISTS idx_notification_rules_org ON notification_rules(org_id);

-- ============================================================================
-- 2. CASE NOTIFICATION OVERRIDES (per-case override of org rules)
-- ============================================================================

CREATE TABLE IF NOT EXISTS case_notification_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  use_org_defaults BOOLEAN DEFAULT true,
  overrides JSONB DEFAULT '{}',  -- keyed by "fromStatus->toStatus" e.g. {"reporting->submitted": {"enabled": false}}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id)
);

-- ============================================================================
-- 3. CALENDAR BLOCKS (personal/admin time blocks not tied to a case)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL DEFAULT 'personal',  -- 'personal', 'travel', 'admin', 'leave', 'other'
  title TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT,  -- iCal RRULE format
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_blocks_org_user ON calendar_blocks(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_starts ON calendar_blocks(starts_at);
CREATE INDEX IF NOT EXISTS idx_calendar_blocks_ends ON calendar_blocks(ends_at);

-- ============================================================================
-- 4. AI PROCESSING LOG (audit every AI call for POPIA compliance)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  case_id UUID REFERENCES cases(id) ON DELETE SET NULL,
  evidence_id UUID REFERENCES evidence(id) ON DELETE SET NULL,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  operation TEXT NOT NULL,    -- 'classify_evidence', 'check_report', 'extract_field', 'damage_severity'
  input_summary TEXT,         -- non-PII description of what was sent
  output_summary TEXT,        -- non-PII description of result
  model TEXT,                 -- 'gpt-4o', etc.
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_processing_log_org ON ai_processing_log(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_log_case ON ai_processing_log(case_id);
CREATE INDEX IF NOT EXISTS idx_ai_processing_log_created ON ai_processing_log(created_at);

-- ============================================================================
-- 5. EXTEND evidence — AI classification fields
-- ============================================================================

ALTER TABLE evidence ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE evidence ADD COLUMN IF NOT EXISTS ai_category TEXT;

-- ============================================================================
-- 6. FILING INDEXES (case filtering and search performance)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cases_client_id ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_org_status_created ON cases(org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_org_created ON cases(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_insurer_reference ON cases(insurer_reference);

-- Full-text search vector (generated column)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cases' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE cases ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(case_number, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(client_name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(claim_reference, '') || ' ' || coalesce(insurer_reference, '') || ' ' || coalesce(insurer_name, '') || ' ' || coalesce(broker_name, '') || ' ' || coalesce(location, '')), 'B')
      ) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cases_search ON cases USING GIN(search_vector);
