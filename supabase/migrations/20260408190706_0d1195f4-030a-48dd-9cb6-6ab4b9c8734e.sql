CREATE OR REPLACE FUNCTION public.is_same_organization(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.organization_id = _organization_id
  );
$$;

DROP POLICY IF EXISTS "Users can view own tickets or admins all" ON public.tickets;
CREATE POLICY "Users can view organization open tickets and own tickets"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_same_organization(organization_id)
  )
  OR (
    (public.has_role(auth.uid(), 'tecnico'::public.app_role) OR public.has_role(auth.uid(), 'desenvolvedor'::public.app_role))
    AND public.is_same_organization(organization_id)
    AND (
      assigned_to = auth.uid()
      OR status IN ('Aberto', 'Disponível')
    )
  )
);

DROP POLICY IF EXISTS "Admins and technicians can update tickets" ON public.tickets;
CREATE POLICY "Admins and technicians can update organization tickets"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_same_organization(organization_id)
  )
  OR (
    (public.has_role(auth.uid(), 'tecnico'::public.app_role) OR public.has_role(auth.uid(), 'desenvolvedor'::public.app_role))
    AND public.is_same_organization(organization_id)
    AND (
      assigned_to = auth.uid()
      OR status IN ('Aberto', 'Disponível')
    )
  )
)
WITH CHECK (
  public.is_super_admin(auth.uid())
  OR created_by = auth.uid()
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_same_organization(organization_id)
  )
  OR (
    (public.has_role(auth.uid(), 'tecnico'::public.app_role) OR public.has_role(auth.uid(), 'desenvolvedor'::public.app_role))
    AND public.is_same_organization(organization_id)
    AND assigned_to = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;
CREATE POLICY "Admins can delete organization tickets"
ON public.tickets
FOR DELETE
TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_same_organization(organization_id)
  )
);

DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
CREATE POLICY "Authenticated users can create tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    public.is_super_admin(auth.uid())
    OR public.is_same_organization(organization_id)
    OR organization_id IS NULL
  )
);