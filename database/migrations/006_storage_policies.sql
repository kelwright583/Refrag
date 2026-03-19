-- ============================================================================
-- 006: Supabase Storage bucket + RLS policies for evidence uploads
-- ============================================================================

-- Create the evidence bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidence',
  'evidence',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- Storage RLS policies
-- Paths follow: org/{org_id}/case/{case_id}/{filename}
-- We check that the user belongs to the org embedded in the path.
-- ============================================================================

-- Allow authenticated users to upload to their org's folder
DROP POLICY IF EXISTS "evidence_storage_insert" ON storage.objects;
CREATE POLICY "evidence_storage_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = (storage.foldername(name))[2]::uuid
        AND org_members.user_id = auth.uid()
    )
  );

-- Allow authenticated users to read from their org's folder
DROP POLICY IF EXISTS "evidence_storage_select" ON storage.objects;
CREATE POLICY "evidence_storage_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = (storage.foldername(name))[2]::uuid
        AND org_members.user_id = auth.uid()
    )
  );

-- Allow authenticated users to update files in their org's folder
DROP POLICY IF EXISTS "evidence_storage_update" ON storage.objects;
CREATE POLICY "evidence_storage_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = (storage.foldername(name))[2]::uuid
        AND org_members.user_id = auth.uid()
    )
  );

-- Allow authenticated users to delete from their org's folder
DROP POLICY IF EXISTS "evidence_storage_delete" ON storage.objects;
CREATE POLICY "evidence_storage_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'evidence'
    AND (storage.foldername(name))[1] = 'org'
    AND EXISTS (
      SELECT 1 FROM org_members
      WHERE org_members.org_id = (storage.foldername(name))[2]::uuid
        AND org_members.user_id = auth.uid()
    )
  );

-- Staff can read all evidence for support purposes
DROP POLICY IF EXISTS "evidence_storage_staff_select" ON storage.objects;
CREATE POLICY "evidence_storage_staff_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'evidence'
    AND EXISTS (SELECT 1 FROM staff_users WHERE user_id = auth.uid() AND is_active = true)
  );
