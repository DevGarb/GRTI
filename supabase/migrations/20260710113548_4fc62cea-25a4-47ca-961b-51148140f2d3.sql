
-- Storage policies para checklist-photos
-- Path pattern: {organization_id}/{execution_id}/{filename}

CREATE POLICY "chk_photos_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'checklist-photos' AND (
    public.is_super_admin(auth.uid())
    OR public.is_same_organization((storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "chk_photos_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'checklist-photos' AND (
    public.is_super_admin(auth.uid())
    OR public.is_same_organization((storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "chk_photos_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'checklist-photos' AND (
    public.is_super_admin(auth.uid())
    OR public.is_same_organization((storage.foldername(name))[1]::uuid)
  )
);

CREATE POLICY "chk_photos_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'checklist-photos' AND (
    public.is_super_admin(auth.uid())
    OR public.has_role_in_org(auth.uid(),'admin'::app_role, (storage.foldername(name))[1]::uuid)
  )
);
