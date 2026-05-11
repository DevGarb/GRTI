
-- 1. Create user_organization_roles table
CREATE TABLE IF NOT EXISTS public.user_organization_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);

CREATE INDEX IF NOT EXISTS idx_uor_user ON public.user_organization_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_uor_user_org ON public.user_organization_roles(user_id, organization_id);

ALTER TABLE public.user_organization_roles ENABLE ROW LEVEL SECURITY;

-- 2. Migrate existing data (skip super_admin — stays global in user_roles)
INSERT INTO public.user_organization_roles (user_id, organization_id, role)
SELECT DISTINCT ur.user_id, uo.organization_id, ur.role
FROM public.user_roles ur
JOIN public.user_organizations uo ON uo.user_id = ur.user_id
WHERE ur.role <> 'super_admin'::app_role
ON CONFLICT DO NOTHING;

-- 3. New helper: has_role_in_org
CREATE OR REPLACE FUNCTION public.has_role_in_org(_user_id uuid, _role app_role, _org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1 FROM public.user_organization_roles
      WHERE user_id = _user_id AND organization_id = _org
        AND (role = _role OR role = 'super_admin'::app_role)
    );
$$;

-- 4. Helper: current org role (uses profile.organization_id as active org)
CREATE OR REPLACE FUNCTION public.current_org_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.user_organization_roles uor
      ON uor.user_id = p.user_id
     AND uor.organization_id = p.organization_id
    WHERE p.user_id = _user_id
      AND uor.role = _role
  );
$$;

-- 5. Rewrite has_role to use active org + super_admin global
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR public.current_org_role(_user_id, _role);
$$;

-- 6. Rewrite is_op_staff to check role in the specific org
CREATE OR REPLACE FUNCTION public.is_op_staff(_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(auth.uid())
    OR (
      public.is_member_of_org(_org)
      AND EXISTS (
        SELECT 1 FROM public.user_organization_roles uor
        WHERE uor.user_id = auth.uid()
          AND uor.organization_id = _org
          AND uor.role IN ('admin'::app_role,'tecnico'::app_role,'desenvolvedor'::app_role)
      )
    );
$$;

-- 7. Rewrite is_staff_user (active org)
CREATE OR REPLACE FUNCTION public.is_staff_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_super_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.user_organization_roles uor
        ON uor.user_id = p.user_id
       AND uor.organization_id = p.organization_id
      WHERE p.user_id = _user_id
        AND uor.role IN ('admin'::app_role,'tecnico'::app_role,'desenvolvedor'::app_role)
    );
$$;

-- 8. RLS policies for user_organization_roles
CREATE POLICY "View own org roles or admins"
ON public.user_organization_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_same_organization(organization_id))
);

CREATE POLICY "Admins insert org roles (no super_admin)"
ON public.user_organization_roles
FOR INSERT TO authenticated
WITH CHECK (
  role <> 'super_admin'::app_role
  AND (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_same_organization(organization_id))
  )
);

CREATE POLICY "Admins update org roles (no super_admin)"
ON public.user_organization_roles
FOR UPDATE TO authenticated
USING (
  role <> 'super_admin'::app_role
  AND (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_same_organization(organization_id))
  )
)
WITH CHECK (
  role <> 'super_admin'::app_role
  AND (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_same_organization(organization_id))
  )
);

CREATE POLICY "Admins delete org roles (no super_admin)"
ON public.user_organization_roles
FOR DELETE TO authenticated
USING (
  role <> 'super_admin'::app_role
  AND (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'admin'::app_role) AND public.is_same_organization(organization_id))
  )
);

-- 9. Update handle_new_user to also insert into user_organization_roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Default solicitante role in each linked org
  INSERT INTO public.user_organization_roles (user_id, organization_id, role)
  SELECT NEW.id, o.id, 'solicitante'::app_role FROM public.organizations o
  WHERE o.slug IN ('grupo-ramos', 'cgps-operacional')
  ON CONFLICT (user_id, organization_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;
