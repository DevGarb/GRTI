
CREATE OR REPLACE FUNCTION public.get_org_technicians()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.user_id, p.full_name, p.email, p.avatar_url
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role IN ('tecnico'::app_role, 'desenvolvedor'::app_role)
    AND (
      public.is_super_admin(auth.uid())
      OR p.organization_id = (
        SELECT organization_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_org_technicians() TO authenticated;
