-- Backfill: ensure every existing user is linked to BOTH organizations
INSERT INTO public.user_organizations (user_id, organization_id)
SELECT p.user_id, o.id
FROM public.profiles p
CROSS JOIN public.organizations o
WHERE o.slug IN ('grupo-ramos', 'cgps-operacional')
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Update handle_new_user to also auto-link new users to both orgs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'solicitante');

  -- Auto-link new user to all current organizations
  INSERT INTO public.user_organizations (user_id, organization_id)
  SELECT NEW.id, o.id FROM public.organizations o
  WHERE o.slug IN ('grupo-ramos', 'cgps-operacional')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  RETURN NEW;
END;
$function$;