
-- Assign super_admin role to danilosouza4040@gmail.com
-- First remove old admin role, then add super_admin
DELETE FROM public.user_roles 
WHERE user_id = '4e315238-c720-4040-8d15-d3dc02e75314' AND role = 'admin';

INSERT INTO public.user_roles (user_id, role) 
VALUES ('4e315238-c720-4040-8d15-d3dc02e75314', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create function to check if user is super_admin (undeletable)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Protect super_admin roles from being deleted
CREATE OR REPLACE FUNCTION public.protect_super_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin role cannot be removed';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_super_admin_role_trigger
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin_role();

-- Protect super_admin profile from deletion
CREATE OR REPLACE FUNCTION public.protect_super_admin_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_super_admin(OLD.user_id) THEN
    RAISE EXCEPTION 'Super admin profile cannot be deleted';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER protect_super_admin_profile_trigger
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_super_admin_profile();
