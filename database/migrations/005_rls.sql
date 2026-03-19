-- RLS for tables from migration 005.
-- Run after 005_notifications_calendar_ai_filing.sql

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_notification_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_processing_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- notification_rules — org_id tenant isolation + staff access
-- ============================================================================

DROP POLICY IF EXISTS notification_rules_select ON notification_rules;
CREATE POLICY notification_rules_select ON notification_rules FOR SELECT USING (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS notification_rules_insert ON notification_rules;
CREATE POLICY notification_rules_insert ON notification_rules FOR INSERT WITH CHECK (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS notification_rules_update ON notification_rules;
CREATE POLICY notification_rules_update ON notification_rules FOR UPDATE USING (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS notification_rules_delete ON notification_rules;
CREATE POLICY notification_rules_delete ON notification_rules FOR DELETE USING (
  is_org_member(org_id) OR is_staff()
);

-- ============================================================================
-- case_notification_overrides — org_id tenant isolation + staff access
-- ============================================================================

DROP POLICY IF EXISTS case_notification_overrides_select ON case_notification_overrides;
CREATE POLICY case_notification_overrides_select ON case_notification_overrides FOR SELECT USING (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS case_notification_overrides_insert ON case_notification_overrides;
CREATE POLICY case_notification_overrides_insert ON case_notification_overrides FOR INSERT WITH CHECK (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS case_notification_overrides_update ON case_notification_overrides;
CREATE POLICY case_notification_overrides_update ON case_notification_overrides FOR UPDATE USING (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS case_notification_overrides_delete ON case_notification_overrides;
CREATE POLICY case_notification_overrides_delete ON case_notification_overrides FOR DELETE USING (
  is_org_member(org_id) OR is_staff()
);

-- ============================================================================
-- calendar_blocks — org_id tenant isolation + staff access
-- ============================================================================

DROP POLICY IF EXISTS calendar_blocks_select ON calendar_blocks;
CREATE POLICY calendar_blocks_select ON calendar_blocks FOR SELECT USING (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS calendar_blocks_insert ON calendar_blocks;
CREATE POLICY calendar_blocks_insert ON calendar_blocks FOR INSERT WITH CHECK (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS calendar_blocks_update ON calendar_blocks;
CREATE POLICY calendar_blocks_update ON calendar_blocks FOR UPDATE USING (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS calendar_blocks_delete ON calendar_blocks;
CREATE POLICY calendar_blocks_delete ON calendar_blocks FOR DELETE USING (
  is_org_member(org_id) OR is_staff()
);

-- ============================================================================
-- ai_processing_log — org_id tenant isolation + staff access (read-only for most, insert for server)
-- ============================================================================

DROP POLICY IF EXISTS ai_processing_log_select ON ai_processing_log;
CREATE POLICY ai_processing_log_select ON ai_processing_log FOR SELECT USING (
  is_org_member(org_id) OR is_staff()
);
DROP POLICY IF EXISTS ai_processing_log_insert ON ai_processing_log;
CREATE POLICY ai_processing_log_insert ON ai_processing_log FOR INSERT WITH CHECK (
  is_org_member(org_id) OR is_staff()
);
