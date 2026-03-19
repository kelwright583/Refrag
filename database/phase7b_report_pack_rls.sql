-- ============================================================================
-- PHASE 7B: REPORT PACK — RLS POLICIES
-- Run AFTER phase7b_report_pack_schema.sql
-- ============================================================================

ALTER TABLE report_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_pack_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "report_packs_select" ON report_packs;
CREATE POLICY "report_packs_select" ON report_packs
  FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "report_packs_insert" ON report_packs;
CREATE POLICY "report_packs_insert" ON report_packs
  FOR INSERT WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "report_packs_update" ON report_packs;
CREATE POLICY "report_packs_update" ON report_packs
  FOR UPDATE USING (is_org_member(org_id));

DROP POLICY IF EXISTS "report_packs_delete" ON report_packs;
CREATE POLICY "report_packs_delete" ON report_packs
  FOR DELETE USING (is_org_member(org_id));

DROP POLICY IF EXISTS "report_pack_items_select" ON report_pack_items;
CREATE POLICY "report_pack_items_select" ON report_pack_items
  FOR SELECT USING (is_org_member(org_id));

DROP POLICY IF EXISTS "report_pack_items_insert" ON report_pack_items;
CREATE POLICY "report_pack_items_insert" ON report_pack_items
  FOR INSERT WITH CHECK (is_org_member(org_id));

DROP POLICY IF EXISTS "report_pack_items_update" ON report_pack_items;
CREATE POLICY "report_pack_items_update" ON report_pack_items
  FOR UPDATE USING (is_org_member(org_id));

DROP POLICY IF EXISTS "report_pack_items_delete" ON report_pack_items;
CREATE POLICY "report_pack_items_delete" ON report_pack_items
  FOR DELETE USING (is_org_member(org_id));

-- Staff access for report packs
DROP POLICY IF EXISTS "report_packs_staff_select" ON report_packs;
CREATE POLICY "report_packs_staff_select" ON report_packs
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "report_pack_items_staff_select" ON report_pack_items;
CREATE POLICY "report_pack_items_staff_select" ON report_pack_items
  FOR SELECT USING (is_staff());
