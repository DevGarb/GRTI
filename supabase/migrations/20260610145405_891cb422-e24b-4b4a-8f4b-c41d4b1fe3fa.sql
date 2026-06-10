DROP POLICY IF EXISTS "Admins can update project_tasks" ON public.project_tasks;
CREATE POLICY "Org members can update project_tasks"
ON public.project_tasks
FOR UPDATE
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR organization_id IS NULL
  OR is_member_of_org(organization_id)
)
WITH CHECK (
  is_super_admin(auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR organization_id IS NULL
  OR is_member_of_org(organization_id)
);