
-- ============================================================
-- 1) PRIVILEGE_ESCALATION: restrict who can insert/update/delete super_admin role
-- ============================================================
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Admins can insert roles (no super_admin escalation)"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'super_admin'::app_role
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Admins can update roles (no super_admin escalation)"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'super_admin'::app_role
  )
  OR is_super_admin(auth.uid())
)
WITH CHECK (
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'super_admin'::app_role
  )
  OR is_super_admin(auth.uid())
);

CREATE POLICY "Admins can delete roles (no super_admin removal)"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'super_admin'::app_role
  )
  OR is_super_admin(auth.uid())
);

-- ============================================================
-- 2) EXPOSED_SENSITIVE_DATA: restrict user_roles SELECT
--    - Users can see their own role
--    - Admins/super_admins can see all (needed by users management UI)
-- ============================================================
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view own role or admins all"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_super_admin(auth.uid())
);

-- ============================================================
-- 3) CROSS_ORG_DATA_LEAKAGE: org-scope SELECT on multi-tenant tables
-- ============================================================

-- categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON public.categories;
CREATE POLICY "Users can view org categories"
ON public.categories
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR is_same_organization(organization_id)
);

-- sectors
DROP POLICY IF EXISTS "Authenticated users can view sectors" ON public.sectors;
CREATE POLICY "Users can view org sectors"
ON public.sectors
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR is_same_organization(organization_id)
);

-- projects
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
CREATE POLICY "Users can view org projects"
ON public.projects
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR is_same_organization(organization_id)
);

-- patrimonio
DROP POLICY IF EXISTS "Authenticated users can view patrimonio" ON public.patrimonio;
CREATE POLICY "Users can view org patrimonio"
ON public.patrimonio
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR is_same_organization(organization_id)
);

-- performance_goals
DROP POLICY IF EXISTS "Authenticated can view goals" ON public.performance_goals;
CREATE POLICY "Users can view org goals"
ON public.performance_goals
FOR SELECT
TO authenticated
USING (
  is_super_admin(auth.uid())
  OR organization_id IS NULL
  OR is_same_organization(organization_id)
);
