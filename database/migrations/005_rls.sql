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
-- notification_rules — org_id tenant isolation
-- ============================================================================

CREATE POLICY notification_rules_select ON notification_rules FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY notification_rules_insert ON notification_rules FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY notification_rules_update ON notification_rules FOR UPDATE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY notification_rules_delete ON notification_rules FOR DELETE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);

-- ============================================================================
-- case_notification_overrides — org_id tenant isolation
-- ============================================================================

CREATE POLICY case_notification_overrides_select ON case_notification_overrides FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY case_notification_overrides_insert ON case_notification_overrides FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY case_notification_overrides_update ON case_notification_overrides FOR UPDATE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY case_notification_overrides_delete ON case_notification_overrides FOR DELETE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);

-- ============================================================================
-- calendar_blocks — org_id tenant isolation
-- ============================================================================

CREATE POLICY calendar_blocks_select ON calendar_blocks FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY calendar_blocks_insert ON calendar_blocks FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY calendar_blocks_update ON calendar_blocks FOR UPDATE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY calendar_blocks_delete ON calendar_blocks FOR DELETE USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);

-- ============================================================================
-- ai_processing_log — org_id tenant isolation (read-only for most, insert for server)
-- ============================================================================

CREATE POLICY ai_processing_log_select ON ai_processing_log FOR SELECT USING (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
CREATE POLICY ai_processing_log_insert ON ai_processing_log FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())
);
