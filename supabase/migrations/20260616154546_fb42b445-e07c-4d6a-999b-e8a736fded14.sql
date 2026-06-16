CREATE OR REPLACE FUNCTION public.is_same_organization(_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.organization_id = _organization_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_organizations uo_caller
    WHERE uo_caller.user_id = auth.uid()
      AND uo_caller.organization_id = _organization_id
  );
$function$;

-- Allow viewing profile of any user who shares an organization membership with the caller,
-- regardless of which org is currently active on their profile.
DROP POLICY IF EXISTS "Users view own or same-org profiles" ON public.profiles;
CREATE POLICY "Users view own or same-org profiles"
ON public.profiles
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR (organization_id IS NOT NULL AND public.is_same_organization(organization_id))
  OR EXISTS (
    SELECT 1
    FROM public.user_organizations uo_target
    JOIN public.user_organizations uo_caller
      ON uo_caller.organization_id = uo_target.organization_id
    WHERE uo_target.user_id = profiles.user_id
      AND uo_caller.user_id = auth.uid()
  )
);