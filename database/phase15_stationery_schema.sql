-- Phase 15: Org Stationery & Branding
-- Adds stationery settings to organisations for document branding

ALTER TABLE organisations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS primary_colour TEXT DEFAULT '#C9663D';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS accent_colour TEXT DEFAULT '#1A1A2E';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS text_colour TEXT DEFAULT '#1A1A2E';
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS footer_disclaimer TEXT;
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS stationery_updated_at TIMESTAMPTZ;

-- Create org-assets storage bucket for logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'org-assets',
  'org-assets',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for org-assets (org-scoped)
DROP POLICY IF EXISTS "org_assets_insert" ON storage.objects;
CREATE POLICY "org_assets_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = (storage.foldername(name))[2]::uuid
        AND org_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org_assets_select" ON storage.objects;
CREATE POLICY "org_assets_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'org-assets');

DROP POLICY IF EXISTS "org_assets_update" ON storage.objects;
CREATE POLICY "org_assets_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = (storage.foldername(name))[2]::uuid
        AND org_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "org_assets_delete" ON storage.objects;
CREATE POLICY "org_assets_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'org-assets'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = (storage.foldername(name))[2]::uuid
        AND org_members.user_id = auth.uid()
    )
  );
