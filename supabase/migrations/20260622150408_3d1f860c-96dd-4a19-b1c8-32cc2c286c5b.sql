
DROP POLICY IF EXISTS "Attachments insert scoped to ticket org" ON storage.objects;
DROP POLICY IF EXISTS "Attachments read scoped to ticket org" ON storage.objects;

CREATE POLICY "Attachments insert scoped to ticket org"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM tickets t
      WHERE split_part(objects.name, '/', 1) IN ('tickets','comments')
        AND split_part(objects.name, '/', 2)::uuid = t.id
        AND (
          t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
          OR ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role)) AND is_same_organization(t.organization_id))
        )
    )
  )
);

CREATE POLICY "Attachments read scoped to ticket org"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM tickets t
      WHERE split_part(objects.name, '/', 1) IN ('tickets','comments')
        AND split_part(objects.name, '/', 2)::uuid = t.id
        AND (
          t.created_by = auth.uid()
          OR t.assigned_to = auth.uid()
          OR ((has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'tecnico'::app_role) OR has_role(auth.uid(),'desenvolvedor'::app_role)) AND is_same_organization(t.organization_id))
        )
    )
  )
);
