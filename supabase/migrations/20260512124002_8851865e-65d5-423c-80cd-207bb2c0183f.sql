-- Remove all global 'solicitante' role assignments (role only makes sense per organization)
DELETE FROM public.user_roles WHERE role = 'solicitante';

-- Update handle_new_user to no longer insert a global 'solicitante' role
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

  -- Auto-link new user to all current organizations
  INSERT INTO public.user_organizations (user_id, organization_id)
  SELECT NEW.id, o.id FROM public.organizations o
  WHERE o.slug IN ('grupo-ramos', 'cgps-operacional')
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  -- Default 'solicitante' role per organization (no global role)
  INSERT INTO public.user_organization_roles (user_id, organization_id, role)
  SELECT NEW.id, o.id, 'solicitante'::app_role FROM public.organizations o
  WHERE o.slug IN ('grupo-ramos', 'cgps-operacional')
  ON CONFLICT (user_id, organization_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;